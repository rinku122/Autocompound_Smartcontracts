// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./SmartChefInitializableStartegy.sol";

contract SmartChefInitializableStartegySA is SmartChefInitializableStartegy {
    constructor(
        address _WETH,
        address _cakeToken,
        address _rewardToken,
        address smartChefInitializable,
        address _router,
        address _ops,
        address _treasury
    ) {
        ops = _ops;
        treasury = _treasury;
        WETH = _WETH;
        cakeToken = _cakeToken;
        rewardToken = IERC20(_rewardToken);
        stakingContract = ISmartChefInitializableStartegy(
            smartChefInitializable
        );
        router = IRouter(_router);

        name = string(abi.encodePacked("Autocompound: ", "Cake"));

        setAllowances();
        emit Reinvest(0, 0);
    }

    /**
     * @notice Deposit tokens to receive receipt tokens
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external override nonReentrant {
        _deposit(amount);
    }

    /**
     * @notice Withdraw LP tokens by redeeming receipt tokens
     * @param amount Amount of receipt tokens to redeem
     */
    function withdraw(uint256 amount) external override nonReentrant {
        uint256 depositTokenAmount = getDepositTokensForShares(amount);
        if (depositTokenAmount > 0) {
            _withdrawDepositTokens(depositTokenAmount);

            TransferHelper.safeTransfer(
                cakeToken,
                msg.sender,
                depositTokenAmount
            );

            _burn(msg.sender, amount);
            totalDeposits -= depositTokenAmount;
            emit Withdraw(msg.sender, depositTokenAmount);
        } else {
            revert(
                "SmartChefInitializableStartegy::_withdraw: withdraw amount can,t be zero"
            );
        }
    }

    /**
     * @notice Reinvest rewards from staking contract to deposit tokens
     * @dev This external function requires minimum tokens to be met
     */
    function reinvest() external onlyEOA nonReentrant {
        uint256 unclaimedRewards = checkReward();
        require(
            unclaimedRewards >= MIN_TOKENS_TO_REINVEST,
            "SmartChefInitializableStartegySA::reinvest: MIN_TOKENS_TO_REINVEST"
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
            "SmartChefInitializableStartegySA::reinvestOps: MIN_TOKENS_TO_REINVEST"
        );
        _reinvest(unclaimedRewards, treasury);
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
     * @notice Approve tokens for use in Strategy
     * @dev Restricted to avoid griefing attacks
     */
    function setAllowances() public onlyOwner {
        TransferHelper.safeApprove(
            cakeToken,
            address(stakingContract),
            UINT_MAX
        );
        TransferHelper.safeApprove(
            address(rewardToken),
            address(router),
            UINT_MAX
        );
    }

    function _deposit(uint256 amount) internal {
        require(
            totalDeposits >= totalSupply,
            "SmartChefInitializableStartegySA::_deposit: deposit failed"
        );
        if (REQUIRE_REINVEST_BEFORE_DEPOSIT) {
            uint256 unclaimedRewards = checkReward();
            if (unclaimedRewards >= MIN_TOKENS_TO_REINVEST_BEFORE_DEPOSIT) {
                _reinvest(unclaimedRewards, msg.sender);
            }
        }

        TransferHelper.safeTransferFrom(
            cakeToken,
            msg.sender,
            address(this),
            amount
        );
        _stakeDepositTokens(amount);
        _mint(msg.sender, getSharesForDepositTokens(amount));
        totalDeposits += amount;
        emit Deposit(msg.sender, amount);
    }

    function _reinvest(uint256 amount, address recipient) internal {
        stakingContract.deposit(0);

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
        require(
            amount > 0,
            "SmartChefInitializableStartegySA::_convertRewardTokensToDepositTokens: amount too low"
        );

        // swap to cakeToken
        address[] memory path0 = new address[](3);
        path0[0] = address(rewardToken);
        path0[1] = WETH;
        path0[2] = cakeToken;

        uint256[] memory amountsOutToken0 = router.getAmountsOut(amount, path0);
        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];
        router.swapExactTokensForTokens(
            amount,
            amountOutToken0,
            path0,
            address(this),
            block.timestamp + 1800
        );

        return amountOutToken0;
    }
}
