// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./QuickSwapStrategy.sol";
import "../../interfaces/IPair.sol";
import "../../interfaces/IStakingDualRewards.sol";
import "../../interfaces/IDragonLiar.sol";

contract DualTokenRewardLPMinning is QuickSwapStrategy {
    IERC20 private token0;
    IERC20 private token1;
    address public collectible;
    IPair public depositToken;
    IStakingDualRewards public stakingDualRewards;
    IDragonLiar public dragonsliar;

    constructor(
        address _WETH,
        address _collectible,
        address _dragonsliar,
        address _depositToken,
        address _quick,
        address _stakingDualRewards,
        address _router,
        uint256 _autoCompoundTokenPerBlock,
        address _ops,
        address _treasury
    ) {
        WETH = _WETH;
        ops = _ops;
        collectible = _collectible;
        treasury = _treasury;
        dragonsliar = IDragonLiar(_dragonsliar);
        depositToken = IPair(_depositToken);
        quick = _quick;
        stakingDualRewards = IStakingDualRewards(_stakingDualRewards);
        router = IRouter(_router);

        autoCompoundTokenPerBlock = _autoCompoundTokenPerBlock;
        startBlock = block.number;
        lastRewardBlock = startBlock;

        address _token0 = IPair(_depositToken).token0();
        address _token1 = IPair(_depositToken).token1();

        token0 = IERC20(_token0);
        token1 = IERC20(_token1);

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
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external override nonReentrant {
        _deposit(amount, false);
    }

    /**
     * @notice Deposit tokens to receive receipt tokens
     * @param amount0 Amount of tokens0 to deposit
     * @param _token0 address of token0
     * @param amount1 Amount of tokens1 to deposit
     * @param _token1 address of token1
     */

    function dualTokenDeposit(
        uint256 amount0,
        address _token0,
        uint256 amount1,
        address _token1,
        uint256 slippage
    ) external nonReentrant {
        require(
            amount0 > 0 && amount1 > 0,
            "DualTokenRewardLPMinning::dualTokenDeposit: Can not deposit zero amount"
        );
        require(
            ((_token0 == address(token0)) &&
                (_token1 == address(token1)) &&
                (_token0 != _token1)),
            "DualTokenRewardLPMinning::dualTokenDeposit: Invalid token address"
        );
        require(
            slippage >= 1 && slippage < 500,
            "DualTokenRewardLPMinning::dualTokenDeposit: Invalid slippage"
        );

        uint256 amountAmin = (amount0 * slippage) / SLIPPAGE_DIVISOR;
        uint256 amountBmin = (amount1 * slippage) / SLIPPAGE_DIVISOR;
        _dualTokenDeposit(
            amount0,
            _token0,
            amountAmin,
            amount1,
            _token1,
            amountBmin,
            true
        );
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
    ) external nonReentrant {
        require(
            amount > 0,
            "DualTokenRewardLPMinning::singleTokenDeposit: Can not deposit zero amount"
        );
        require(
            slippage >= 1 && slippage < 500,
            "DualTokenRewardLPMinning::singleTokenDeposit: Invalid slippage"
        );
        require(
            _token == address(token0) || _token == address(token1),
            "DualTokenRewardLPMinning::singleTokenDeposit: Invalid token address"
        );

        TransferHelper.safeTransferFrom(
            _token,
            msg.sender,
            address(this),
            amount
        );
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
        router.swapExactTokensForTokens(
            amountIn,
            amountOutToken0,
            path0,
            address(this),
            block.timestamp + 1800
        );
        uint256 amountAmin = (amountIn * slippage) / SLIPPAGE_DIVISOR;
        uint256 amountBmin = (amountOutToken0 * slippage) / SLIPPAGE_DIVISOR;
        _dualTokenDeposit(
            amountIn,
            path0[0],
            amountAmin,
            amountOutToken0,
            path0[1],
            amountBmin,
            false
        );
    }

    /**
     * @notice Withdraw LP tokens by redeeming receipt tokens
     * @param amount Amount of receipt tokens to redeem
     */

    function withdraw(uint256 amount) external override nonReentrant {
        _withdraw(amount, false);
    }

    /**
     * @notice Withdraw tokens by redeeming receipt tokens
     * @param amount Amount of LP to redeem in terms of tokens
     * @param _token Address of token
     */
    function singleWithdraw(uint256 amount, address _token)
        external
        nonReentrant
    {
        require(
            _token == address(token0) || _token == address(token1),
            "DualTokenRewardLPMinning::singleWithdraw: Invalid token address"
        );
        uint256 depositTokenAmount = getDepositTokensForShares(amount);
        _withdraw(amount, true);

        (uint256 amount0, uint256 amount1) = router.removeLiquidity(
            address(token0),
            address(token1),
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
            amountIN = amount1;
            amountOUT = amount0;
            path0[0] = address(token1);
            path0[1] = address(token0);
        } else {
            amountIN = amount0;
            amountOUT = amount1;
            path0[0] = address(token0);
            path0[1] = address(token1);
        }
        uint256[] memory amountsOutToken0 = router.getAmountsOut(
            amountIN,
            path0
        );
        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];
        router.swapExactTokensForTokens(
            amountIN,
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
    }

    /**
     * @notice Withdraw tokens by redeeming receipt tokens
     * @param amount Amount of LP to redeem in terms of tokens
     */
    function dualWithdraw(uint256 amount) external nonReentrant {
        uint256 depositTokenAmount = getDepositTokensForShares(amount);
        _withdraw(amount, true);
        router.removeLiquidity(
            address(token0),
            address(token1),
            depositTokenAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 1800
        );
    }

    /**
     * @notice Approve tokens for use in Strategy
     * @dev Restricted to avoid griefing attacks
     */
    function setAllowances() public onlyOwner {
        TransferHelper.safeApprove(
            address(depositToken),
            address(stakingDualRewards),
            UINT_MAX
        );
        TransferHelper.safeApprove(
            address(depositToken),
            address(router),
            UINT_MAX
        );
        TransferHelper.safeApprove(quick, address(router), UINT_MAX);
        TransferHelper.safeApprove(WETH, address(router), UINT_MAX);
        TransferHelper.safeApprove(address(token0), address(router), UINT_MAX);
        TransferHelper.safeApprove(address(token1), address(router), UINT_MAX);
    }

    /**
     * @notice Reinvest rewards from staking contract to deposit tokens
     * @dev This external function requires minimum tokens to be met
     */
    function reinvest() external onlyEOA nonReentrant {
        _reinvest(msg.sender);
    }

    /**
     * @notice Reinvest rewards from staking contract to deposit tokens
     * @dev This external function requires minimum tokens to be met
     */
    function reinvestOps() external onlyOps nonReentrant {
        _reinvest(treasury);
    }

    /**
     * @notice Allows exit from Staking Contract without additional logic
     * @dev Reward tokens are not automatically collected
     * @dev New deposits will be effectively disabled
     */
    function emergencyWithdraw() external onlyOwner {
        stakingDualRewards.exit();
        totalDeposits = 0;
    }

    /**
     * @notice Estimate reinvest reward for caller
     * @return Estimated rewards tokens earned for calling `reinvest()`
     */
    function estimateReinvestReward() external view returns (uint256) {
        uint256 dQuickAmount = stakingDualRewards.earnedA(address(this));
        uint256 quickAmount = dragonsliar.dQUICKForQUICK(dQuickAmount);
        return (quickAmount * REINVEST_REWARD_BIPS) / BIPS_DIVISOR;
    }

    function _reinvest(address recipient) internal {
        uint256 dQuickAmount = stakingDualRewards.earnedA(address(this));
        uint256 quickAmount = dragonsliar.dQUICKForQUICK(dQuickAmount);

        stakingDualRewards.getReward();
        dragonsliar.leave(dQuickAmount);

        uint256 stakingFunds = (quickAmount * ADMIN_FEE_BIPS) / BIPS_DIVISOR;
        if (stakingFunds > 0) {
            _convertRewardTokensToAC(stakingFunds);
        }

        uint256 reinvestFee = (quickAmount * REINVEST_REWARD_BIPS) /
            BIPS_DIVISOR;
        if (reinvestFee > 0) {
            TransferHelper.safeTransfer(quick, recipient, reinvestFee);
        }
        uint256 lpTokenAmount = _convertRewardTokensToDepositTokens(
            quickAmount - stakingFunds - reinvestFee
        );

        stakingDualRewards.stake(lpTokenAmount);
        totalDeposits += lpTokenAmount;

        emit Reinvest(totalDeposits, totalSupply);
    }

    function _convertRewardTokensToDepositTokens(uint256 amount)
        internal
        returns (uint256)
    {
        require(
            amount > 0,
            "DualTokenRewardLPMinning::_convertRewardTokensToDepositTokens: amount too low"
        );

        // address[] memory path0 = new address[](2);
        // path0[0] = quick;
        // path0[1] = collectible == address(token0)
        //     ? address(token1)
        //     : address(token0);
        address[] memory path0 = new address[](3);
        path0[0] = quick;
        path0[1] = WETH;
        path0[2] = collectible == address(token0)
            ? address(token1)
            : address(token0);

        uint256[] memory amountsOutToken0 = router.getAmountsOut(amount, path0);
        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];
        router.swapExactTokensForTokens(
            amount,
            amountOutToken0,
            path0,
            address(this),
            block.timestamp + 1800
        );
        uint256 collectibleAmount = IERC20(collectible).balanceOf(
            address(this)
        );

        (, , uint256 liquidity) = router.addLiquidity(
            path0[2],
            collectible,
            amountOutToken0,
            collectibleAmount,
            0,
            0,
            address(this),
            block.timestamp + 1800
        );
        return liquidity;
    }

    function _deposit(uint256 amount, bool check) internal {
        require(
            totalDeposits >= totalSupply,
            "DualTokenRewardLPMinning::_deposit: deposit failed"
        );
        if (REQUIRE_REINVEST_BEFORE_DEPOSIT) {
            _reinvest(msg.sender);
        }
        if (!check) {
            TransferHelper.safeTransferFrom(
                address(depositToken),
                msg.sender,
                address(this),
                amount
            );
        }
        stakingDualRewards.stake(amount);
        UserInfo storage user = userInfo[msg.sender];
        user.amount += uint128(amount);
        _mint(msg.sender, getSharesForDepositTokens(amount));
        totalDeposits += amount;
        emit Deposit(msg.sender, amount);
    }

    function _dualTokenDeposit(
        uint256 amount0,
        address _token0,
        uint256 amountAmin,
        uint256 amount1,
        address _token1,
        uint256 amountBmin,
        bool check
    ) internal {
        if (check) {
            TransferHelper.safeTransferFrom(
                _token0,
                msg.sender,
                address(this),
                amount0
            );
            TransferHelper.safeTransferFrom(
                _token1,
                msg.sender,
                address(this),
                amount1
            );
        }

        (, , uint256 liquidity) = router.addLiquidity(
            _token0,
            _token1,
            amount0,
            amount1,
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
            stakingDualRewards.withdraw(depositTokenAmount);
            if (!check) {
                TransferHelper.safeTransfer(
                    address(depositToken),
                    msg.sender,
                    depositTokenAmount
                );
            }
            if (MINT_AUTOCOMPOUND_TOKEN) {
                uint256 supply = autoCompoundToken.tokenMintedStrategies();
                uint256 maxSupply = autoCompoundToken.MAX_SUPPLY_STRATEGIES();
                UserInfo storage user = userInfo[msg.sender];
                updatePool(user.amount, user.rewardDebt, supply, maxSupply);
                require(
                    user.amount >= amount,
                    "DualTokenRewardLPMinning::_withdraw: Cant't withdraw this amount"
                );
                user.amount -= uint128(amount);
                supply = autoCompoundToken.tokenMintedStrategies();
                if (maxSupply != supply) {
                    user.rewardDebt = uint128(
                        (user.amount * autoCompoundTokenPerShare) / 1e12
                    );
                }
            }
            _burn(msg.sender, amount);
            totalDeposits -= depositTokenAmount;
            emit Withdraw(msg.sender, depositTokenAmount);
        } else {
            require(
                false,
                "DualTokenRewardLPMinning::_withdraw: Can't withdraw this much amount"
            );
        }
    }
}
