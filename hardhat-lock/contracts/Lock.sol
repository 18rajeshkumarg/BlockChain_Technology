// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    event Withdrawal(uint256 amount, uint256 when);

    constructor(uint256 _unlockTime) payable {
        require(block.timestamp < _unlockTime, "Unlock time must be in the future");
        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() external {
        require(block.timestamp >= unlockTime, "Lock has not expired");
        require(msg.sender == owner, "You aren't the owner");

        uint256 amount = address(this).balance;
        emit Withdrawal(amount, block.timestamp);
        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }
}