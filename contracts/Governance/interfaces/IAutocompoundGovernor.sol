// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

interface IAutocompoundGovernor {
    // @notice An event emitted when a new proposal is created
    event ProposalCreated(
        uint256 id,
        address proposer,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas,
        uint256 startTime,
        uint256 endTime,
        string description,
        uint256 proposalType
    );

    // @notice An event emitted when the first vote is cast in a proposal
    event StartBlockSet(uint256 proposalId, uint256 startBlock);

    // @notice An event emitted when a vote has been cast on a proposal
    event VoteCast(
        address voter,
        uint256 proposalId,
        bool support,
        uint256 votes
    );

    // @notice An event emitted when a proposal has been canceled
    event ProposalCanceled(uint256 id);

    // @notice An event emitted when a proposal has been queued in the Timelock
    event ProposalQueued(uint256 id, uint256 eta);

    // @notice An event emitted when a proposal has been executed in the Timelock
    event ProposalExecuted(uint256 id);
}
