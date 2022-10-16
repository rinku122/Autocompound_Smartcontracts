// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/TransferHelper.sol";
import "./interfaces/IStaking.sol";

contract Staking is ERC20("TXAutocompound", "XTC"), IStaking, ReentrancyGuard {
    IERC20 public autocompound;

    constructor(address _autocompound) {
        autocompound = IERC20(_autocompound);
    }

    // Enter the bar. Pay some Autocompounds. Earn some shares.
    function stake(uint256 _amount) public nonReentrant {
        uint256 totalAutocompound = autocompound.balanceOf(address(this));
        uint256 totalShares = totalSupply();
        if (totalShares == 0 || totalAutocompound == 0) {
            _mint(_msgSender(), _amount);
        } else {
            uint256 what = (_amount * (totalShares)) / totalAutocompound;
            _mint(_msgSender(), what);
        }
        TransferHelper.safeTransferFrom(
            address(autocompound),
            _msgSender(),
            address(this),
            _amount
        );

        emit Stake(_msgSender(), _amount);
    }

    // Leave the bar. Claim back your Autocompounds.
    function unstake(uint256 _share) public nonReentrant {
        uint256 totalShares = totalSupply();
        uint256 what = (_share * (autocompound.balanceOf(address(this)))) /
            totalShares;
        _burn(_msgSender(), _share);
        TransferHelper.safeTransfer(address(autocompound), _msgSender(), what);

        emit Unstake(_msgSender(), what);
    }
}
