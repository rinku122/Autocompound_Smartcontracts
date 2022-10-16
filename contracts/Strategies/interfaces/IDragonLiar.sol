// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "./IERC20.sol";

interface IDragonLiar is IERC20 {
    function leave(uint256 _dQuickAmount) external;

    function QUICKBalance(address _account)
        external
        view
        returns (uint256 quickAmount_);

    function dQUICKForQUICK(uint256 _dQuickAmount)
        external
        view
        returns (uint256 quickAmount_);
}
