// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/TransferHelper.sol";
import "./interfaces/ISmartChefInitializableStartegy.sol";
import "./interfaces/IRouter.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IMasterChefStrategy.sol";

abstract contract SmartChefInitializableStartegy is
    Ownable,
    IMasterChefStrategy,
    ReentrancyGuard
{
    IRouter public router;
    IERC20 public rewardToken;
    ISmartChefInitializableStartegy public stakingContract;
    address public cakeToken;
    address public WETH;
    address public ops;
    address public treasury;

    uint256 public MIN_TOKENS_TO_REINVEST = 20000;
    uint256 public REINVEST_REWARD_BIPS = 300;
    uint256 public ADMIN_FEE_BIPS = 500;
    uint256 internal constant BIPS_DIVISOR = 10000;
    uint256 internal constant UINT_MAX = type(uint256).max;

    bool public REQUIRE_REINVEST_BEFORE_DEPOSIT;
    uint256 public MIN_TOKENS_TO_REINVEST_BEFORE_DEPOSIT = 20;

    string public name = "AutocompoundStrategy";
    string public symbol = "ACS";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    uint256 public totalDeposits;

    mapping(address => mapping(address => uint256)) internal allowances;
    mapping(address => uint256) internal balances;

    mapping(address => uint256) public nonces;

    constructor() {}

    /**
     * @notice Get the number of tokens `spender` is approved to spend on behalf of `account`
     * @param account The address of the account holding the funds
     * @param spender The address of the account spending the funds
     * @return The number of tokens approved
     */
    function allowance(address account, address spender)
        external
        view
        returns (uint256)
    {
        return allowances[account][spender];
    }

    /**
     * @notice Approve `spender` to transfer up to `amount` from `src`
     * @dev This will overwrite the approval amount for `spender`
     * and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)
     * It is recommended to use increaseAllowance and decreaseAllowance instead
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved (2^256-1 means infinite)
     * @return Whether or not the approval succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Get the number of tokens held by the `account`
     * @param account The address of the account to get the balance of
     * @return The number of tokens held
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Transfer `amount` tokens from `msg.sender` to `dst`
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transfer(address dst, uint256 amount) external returns (bool) {
        _transferTokens(msg.sender, dst, amount);
        return true;
    }

    /**
     * @notice Transfer `amount` tokens from `src` to `dst`
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (bool) {
        address spender = msg.sender;
        uint256 spenderAllowance = allowances[src][spender];

        if (spender != src && spenderAllowance != type(uint256).max) {
            require(
                spenderAllowance >= amount,
                "SmartChefInitializableStartegy::transferFrom: transfer amount exceeds allowance"
            );
            uint256 newAllowance = spenderAllowance - amount;
            allowances[src][spender] = newAllowance;

            emit Approval(src, spender, newAllowance);
        }

        _transferTokens(src, dst, amount);
        return true;
    }

    /**
     * @notice Allows exit from Staking Contract without additional logic
     * @dev Reward tokens are not automatically collected
     * @dev New deposits will be effectively disabled
     */
    function emergencyWithdraw() external onlyOwner {
        stakingContract.emergencyWithdraw();
        totalDeposits = 0;
    }

    /**
     * @notice Revoke token allowance
     * @dev Restricted to avoid griefing attacks
     * @param token address
     * @param spender address
     */
    function revokeAllowance(address token, address spender)
        external
        onlyOwner
    {
        TransferHelper.safeApprove(token, spender, 0);
    }

    /**
     * @notice Update reinvest minimum threshold for external callers
     * @param newValue min threshold in wei
     */
    function updateMinTokensToReinvest(uint256 newValue) external onlyOwner {
        emit UpdateMinTokensToReinvest(MIN_TOKENS_TO_REINVEST, newValue);
        MIN_TOKENS_TO_REINVEST = newValue;
    }

    /**
     * @notice Update admin fee
     * @dev Total fees cannot be greater than BIPS_DIVISOR (100%)
     * @param newValue specified in BIPS
     */
    function updateAdminFee(uint256 newValue) external onlyOwner {
        require(
            newValue + REINVEST_REWARD_BIPS <= BIPS_DIVISOR,
            "SmartChefInitializableStartegy::updateAdminFee: admin fee too high"
        );
        emit UpdateAdminFee(ADMIN_FEE_BIPS, newValue);
        ADMIN_FEE_BIPS = newValue;
    }

    /**
     * @notice Update reinvest reward
     * @dev Total fees cannot be greater than BIPS_DIVISOR (100%)
     * @param newValue specified in BIPS
     */
    function updateReinvestReward(uint256 newValue) external onlyOwner {
        require(
            newValue + ADMIN_FEE_BIPS <= BIPS_DIVISOR,
            "SmartChefInitializableStartegy::updateReinvestReward: reinvest reward too high"
        );
        emit UpdateReinvestReward(REINVEST_REWARD_BIPS, newValue);
        REINVEST_REWARD_BIPS = newValue;
    }

    /**
     * @notice Toggle requirement to reinvest before deposit
     */
    function updateRequireReinvestBeforeDeposit() external onlyOwner {
        REQUIRE_REINVEST_BEFORE_DEPOSIT = !REQUIRE_REINVEST_BEFORE_DEPOSIT;
        emit UpdateRequireReinvestBeforeDeposit(
            REQUIRE_REINVEST_BEFORE_DEPOSIT
        );
    }

    /**
     * @notice Update reinvest minimum threshold before a deposit
     * @param newValue min threshold in wei
     */
    function updateMinTokensToReinvestBeforeDeposit(uint256 newValue)
        external
        onlyOwner
    {
        emit UpdateMinTokensToReinvestBeforeDeposit(
            MIN_TOKENS_TO_REINVEST_BEFORE_DEPOSIT,
            newValue
        );
        MIN_TOKENS_TO_REINVEST_BEFORE_DEPOSIT = newValue;
    }

    /**
     * @notice Recover ERC20 from contract
     * @param tokenAddress token address
     * @param tokenAmount amount to recover
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        require(
            tokenAmount > 0,
            "SmartChefInitializableStartegy::recoverERC20: amount too low"
        );
        TransferHelper.safeTransfer(tokenAddress, msg.sender, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /**
     * @notice Recover recoverNativeAsset from contract
     * @param amount amount
     */
    function recoverNativeAsset(uint256 amount) external onlyOwner {
        require(
            amount > 0,
            "SmartChefInitializableStartegy::recoverNativeAsset: amount too low"
        );
        TransferHelper.safeTransferETH(payable(msg.sender), amount);
        emit Recovered(address(0), amount);
    }

    /**
     * @notice Deposit tokens to receive receipt tokens
     * @param amount Amount of tokens to deposit
     */

    function deposit(uint256 amount) external virtual {}

    /**
     * @notice Withdraw LP tokens by redeeming receipt tokens
     * @param amount Amount of receipt tokens to redeem
     */

    function withdraw(uint256 amount) external virtual {}

    /**
     * @notice Function to receive recoverNativeAsset
     */

    receive() external payable {}

    /**
     * @notice Calculate receipt tokens for a given amount of deposit tokens
     * @dev If contract is empty, use 1:1 ratio
     * @dev Could return zero shares for very low amounts of deposit tokens
     * @param amount deposit tokens
     * @return receipt tokens
     */
    function getSharesForDepositTokens(uint256 amount)
        public
        view
        returns (uint256)
    {
        if (totalSupply * totalDeposits == 0) {
            return amount;
        }
        return (amount * totalSupply) / totalDeposits;
    }

    /**
     * @notice Calculate deposit tokens for a given amount of receipt tokens
     * @param amount receipt tokens
     * @return deposit tokens
     */
    function getDepositTokensForShares(uint256 amount)
        public
        view
        returns (uint256)
    {
        if (totalSupply * totalDeposits == 0) {
            return 0;
        }
        return (amount * totalDeposits) / totalSupply;
    }

    /**
     * @notice Reward token balance that can be reinvested
     * @dev Staking rewards accurue to contract on each deposit/withdrawal
     * @return Unclaimed rewards, plus contract balance
     */
    function checkReward() public view returns (uint256) {
        uint256 pendingReward = stakingContract.pendingReward(address(this));
        uint256 contractBalance = rewardToken.balanceOf(address(this));
        return pendingReward + contractBalance;
    }

    /**
     * @dev Throws if called by smart contract
     */
    modifier onlyEOA() {
        require(
            tx.origin == msg.sender,
            "SmartChefInitializableStartegy::onlyEOA: onlyEOA"
        );
        _;
    }

    /**
     * @dev Throws if called by smart contract
     */
    modifier onlyOps() {
        require(
            msg.sender == ops,
            "SmartChefInitializableStartegy::onlyOps: onlyOps"
        );
        _;
    }

    /**
     * @notice Stakes deposit tokens in Staking Contract
     * @param amount deposit tokens to stake
     */
    function _stakeDepositTokens(uint256 amount) internal {
        require(
            amount > 0,
            "SmartChefInitializableStartegy::_stakeDepositTokens: amount too low"
        );
        stakingContract.deposit(amount);
    }

    /**
     * @notice Withdraws deposit tokens from Staking Contract
     * @dev Reward tokens are automatically collected
     * @dev Reward tokens are not automatically reinvested
     * @param amount deposit tokens to remove
     */
    function _withdrawDepositTokens(uint256 amount) internal {
        require(
            amount > 0,
            "SmartChefInitializableStartegy::_withdrawDepositTokens: amount too low"
        );
        stakingContract.withdraw(amount);
    }

    /**
     * @notice Approval implementation
     * @param owner The address of the account which owns tokens
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved (2^256-1 means infinite)
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(
            owner != address(0),
            "SmartChefInitializableStartegy::_approve: owner zero address"
        );
        require(
            spender != address(0),
            "SmartChefInitializableStartegy::_approve: spender zero address"
        );
        allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @notice Transfer implementation
     * @param from The address of the account which owns tokens
     * @param to The address of the account which is receiving tokens
     * @param value The number of tokens that are being transferred
     */
    function _transferTokens(
        address from,
        address to,
        uint256 value
    ) internal {
        require(
            to != address(0),
            "SmartChefInitializableStartegy:: _transferTokens: cannot transfer to the zero address"
        );

        require(
            balances[from] >= value,
            "SmartChefInitializableStartegy::_transferTokens: transfer exceeds from balance"
        );

        balances[from] -= value;
        balances[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balances[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        require(
            balances[from] >= value,
            "SmartChefInitializableStartegy::_burn: burn amount exceeds from balance"
        );
        balances[from] = balances[from] - value;
        require(
            totalSupply >= value,
            "SmartChefInitializableStartegy::_burn: burn amount exceeds total supply"
        );
        totalSupply = totalSupply - value;
        emit Transfer(from, address(0), value);
    }

    /**
     * @notice Current id of the chain where this contract is deployed
     * @return Chain id
     */
    function _getChainId() internal view returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
