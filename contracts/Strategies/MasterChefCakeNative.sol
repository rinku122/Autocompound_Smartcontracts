// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MasterChefStrategy.sol";

contract MasterChefCakeNative is MasterChefStrategy {
    IERC20 private token0;
    IERC20 private token1;
    IPair public depositToken;

    constructor(
        address _WETH,
        address _depositToken,
        address _rewardToken,
        address _masterChefContract,
        address _router,
        uint256 _pid,
        address _ops,
        address _treasury
    ) {
        ops = _ops;
        treasury = _treasury;
        WETH = _WETH;
        depositToken = IPair(_depositToken);
        rewardToken = IERC20(_rewardToken);
        stakingContract = IMasterChef(_masterChefContract);
        router = IRouter(_router);

        PID = _pid;

        address _token0 = IPair(_depositToken).token0();
        address _token1 = IPair(_depositToken).token1();

        address tokenA = _token0 != WETH ? _token0 : _token1; //cake
        address tokenB = _token1 == WETH ? _token1 : _token0; //WETH

        token0 = IERC20(tokenA);
        token1 = IERC20(tokenB);

        name = string(
            abi.encodePacked(
                "Autocompound: ",
                depositToken.symbol(),
                " ",
                IERC20(_token0).symbol(),
                "-",
                IERC20(_token1).symbol()
            )
        );

        setAllowances();
        emit Reinvest(0, 0);
    }

    /**
     * @notice Deposit tokens to receive receipt tokens
     * @param amount0 Amount of tokens1 to deposit
     */

    function dualTokenDeposit(uint256 amount0, uint256 slippage)
        external
        payable
        nonReentrant
    {
        require(
            amount0 > 0 && msg.value > 0,
            "MasterChefCakeNative::dualTokenDeposit: Can not deposit zero amount"
        );
        require(
            slippage >= 1 && slippage < 500,
            "MasterChefCakeNative::dualTokenDeposit: Invalid slippage"
        );

        TransferHelper.safeTransferFrom(
            address(token0),
            msg.sender,
            address(this),
            amount0
        );

        _dualTokenDeposit(amount0, msg.value, slippage);
    }

    /**
     * @notice Deposit tokens to receive receipt tokens
     * @param amount Amount of tokens to deposit
     * @param _token address of token
     */

    function singleTokenDeposit(
        uint256 amount,
        address _token,
        uint256 slippage
    ) external payable nonReentrant {
        require(
            slippage >= 1 && slippage < 500,
            "MasterChefCakeNative::singleTokenDeposit: Invalid slippage"
        );
        require(
            _token == address(token0) || _token == address(token1),
            "MasterChefCakeNative::singleTokenDeposit: Invalid token address"
        );
        if (_token == address(token1)) {
            require(
                msg.value > 0,
                "MasterChefCakeNative::singleTokenDeposit: Insufficient investment"
            );
            amount = msg.value;
        } else {
            require(
                amount > 0,
                "MasterChefCakeNative::singleTokenDeposit: Insufficient tokens to deposit"
            );

            TransferHelper.safeTransferFrom(
                address(token0),
                msg.sender,
                address(this),
                amount
            );
        }

        uint256 amountIn = amount / 2;

        address[] memory path0 = new address[](2);
        path0[0] = _token;
        path0[1] = path0[0] == address(token0)
            ? address(token1)
            : address(token0);

        uint256[] memory amountsOutToken0 = router.getAmountsOut(
            amountIn,
            path0
        );

        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];

        if (_token == address(token0)) {
            router.swapExactTokensForETH(
                amountIn,
                amountOutToken0,
                path0,
                address(this),
                block.timestamp + 1800
            );
            _dualTokenDeposit(amountIn, amountOutToken0, slippage);
        } else {
            router.swapExactETHForTokens{value: amountIn}(
                amountOutToken0,
                path0,
                address(this),
                block.timestamp + 1800
            );
            _dualTokenDeposit(amountOutToken0, amountIn, slippage);
        }
    }

    /**
     * @notice Deposit tokens to receive receipt tokens
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external override nonReentrant {
        _deposit(amount, false);
    }

    /**
     * @notice Withdraw LP tokens by redeeming receipt tokens
     * @param amount Amount of receipt tokens to redeem
     */

    function withdraw(uint256 amount) external override nonReentrant {
        _withdraw(amount, false);
    }

    /**
     * @notice Estimate reinvest reward for caller
     * @return Estimated rewards tokens earned for calling `reinvest()`
     */
    function estimateReinvestReward() external view returns (uint256) {
        uint256 unclaimedRewards = checkReward();
        if (unclaimedRewards >= MIN_TOKENS_TO_REINVEST) {
            return (unclaimedRewards * REINVEST_REWARD_BIPS) / BIPS_DIVISOR;
        }
        return 0;
    }

    /**
     * @notice Reward token balance that can be reinvested
     * @dev Staking rewards accurue to contract on each deposit/withdrawal
     * @return Unclaimed rewards, plus contract balance
     */
    function checkReward() public view returns (uint256) {
        uint256 pendingReward = stakingContract.pendingCake(PID, address(this));
        uint256 contractBalance = rewardToken.balanceOf(address(this));
        return pendingReward + contractBalance;
    }

    /**
     * @notice Withdraw tokens by redeeming receipt tokens
     * @param amount Amount of LP to redeem in terms of tokens
     * @param _token Address of token
     */
    function singleWithdraw(uint256 amount, address _token)
        external
        payable
        nonReentrant
    {
        require(
            _token == address(token0) || _token == address(token1),
            "MasterChefCakeNative::singleWithdraw: Invalid token address"
        );
        uint256 depositTokenAmount = getDepositTokensForShares(amount);
        _withdraw(amount, true);

        (uint256 amountToken, uint256 amountETH) = router.removeLiquidityETH(
            address(token0),
            depositTokenAmount,
            0,
            0,
            address(this),
            block.timestamp + 1800
        );
        address[] memory path0 = new address[](2);

        uint256 amountIN;
        uint256 amountOUT;
        if (_token == address(token0)) {
            amountIN = amountETH;
            amountOUT = amountToken;
            path0[0] = address(token1);
            path0[1] = address(token0);
        } else {
            amountIN = amountToken;
            amountOUT = amountETH;
            path0[0] = address(token0);
            path0[1] = address(token1);
        }
        uint256[] memory amountsOutToken0 = router.getAmountsOut(
            amountIN,
            path0
        );
        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];
        if (_token == address(token0)) {
            router.swapExactETHForTokens{value: amountIN}(
                amountOutToken0,
                path0,
                address(this),
                block.timestamp + 1800
            );
            TransferHelper.safeTransfer(
                _token,
                msg.sender,
                amountOutToken0 + amountOUT
            );
        } else {
            router.swapExactTokensForETH(
                amountIN,
                amountOutToken0,
                path0,
                address(this),
                block.timestamp + 1800
            );
            TransferHelper.safeTransferETH(
                payable(msg.sender),
                amountOutToken0 + amountOUT
            );
        }
    }

    /**
     * @notice Withdraw tokens by redeeming receipt tokens
     * @param amount Amount of LP to redeem in terms of tokens
     */
    function dualWithdraw(uint256 amount) external nonReentrant {
        uint256 depositTokenAmount = getDepositTokensForShares(amount);
        _withdraw(amount, true);
        router.removeLiquidityETH(
            address(token0),
            depositTokenAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 1800
        );
    }

    /**
     * @notice Reinvest rewards from staking contract to deposit tokens
     * @dev This external function requires minimum tokens to be met
     */
    function reinvest() external onlyEOA nonReentrant {
        uint256 unclaimedRewards = checkReward();
        require(
            unclaimedRewards >= MIN_TOKENS_TO_REINVEST,
            "MasterChefCakeNative::reinvest: MIN_TOKENS_TO_REINVEST"
        );
        _reinvest(unclaimedRewards, msg.sender);
    }

    /**
     * @notice Reinvest rewards from staking contract to deposit tokens
     * @dev This external function requires minimum tokens to be met
     */
    function reinvestOps() external onlyOps nonReentrant {
        uint256 unclaimedRewards = checkReward();
        require(
            unclaimedRewards >= MIN_TOKENS_TO_REINVEST,
            "MasterChefCakeNative::reinvestOps: MIN_TOKENS_TO_REINVEST"
        );
        _reinvest(unclaimedRewards, treasury);
    }

    /**
     * @notice Approve tokens for use in Strategy
     * @dev Restricted to avoid griefing attacks
     */
    function setAllowances() public onlyOwner {
        TransferHelper.safeApprove(
            address(depositToken),
            address(stakingContract),
            UINT_MAX
        );
        TransferHelper.safeApprove(
            address(depositToken),
            address(router),
            UINT_MAX
        );
        TransferHelper.safeApprove(address(token0), address(router), UINT_MAX);
    }

    function _deposit(uint256 amount, bool check) internal {
        require(
            totalDeposits >= totalSupply,
            "MasterChefCakeNative::_deposit: deposit failed"
        );
        if (REQUIRE_REINVEST_BEFORE_DEPOSIT) {
            uint256 unclaimedRewards = checkReward();
            if (unclaimedRewards >= MIN_TOKENS_TO_REINVEST_BEFORE_DEPOSIT) {
                _reinvest(unclaimedRewards, msg.sender);
            }
        }
        if (!check) {
            TransferHelper.safeTransferFrom(
                address(depositToken),
                msg.sender,
                address(this),
                amount
            );
        }
        _stakeDepositTokens(amount);
        _mint(msg.sender, getSharesForDepositTokens(amount));
        totalDeposits += amount;
        emit Deposit(msg.sender, amount);
    }

    function _dualTokenDeposit(
        uint256 amount0,
        uint256 valueETH,
        uint256 slippage
    ) internal {
        uint256 amountAmin = (amount0 * slippage) / SLIPPAGE_DIVISOR;
        uint256 amountBmin = (valueETH * slippage) / SLIPPAGE_DIVISOR;
        (, , uint256 liquidity) = router.addLiquidityETH{value: valueETH}(
            address(token0),
            amount0,
            amountAmin,
            amountBmin,
            address(this),
            block.timestamp + 1800
        );
        _deposit(liquidity, true);
    }

    function _withdraw(uint256 amount, bool check) internal {
        uint256 depositTokenAmount = getDepositTokensForShares(amount);
        if (depositTokenAmount > 0) {
            _withdrawDepositTokens(depositTokenAmount);

            if (!check) {
                TransferHelper.safeTransfer(
                    address(depositToken),
                    msg.sender,
                    depositTokenAmount
                );
            }

            _burn(msg.sender, amount);
            totalDeposits -= depositTokenAmount;
            emit Withdraw(msg.sender, depositTokenAmount);
        } else {
            require(
                false,
                "MasterChefCakeNative::_withdraw: withdraw amount can,t be zero"
            );
        }
    }

    function _reinvest(uint256 amount, address recipient) internal {
        stakingContract.deposit(PID, 0);
        uint256 stakingFunds = (amount * ADMIN_FEE_BIPS) / BIPS_DIVISOR;
        if (stakingFunds > 0) {
            TransferHelper.safeTransfer(
                address(rewardToken),
                treasury,
                stakingFunds
            );
        }

        uint256 reinvestFee = (amount * REINVEST_REWARD_BIPS) / BIPS_DIVISOR;
        if (reinvestFee > 0) {
            TransferHelper.safeTransfer(
                address(rewardToken),
                recipient,
                reinvestFee
            );
        }

        uint256 lpTokenAmount = _convertRewardTokensToDepositTokens(
            amount - stakingFunds - reinvestFee
        );
        _stakeDepositTokens(lpTokenAmount);
        totalDeposits += lpTokenAmount;

        emit Reinvest(totalDeposits, totalSupply);
    }

    function _convertRewardTokensToDepositTokens(uint256 amount)
        internal
        returns (uint256)
    {
        uint256 amountIn = amount / 2;
        require(
            amountIn > 0,
            "MasterChefCakeNative::_convertRewardTokensToDepositTokens: amount too low"
        );

        // swap to recoverNativeAsset
        address[] memory path0 = new address[](2);
        path0[0] = address(rewardToken);
        path0[1] = WETH;

        uint256[] memory amountsOutToken0 = router.getAmountsOut(
            amountIn,
            path0
        );
        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];
        router.swapExactTokensForETH(
            amountIn,
            amountOutToken0,
            path0,
            address(this),
            block.timestamp + 1800
        );

        (, , uint256 liquidity) = router.addLiquidityETH{
            value: amountOutToken0
        }(
            address(token0),
            amountIn,
            0,
            0,
            address(this),
            block.timestamp + 1800
        );

        return liquidity;
    }
}
