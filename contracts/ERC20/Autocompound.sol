// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Works similar to Yakregistry and Yak ERC20....

contract Autocompound is ERC20, Ownable {
    mapping(address => bool) public operators;
    uint256 public constant MAX_SUPPLY_STRATEGIES = 40000e18;
    uint256 public constant MAX_SUPPLY_OWNER = 60000e18;

    uint256 public tokenMintedStrategies;
    uint256 public tokenMintedOwner;

    constructor() ERC20("TAutocompound", "TAC") {}

    function setOperator(address _operator, bool value) external onlyOwner {
        require(
            _operator != address(0),
            "AC Token : new owner is the zero address"
        );
        operators[_operator] = value;
    }

    function mint(address to, uint256 amount) public {
        if (operators[_msgSender()]) {
            require(
                tokenMintedStrategies + amount <= MAX_SUPPLY_STRATEGIES,
                "AC Token : Startegies can't mint now"
            );
            tokenMintedStrategies += amount;
            _mint(to, amount);
        } else {
            require(
                owner() == _msgSender(),
                "AC Token : Can only be called by owner"
            );
            require(
                tokenMintedOwner + amount <= MAX_SUPPLY_OWNER,
                "AC Token : Owner can't mint now"
            );
            tokenMintedOwner += amount;
            _mint(to, amount);
        }
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner)
        public
        virtual
        override
        onlyOwner
    {
        require(
            newOwner != address(0),
            "AC Token : new owner is the zero address"
        );
        operators[owner()] = false;
        _transferOwnership(newOwner);
        operators[newOwner] = true;
    }
}
