// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IStaking {
    /// @notice An event thats emitted when a user stake
    event Stake(address indexed account, uint256 amount);
    /// @notice An event thats emitted when a user unstake
    event Unstake(address indexed account, uint256 amount);
}
