// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IERC20AutoCompound {
    function mint(address to, uint256 amount) external;

    function MAX_SUPPLY_STRATEGIES() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function tokenMintedStrategies() external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
}