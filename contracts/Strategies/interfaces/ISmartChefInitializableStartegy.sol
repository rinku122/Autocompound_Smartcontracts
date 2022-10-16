// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ISmartChefInitializableStartegy {
    function deposit(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function emergencyWithdraw() external;

    function pendingReward(address _user) external view returns (uint256);
}
