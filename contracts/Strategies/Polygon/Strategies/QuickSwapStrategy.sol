// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../../libraries/TransferHelper.sol";
import "../../interfaces/IRouter.sol";
import "../../interfaces/IERC20AutoCompound.sol";
import "../../interfaces/IQuickSwapStrategy.sol";
import "../../interfaces/IERC20.sol";

abstract contract QuickSwapStrategy is
    Ownable,
    ReentrancyGuard,
    IQuickSwapStrategy
{
    // Info of each user.
    struct UserInfo {
        uint128 amount; // How many LP tokens the user has provided.
        uint128 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of autoCompoundTokens
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * autoCompoundTokenPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `autoCompoundTokenPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    IRouter public router;
    IERC20AutoCompound public constant autoCompoundToken =
        IERC20AutoCompound(0x12e9a9dcDc8f276c71524Ddd102343525ddAbB26);
    address public constant acStakingContract =
        0x451C4fac7faA4217224b1de067Ef13B7031731C9;
    // IERC20AutoCompound public autoCompoundToken;
    // address public acStakingContract;
    address public quick;
    address public WETH;

    address public ops;
    address public treasury;

    uint256 public ADMIN_FEE_BIPS = 500;
    uint256 public REINVEST_REWARD_BIPS = 300;
    uint256 internal constant BIPS_DIVISOR = 10000;
    uint256 internal constant SLIPPAGE_DIVISOR = 1000;
    uint256 internal constant UINT_MAX = type(uint256).max;
    uint256 lastRewardBlock; // Last block number that autoCompoundTokens distribution occurs.
    uint256 public autoCompoundTokenPerShare; // Accumulated autoCompoundTokens per share, times 1e12. See below.
    // autoCompoundToken tokens created per block.
    uint256 public autoCompoundTokenPerBlock;
    // Bonus muliplier for early autoCompoundToken makers.
    uint256 public BONUS_MULTIPLIER = 1;
    // The block number when autoCompoundToken mining starts.
    uint256 public startBlock;

    // Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;

    bool public REQUIRE_REINVEST_BEFORE_DEPOSIT;
    bool public MINT_AUTOCOMPOUND_TOKEN;
    // uint256 public MIN_TOKENS_TO_REINVEST_BEFORE_DEPOSIT = 20;

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
                "QuickSwapStartegy::transferFrom: transfer amount exceeds allowance"
            );
            uint256 newAllowance = spenderAllowance - amount;
            allowances[src][spender] = newAllowance;

            emit Approval(src, spender, newAllowance);
        }

        _transferTokens(src, dst, amount);
        return true;
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
     * @notice Update admin fee
     * @dev Total fees cannot be greater than BIPS_DIVISOR (100%)
     * @param newValue specified in BIPS
     */
    function updateAdminFee(uint256 newValue) external onlyOwner {
        require(
            newValue + ADMIN_FEE_BIPS <= BIPS_DIVISOR,
            "QuickSwapStrategy::updateAdminFee: admin fee too high"
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
            "QuickSwapStrategy::updateReinvestReward : reinvest reward too high"
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
            "QuickSwapStrategy::recoverERC20: amount too low"
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
            "QuickSwapStrategy::recoverNativeAsset: amount too low"
        );
        TransferHelper.safeTransferETH(payable(msg.sender), amount);
        emit Recovered(address(0), amount);
    }

    /**
     * @notice Function to update autocompound token
     * @param multiplierNumber multiplier that can increase or decrease autocompound minting on withdraw
     */

    function updateMultiplier(uint256 multiplierNumber) external onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }

    /**
     * @notice Function to update minimum tokens to to be minted
     */

    function mintAutocompoundTokens() external onlyOwner {
        MINT_AUTOCOMPOUND_TOKEN = !MINT_AUTOCOMPOUND_TOKEN;
    }

    /**
     * @notice Function to update autocompound token minting per block
     * @param _autoCompoundTokenPerBlock amount autocompound token to mint per block
     */

    function updateAutoCompoundTokenPerBlock(uint256 _autoCompoundTokenPerBlock)
        external
        onlyOwner
    {
        autoCompoundTokenPerBlock = _autoCompoundTokenPerBlock;
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

    function updatePool(
        uint256 amount,
        uint256 rewardDebt,
        uint256 supply,
        uint256 maxSupply
    ) internal {
        if (block.number <= lastRewardBlock || maxSupply == supply) {
            return;
        }
        uint256 lpSupply = totalDeposits;
        if (lpSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(lastRewardBlock, block.number);

        uint256 autoCompoundTokenReward = multiplier *
            autoCompoundTokenPerBlock;

        autoCompoundTokenPerShare =
            autoCompoundTokenPerShare +
            ((autoCompoundTokenReward * 1e12) / lpSupply);

        lastRewardBlock = block.number;
        uint256 pending = ((amount * autoCompoundTokenPerShare) / 1e12) -
            rewardDebt;

        if (pending > 0) {
            uint256 amountToMint;
            if (pending + supply <= maxSupply) {
                amountToMint = pending;
            } else {
                amountToMint = (pending + supply) - maxSupply;
                amountToMint = pending - amountToMint;
            }
            if (amountToMint > 0) {
                autoCompoundToken.mint(msg.sender, amountToMint);
            }
        }
    }

    /**
     * @dev Throws if called by smart contract
     */
    modifier onlyEOA() {
        require(tx.origin == msg.sender, "QuickSwapStrategy::onlyEOA: onlyEOA");
        _;
    }

    /**
     * @dev Throws if called by smart contract
     */
    modifier onlyOps() {
        require(msg.sender == ops, "QuickSwapStrategy::onlyOps: onlyOps");
        _;
    }

    function _convertRewardTokensToAC(uint256 amount)
        internal
        virtual
        returns (uint256)
    {
        require(
            amount > 0,
            "QuickSwapStrategy::_convertRewardTokensToAC: amount too low"
        );

        // swap to depositToken
        address[] memory path0 = new address[](3);
        path0[0] = quick;
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
            "QuickSwapStartegy::_approve: owner zero address"
        );
        require(
            spender != address(0),
            "QuickSwapStartegy::_approve: spender zero address"
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
            "QuickSwapStartegy:: _transferTokens: cannot transfer to the zero address"
        );

        require(
            balances[from] >= value,
            "QuickSwapStartegy:: _transferTokens: transfer exceeds from balance"
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
            "QuickSwapStartegy::_burn: burn amount exceeds from balance"
        );
        balances[from] = balances[from] - value;
        require(
            totalSupply >= value,
            "QuickSwapStartegy::_burn: burn amount exceeds total supply"
        );
        totalSupply = totalSupply - value;
        emit Transfer(from, address(0), value);
    }

    function getMultiplier(uint256 _from, uint256 _to)
        internal
        view
        returns (uint256)
    {
        return (_to - _from) * BONUS_MULTIPLIER;
    }
}
