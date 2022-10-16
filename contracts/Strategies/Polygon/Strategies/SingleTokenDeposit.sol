// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../interfaces/IStakingRewards.sol";
import "./QuickSwapStrategy.sol";
import "../../interfaces/IPair.sol";

contract SingleTokenDeposit is QuickSwapStrategy {
    address public collectible;
    IStakingRewards public stakingRewards;

    constructor(
        address _WETH,
        address _quick,
        address _collectible,
        address _stakingRewards,
        address _router,
        uint256 _autoCompoundTokenPerBlock,
        address _ops,
        address _treasury
    ) {
        ops = _ops;
        treasury = _treasury;
        WETH = _WETH;
        quick = _quick;
        collectible = _collectible;
        stakingRewards = IStakingRewards(_stakingRewards);
        router = IRouter(_router);

        autoCompoundTokenPerBlock = _autoCompoundTokenPerBlock;
        startBlock = block.number;
        lastRewardBlock = startBlock;

        name = string(abi.encodePacked("Autocompound: ", "QUICK"));

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
            stakingRewards.withdraw(depositTokenAmount);

            TransferHelper.safeTransfer(quick, msg.sender, depositTokenAmount);
            if (MINT_AUTOCOMPOUND_TOKEN) {
                uint256 supply = autoCompoundToken.tokenMintedStrategies();
                uint256 maxSupply = autoCompoundToken.MAX_SUPPLY_STRATEGIES();
                UserInfo storage user = userInfo[msg.sender];
                updatePool(user.amount, user.rewardDebt, supply, maxSupply);
                require(
                    user.amount >= amount,
                    "SingleTokenDeposit::_withdraw: Can't withdraw this much amount"
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
                "SingleTokenDeposit::_withdraw: withdraw amount can,t be zero"
            );
        }
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
        stakingRewards.exit();
        totalDeposits = 0;
    }

    /**
     * @notice Estimate reinvest reward for caller
     * @return Estimated rewards tokens earned for calling `reinvest()`
     */
    function estimateReinvestReward() external view returns (uint256) {
        uint256 unclaimedRewards = stakingRewards.earned(address(this));
        return (unclaimedRewards * REINVEST_REWARD_BIPS) / BIPS_DIVISOR;
    }

    /**
     * @notice Approve tokens for use in Strategy
     * @dev Restricted to avoid griefing attacks
     */
    function setAllowances() public onlyOwner {
        TransferHelper.safeApprove(quick, address(stakingRewards), UINT_MAX);
        TransferHelper.safeApprove(collectible, address(router), UINT_MAX);
    }

    function _deposit(uint256 amount) internal {
        require(
            totalDeposits >= totalSupply,
            "SingleTokenDeposit::_deposit: deposit failed"
        );
        if (REQUIRE_REINVEST_BEFORE_DEPOSIT) {
            _reinvest(msg.sender);
        }

        TransferHelper.safeTransferFrom(
            quick,
            msg.sender,
            address(this),
            amount
        );
        stakingRewards.stake(amount);
        UserInfo storage user = userInfo[msg.sender];
        user.amount += uint128(amount);
        _mint(msg.sender, getSharesForDepositTokens(amount));
        totalDeposits += amount;
        emit Deposit(msg.sender, amount);
    }

    function _reinvest(address recipient) internal {
        uint256 amount = stakingRewards.earned(address(this));
        stakingRewards.getReward();
        uint256 stakingFunds = (amount * ADMIN_FEE_BIPS) / BIPS_DIVISOR;
        if (stakingFunds > 0) {
            _convertRewardTokensToAC(stakingFunds);
        }

        uint256 reinvestFee = (amount * REINVEST_REWARD_BIPS) / BIPS_DIVISOR;
        if (reinvestFee > 0) {
            TransferHelper.safeTransfer(collectible, recipient, reinvestFee);
        }

        uint256 lpTokenAmount = _convertRewardTokensToDepositTokens(
            amount - stakingFunds - reinvestFee
        );
        stakingRewards.stake(lpTokenAmount);
        totalDeposits += lpTokenAmount;

        emit Reinvest(totalDeposits, totalSupply);
    }

    function _convertRewardTokensToAC(uint256 amount)
        internal
        override
        returns (uint256)
    {
        require(
            amount > 0,
            "SingleTokenDeposit::_convertRewardTokensToAC: amount too low"
        );

        // swap to depositToken
        address[] memory path0 = new address[](3);
        path0[0] = collectible;
        path0[1] = WETH;
        path0[2] = address(autoCompoundToken);

        uint256[] memory amountsOutToken0 = router.getAmountsOut(amount, path0);
        uint256 amountOutToken0 = amountsOutToken0[amountsOutToken0.length - 1];
        if (amountOutToken0 > 0) {
            router.swapExactTokensForTokens(
                amount,
                amountOutToken0,
                path0,
                acStakingContract,
                block.timestamp + 1800
            );
        }

        return amountOutToken0;
    }

    function _convertRewardTokensToDepositTokens(uint256 amount)
        internal
        returns (uint256)
    {
        require(
            amount > 0,
            "SingleTokenDeposit::_convertRewardTokensToDepositTokens: amount too low"
        );

        // swap to quick
        // address[] memory path0 = new address[](2);
        // path0[0] = collectible;
        // path0[1] = quick;
        address[] memory path0 = new address[](3);
        path0[0] = collectible;
        path0[1] = WETH;
        path0[2] = quick;

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
