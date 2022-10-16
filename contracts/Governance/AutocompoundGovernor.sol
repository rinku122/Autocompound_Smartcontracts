// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./interfaces/XACInterface.sol";
import "./interfaces/TimelockInterface.sol";
import "./interfaces/IAutocompoundGovernor.sol";

contract AutocompoundGovernor is IAutocompoundGovernor {
    string public constant name = "AutocompoundGovernor";

    TimelockInterface public timelock;
    XACInterface public XAC;
    address public guardian;

    uint256 public proposalCount;

    struct Proposal {
        // @notice Unique id for looking up a proposal
        uint256 id;
        // @notice Creator of the proposal
        address proposer;
        // @notice The timestamp that the proposal will be available for execution, set once the vote succeeds
        uint256 eta;
        // @notice the ordered list of target addresses for calls to be made
        address[] targets;
        // @notice The ordered list of values (i.e. msg.value) to be passed to the calls to be made
        uint256[] values;
        // @notice The ordered list of function signatures to be called
        string[] signatures;
        // @notice The ordered list of calldata to be passed to each call
        bytes[] calldatas;
        // @notice The timestamp at which voting begins: holders must delegate their votes prior to this time
        uint256 startTime;
        // @notice The timestamp at which voting ends: votes must be cast prior to this block
        uint256 endTime;
        // @notice The block at which voting began: holders must have delegated their votes prior to this block
        uint256 startBlock;
        // @notice Current number of votes in favor of this proposal
        uint256 forVotes;
        // @notice Current number of votes in opposition to this proposal
        uint256 againstVotes;
        // @notice Flag marking whether the proposal has been canceled
        bool canceled;
        // @notice Flag marking whether the proposal has been executed
        bool executed;
        // @notice Type of propsal. 1 = core and 2 for community
        uint256 proposalType;
        // @notice Receipts of ballots for the entire set of voters
        mapping(address => Receipt) receipts;
    }

    // @notice Ballot receipt record for a voter
    struct Receipt {
        // @notice Whether or not a vote has been cast
        bool hasVoted;
        // @notice Whether or not the voter supports the proposal
        bool support;
        // @notice The number of votes the voter had, which were cast
        uint256 votes;
    }

    // @notice Possible states that a proposal may be in
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    // @notice The official record of all proposals ever proposed
    mapping(uint256 => Proposal) public proposals;

    // @notice The latest proposal for each proposer
    mapping(address => uint256) public latestProposalIds;

    // @notice Members who can make core propsals
    mapping(address => bool) public coreMembers;

    // @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );

    // @notice The EIP-712 typehash for the ballot struct used by the contract
    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,bool support)");

    /**
     * @dev Sets the values for {timelock contract} , {voting token} and {guardian}.Also sets guardian as default core member
     */
    constructor(
        address timelock_,
        address XAC_,
        address guardian_
    ) {
        timelock = TimelockInterface(timelock_);
        XAC = XACInterface(XAC_);
        guardian = guardian_;
        coreMembers[guardian] = true;
    }

    /**
     * @dev function to que a propsal
     * @param proposalId propsal id to be queued
     */

    function queue(uint256 proposalId) external {
        require(
            state(proposalId) == ProposalState.Succeeded,
            "AutocompoundGovernor::queue: proposal can only be queued if it is succeeded"
        );
        Proposal storage proposal = proposals[proposalId];
        uint256 eta = block.timestamp + timelock.delay();
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            _queueOrRevert(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                eta
            );
        }
        proposal.eta = eta;
        emit ProposalQueued(proposalId, eta);
    }

    /**
     * @dev function to cast a vote
     * @param proposalId proposal id
     * @param support bool that is a reference to for or against vote. true = for and false = against
     */
    function castVote(uint256 proposalId, bool support) external {
        return _castVote(msg.sender, proposalId, support);
    }

    /**
     * @dev function to cast a vote by signature
     * @param proposalId proposal id
     * @param support bool that is a reference to for or against vote. true = for and false = against
     */

    function castVoteBySig(
        uint256 proposalId,
        bool support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                getChainId(),
                address(this)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(BALLOT_TYPEHASH, proposalId, support)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        address signatory = ecrecover(digest, v, r, s);
        require(
            signatory != address(0),
            "AutocompoundGovernor::castVoteBySig: invalid signature"
        );
        return _castVote(signatory, proposalId, support);
    }

    /**
     * @dev function that set governor contract as timelock owner
     */

    function __acceptAdmin() external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__acceptAdmin: sender must be gov guardian"
        );
        timelock.acceptAdmin();
    }

    /**
     * @dev function that abondons old guardian
     */

    function __abdicate() external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__abdicate: sender must be gov guardian"
        );
        guardian = address(0);
    }

    /**
     * @dev function that whitelist a community proposer to core proposer
     * @param _proposer address of user to be whitelisted
     */

    function whiteListCommunityProposer(address _proposer, bool value)
        external
    {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::whiteListCommunityProposer: sender must be gov guardian"
        );
        coreMembers[_proposer] = value;
    }

    /**
     * @dev Que a proposal to set pending admin of timelock
     * @param newPendingAdmin address of pending admin
     * @param eta time after which transaction will be executed
     */

    function __queueSetTimelockPendingAdmin(
        address newPendingAdmin,
        uint256 eta
    ) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__queueSetTimelockPendingAdmin: sender must be gov guardian"
        );
        timelock.queueTransaction(
            address(timelock),
            0,
            "setPendingAdmin(address)",
            abi.encode(newPendingAdmin),
            eta
        );
    }

    /**
     * @dev Execute a proposal to set pending admin of timelock
     * @param newPendingAdmin address of pending admin
     * @param eta time after which transaction will be executed
     */

    function __executeSetTimelockPendingAdmin(
        address newPendingAdmin,
        uint256 eta
    ) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__executeSetTimelockPendingAdmin: sender must be gov guardian"
        );
        timelock.executeTransaction(
            address(timelock),
            "setPendingAdmin(address)",
            abi.encode(newPendingAdmin),
            eta
        );
    }

    /**
     * @dev Que a proposal to recover funds
     * @param user address that will recieve funds
     * @param eta time after which transaction will be executed
     */

    function __queRecoverFunds(
        address user,
        address strategy,
        uint256 eta,
        uint256 amount
    ) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__queRecoverFunds: sender must be gov guardian"
        );
        require(
            amount > 0,
            "AutocompoundGovernor::__queRecoverFunds: amount should be greater then zero"
        );
        timelock.queueTransaction(
            address(strategy),
            0,
            "recoverNativeAsset(uint256)",
            abi.encode(amount),
            eta
        );
        timelock.queueTransaction(
            address(timelock),
            0,
            "recoverNativeAsset(address)",
            abi.encode(user),
            eta
        );
    }

    /**
     * @dev Execute a proposal to recover funds
     * @param user address that will recieve funds
     * @param eta time after which transaction will be executed
     */

    function __executeRecoverFunds(
        address user,
        address strategy,
        uint256 eta,
        uint256 amount
    ) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__executeRecoverFunds: sender must be gov guardian"
        );

        require(
            amount > 0,
            "AutocompoundGovernor::__executeRecoverFunds: amount should be greater then zero"
        );

        timelock.executeTransaction(
            address(strategy),
            "recoverNativeAsset(uint256)",
            abi.encode(amount),
            eta
        );

        timelock.executeTransaction(
            address(timelock),
            "recoverNativeAsset(address)",
            abi.encode(user),
            eta
        );
    }

    /**
     * @dev Que a proposal to get the tokens out from timelock
     * @param user address that will recieve funds
     * @param eta time after which transaction will be executed
     */

    function __queRecoverTokens(
        address user,
        address strategy,
        address _token,
        uint256 amount,
        uint256 eta
    ) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__queRecoverTokens: sender must be gov guardian"
        );
        require(
            amount > 0,
            "AutocompoundGovernor::__queRecoverTokens: amount should be greater then zero"
        );
        timelock.queueTransaction(
            address(strategy),
            0,
            "recoverERC20(address,uint256)",
            abi.encode(_token, amount),
            eta
        );
        timelock.queueTransaction(
            address(timelock),
            0,
            "recoverERC20(address,address)",
            abi.encode(user, _token),
            eta
        );
    }

    /**
     * @dev Execute a proposal to set pending admin of timelock
     * @param user address that will recieve funds
     * @param eta time after which transaction will be executed
     */

    function __executeRecoverTokens(
        address user,
        address strategy,
        address _token,
        uint256 amount,
        uint256 eta
    ) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__executeRecoverTokens: sender must be gov guardian"
        );
        require(
            amount > 0,
            "AutocompoundGovernor::__executeRecoverTokens: amount should be greater then zero"
        );

        timelock.executeTransaction(
            address(strategy),
            "recoverERC20(address,uint256)",
            abi.encode(_token, amount),
            eta
        );
        timelock.executeTransaction(
            address(timelock),
            "recoverERC20(address,address)",
            abi.encode(user, _token),
            eta
        );
    }

    /**
     * @dev function to execute a proposal, can only be done by guardian
     * @param proposalId propsal id to be executed
     */

    function execute(uint256 proposalId) external payable {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__execute: sender must be gov guardian"
        );
        require(
            state(proposalId) == ProposalState.Queued,
            "AutocompoundGovernor::execute: proposal can only be executed if it is queued"
        );
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            timelock.executeTransaction{value: proposal.values[i]}(
                proposal.targets[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                proposal.eta
            );
        }
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev function to cancel a proposal, can only be done by guardian
     * @param proposalId proposal id to be cancelled
     */

    function cancel(uint256 proposalId) external {
        require(
            msg.sender == guardian,
            "AutocompoundGovernor::__cancel: sender must be gov guardian"
        );
        ProposalState _state = state(proposalId);
        require(
            _state != ProposalState.Executed,
            "AutocompoundGovernor::cancel: cannot cancel executed proposal"
        );

        Proposal storage proposal = proposals[proposalId];

        proposal.canceled = true;
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            timelock.cancelTransaction(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                proposal.eta
            );
        }

        emit ProposalCanceled(proposalId);
    }

    /**
     * @dev function to make a propsal, can be made by a community user
     * @param votingPeriod period of voting
     * @param targets contract address for which propsal has been made
     * @param values Native currency  values
     * @param signatures signature of function that is to executed
     * @param calldatas call data of function that is to executed
     * @param description ipfs hash of description of propsal
     */

    function communityPropose(
        uint256 votingPeriod,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public {
        _propose(
            2,
            votingPeriod,
            targets,
            values,
            signatures,
            calldatas,
            description
        );
    }

    ////Change before prod
    /**
     * @dev Gives  number of votes required in order for a voter to become a proposer
     */
    function proposalThreshold() public pure returns (uint256) {
        return 3e18;
    } // 5 XAC

    ////Change before prod
    /**
     * @dev Gives the maximum number of actions that can be included in a proposal
     */
    function proposalMaxOperations() public pure returns (uint256) {
        return 10;
    } // 10 actions

    ////Change before prod
    /**
     * @dev Gives  the delay before voting on a proposal may take place, once proposed
     */
    function votingDelay() public pure returns (uint256) {
        return 500;
    }

    ////Change before prod
    /**
     * @dev Gives minimum voting period for a purposal
     */
    function minimumVotingPeriod() public pure returns (uint256) {
        return 500;
    }

    ////Change before prod
    /**
     * @dev Gives maximun voting period for a purposal
     */
    function maximumVotingPeriod() public pure returns (uint256) {
        return 3000;
    }

    ////Change before prod
    /**
     * @dev Gives minimum voting period for a purposal that can only be made by core propsal
     */
    function minimumVotingPeriodCoreMembers() public pure returns (uint256) {
        return 100;
    }

    ////Change before prod
    /**
     * @dev Gives maximum voting period for a purposal that can only be made by core propsal
     */
    function maximumVotingPeriodCoreMembers() public pure returns (uint256) {
        return 5000;
    }

    /**
     * @dev function to make a propsal, can be made by a core user
     * @param votingPeriod period of voting
     * @param targets contract address for which propsal has been made
     * @param values Native currency  values
     * @param signatures signature of function that is to executed
     * @param calldatas call data of function that is to executed
     * @param description ipfs hash of description of propsal
     */

    function corePropose(
        uint256 votingPeriod,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public {
        require(
            (coreMembers[msg.sender]),
            "AutocompoundGovernor::proposeAdmin: sender must be core member"
        );
        require(
            (votingPeriod >= minimumVotingPeriodCoreMembers() &&
                votingPeriod <= maximumVotingPeriodCoreMembers()),
            "AutocompoundGovernor::propose: invalid voting period"
        );

        _propose(
            1,
            votingPeriod,
            targets,
            values,
            signatures,
            calldatas,
            description
        );
    }

    /**
     * @dev function that returns actions of propsal
     * @param proposalId propsal id
     */

    function getActions(uint256 proposalId)
        public
        view
        returns (
            address[] memory targets,
            uint256[] memory values,
            string[] memory signatures,
            bytes[] memory calldatas
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.targets, p.values, p.signatures, p.calldatas);
    }

    /**
     * @dev function that returns voting details of a user
     * @param proposalId propsal id
     * @param voter address of voter
     */

    function getReceipt(uint256 proposalId, address voter)
        public
        view
        returns (Receipt memory)
    {
        return proposals[proposalId].receipts[voter];
    }

    /**
     * @dev function that returns state of propsal
     * @param proposalId propsal id
     */

    function state(uint256 proposalId) public view returns (ProposalState) {
        require(
            proposalCount >= proposalId && proposalId > 0,
            "AutocompoundGovernor::state: invalid proposal id"
        );
        Proposal storage proposal = proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.timestamp <= proposal.startTime) {
            return ProposalState.Pending;
        } else if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        } else if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalState.Defeated;
        } else if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp >= proposal.eta + timelock.GRACE_PERIOD()) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    

    function _castVote(
        address voter,
        uint256 proposalId,
        bool support
    ) internal {
        require(
            state(proposalId) == ProposalState.Active,
            "AutocompoundGovernor::_castVote: voting is closed"
        );
        Proposal storage proposal = proposals[proposalId];
        if (proposal.startBlock == 0) {
            proposal.startBlock = block.number - 1;

            emit StartBlockSet(proposalId, block.number);
        }
        Receipt storage receipt = proposal.receipts[voter];
        require(
            receipt.hasVoted == false,
            "AutocompoundGovernor::_castVote: voter already voted"
        );
        uint256 votes = XAC.getPriorVotes(voter, proposal.startBlock);
        require(
            votes > 0,
            "AutocompoundGovernor::_castVote: Not eligible for voting"
        );

        if (support) {
            proposal.forVotes = proposal.forVotes + votes;
        } else {
            proposal.againstVotes = proposal.againstVotes + votes;
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;

        emit VoteCast(voter, proposalId, support, votes);
    }

    function _queueOrRevert(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) internal {
        require(
            !timelock.queuedTransactions(
                keccak256(abi.encode(target, value, signature, data, eta))
            ),
            "AutocompoundGovernor::_queueOrRevert: proposal action already queued at eta"
        );
        timelock.queueTransaction(target, value, signature, data, eta);
    }

    function _propose(
        uint256 index,
        uint256 votingPeriod,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) internal {
        if (index == 2) {
            require(
                votingPeriod >= minimumVotingPeriod() &&
                    votingPeriod <= maximumVotingPeriod(),
                "AutocompoundGovernor::propose: invalid voting period"
            );
        }

        require(
            XAC.getPriorVotes(msg.sender, block.number - 1) >
                proposalThreshold(),
            "AutocompoundGovernor::propose: proposer votes below proposal threshold"
        );
        require(
            targets.length == values.length &&
                targets.length == signatures.length &&
                targets.length == calldatas.length,
            "AutocompoundGovernor::propose: proposal function information arity mismatch"
        );
        require(
            targets.length != 0,
            "AutocompoundGovernor::propose: must provide actions"
        );
        require(
            targets.length <= proposalMaxOperations(),
            "AutocompoundGovernor::propose: too many actions"
        );

        uint256 latestProposalId = latestProposalIds[msg.sender];

        if (latestProposalId != 0) {
            ProposalState proposersLatestProposalState = state(
                latestProposalId
            );
            require(
                proposersLatestProposalState != ProposalState.Active,
                "AutocompoundGovernor::propose: one live proposal per proposer, found an already active proposal"
            );
            require(
                proposersLatestProposalState != ProposalState.Pending,
                "AutocompoundGovernor::propose: one live proposal per proposer, found an already pending proposal"
            );
        }

        uint256 startTime = block.timestamp + votingDelay();
        uint256 endTime = block.timestamp + (votingPeriod + votingDelay());

        proposalCount++;
        proposals[proposalCount].id = proposalCount;
        proposals[proposalCount].proposer = msg.sender;
        proposals[proposalCount].eta = 0;
        proposals[proposalCount].targets = targets;
        proposals[proposalCount].values = values;
        proposals[proposalCount].signatures = signatures;
        proposals[proposalCount].calldatas = calldatas;
        proposals[proposalCount].startTime = startTime;
        proposals[proposalCount].startBlock = 0;
        proposals[proposalCount].endTime = endTime;
        proposals[proposalCount].forVotes = 0;
        proposals[proposalCount].againstVotes = 0;
        proposals[proposalCount].canceled = false;
        proposals[proposalCount].executed = false;
        proposals[proposalCount].proposalType = index;

        latestProposalIds[msg.sender] = proposalCount;

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            targets,
            values,
            signatures,
            calldatas,
            startTime,
            endTime,
            description,
            proposals[proposalCount].proposalType
        );
    }

    function getChainId() internal view returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
