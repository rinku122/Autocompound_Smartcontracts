// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

interface IQuickSwapStrategy {
    event Deposit(address indexed account, uint256 amount);
    event Withdraw(address indexed account, uint256 amount);
    event Reinvest(uint256 newTotalDeposits, uint256 newTotalSupply);
    event Recovered(address token, uint256 amount);
    event UpdateAdminFee(uint256 oldValue, uint256 newValue);
    event UpdateReinvestReward(uint256 oldValue, uint256 newValue);
    // event UpdateMinTokensToReinvest(uint256 oldValue, uint256 newValue);
    event UpdateRequireReinvestBeforeDeposit(bool newValue);
    // event UpdateMinTokensToReinvestBeforeDeposit(
    //     uint256 oldValue,
    //     uint256 newValue
    // );
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
