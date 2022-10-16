// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/TransferHelper.sol";
import "./interfaces/ITimelock.sol";

contract Timelock is ITimelock {
    IERC20 public token;

    // @notice Grace period. Only after grace period qued transaction can be executed
    uint256 public constant GRACE_PERIOD = 500; //Change before prod
    // @notice Minimum grace period
    uint256 public constant MINIMUM_DELAY = 50; //Change before prod
    // @notice Maximum grace period
    uint256 public constant MAXIMUM_DELAY = 2000; //Change before prod

    // @notice Governing authority for contract
    address public admin;
    // @notice Pending admin of contract
    address public pendingAdmin;
    // @notice Delay after the voting period overs
    uint256 public delay;

    // @notice record for qued transaction
    mapping(bytes32 => bool) public queuedTransactions;

    /**
     * @dev Sets the values for timelock admin and voting delay.
     */
    constructor(address admin_, uint256 delay_) {
        require(
            delay_ >= MINIMUM_DELAY,
            "Timelock::constructor: Delay must exceed minimum delay."
        );
        require(
            delay_ <= MAXIMUM_DELAY,
            "Timelock::setDelay: Delay must not exceed maximum delay."
        );

        admin = admin_;
        delay = delay_;
    }

    /**
     * @dev function to accept native currency
     */
    receive() external payable {}

    /**
     * @dev function to set delay, can only be called by timelock itself.
     * @param delay_ value of delay to set
     */

    function setDelay(uint256 delay_) external {
        require(
            msg.sender == address(this),
            "Timelock::setDelay: Call must come from Timelock."
        );
        require(
            delay_ >= MINIMUM_DELAY,
            "Timelock::setDelay: Delay must exceed minimum delay."
        );
        require(
            delay_ <= MAXIMUM_DELAY,
            "Timelock::setDelay: Delay must not exceed maximum delay."
        );
        delay = delay_;

        emit NewDelay(delay);
    }

    /**
     * @dev function to change admin, can only be called by pending admin
     */

    function acceptAdmin() external {
        require(
            msg.sender == pendingAdmin,
            "Timelock::acceptAdmin: Call must come from pendingAdmin."
        );
        admin = msg.sender;
        pendingAdmin = address(0);

        emit NewAdmin(admin);
    }

    /**
     * @dev function change pending admin, can only be called by timelock itself
     * @param pendingAdmin_ address of new pending admin
     */
    function setPendingAdmin(address pendingAdmin_) external {
        require(
            msg.sender == address(this),
            "Timelock::setPendingAdmin: Call must come from Timelock."
        );
        pendingAdmin = pendingAdmin_;

        emit NewPendingAdmin(pendingAdmin);
    }

    /**
     * @dev function to cancel proposal, can be called by admin only
     * @param target contract address for which propsal has been made
     * @param value Native currency  values
     * @param signature signature of function that is to executed
     * @param data call data of function that is to executed
     * @param eta time after which transaction will be executed
     */
    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external {
        require(
            msg.sender == admin,
            "Timelock::cancelTransaction: Call must come from admin."
        );

        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, eta)
        );
        queuedTransactions[txHash] = false;

        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }

    /**
     * @dev function to que a proposal, can be called by admin only
     * @param target contract address for which propsal has been made
     * @param value Native currency  values
     * @param signature signature of function that is to executed
     * @param data call data of function that is to executed
     * @param eta time after which transaction will be executed
     */

    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external {
        require(
            msg.sender == admin,
            "Timelock::queueTransaction: Call must come from admin."
        );
        require(
            eta >= getBlockTimestamp() + delay,
            "Timelock::queueTransaction: Estimated execution block must satisfy delay."
        );

        bytes32 txHash = keccak256(
            abi.encode(target, value, signature, data, eta)
        );
        queuedTransactions[txHash] = true;

        emit QueueTransaction(txHash, target, value, signature, data, eta);
    }

    /**
     * @dev function to execute a proposal, can be called by admin only
     * @param target contract address for which propsal has been made
     * @param signature signature of function that is to executed
     * @param data call data of function that is to executed
     * @param eta time after which transaction will be executed
     */

    function executeTransaction(
        address target,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external payable  {
        require(
            msg.sender == admin,
            "Timelock::executeTransaction: Call must come from admin."
        );

        bytes32 txHash = keccak256(
            abi.encode(target, msg.value, signature, data, eta)
        );
        require(
            queuedTransactions[txHash],
            "Timelock::executeTransaction: Transaction hasn't been queued."
        );
        require(
            getBlockTimestamp() >= eta,
            "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
        );
        require(
            getBlockTimestamp() <= eta + GRACE_PERIOD,
            "Timelock::executeTransaction: Transaction is stale."
        );

        queuedTransactions[txHash] = false;

        bytes memory callData;

        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(
                bytes4(keccak256(bytes(signature))),
                data
            );
        }

        // solium-disable-next-line security/no-call-value
        (bool success, ) = target.call{value: msg.value}(
            callData
        );
        require(
            success,
            "Timelock::executeTransaction: Transaction execution reverted."
        );

        emit ExecuteTransaction(
            txHash,
            target,
            msg.value,
            signature,
            data,
            eta
        );

    }

    /**
     * @dev Returns current timestamp
     */
    function getBlockTimestamp() internal view returns (uint256) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp;
    }

    /**
     * @dev Get out nativeCurrency
     * @param user address at which funds has to be transferred
     */
    function recoverNativeAsset(address user) external payable {
        require(
            msg.sender == address(this),
            "Timelock::recoverNativeAsset: Call must come from Timelock."
        );
        TransferHelper.safeTransferETH(payable(user), address(this).balance);
    }

    /**
     * @dev Get out funds
     */
    function recoverERC20(address user, address _token) external payable {
        require(
            msg.sender == address(this),
            "Timelock::recoverERC20: Call must come from Timelock."
        );
        token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        TransferHelper.safeTransfer(_token, user, balance);
    }
}
