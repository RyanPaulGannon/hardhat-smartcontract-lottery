// SPDX-License-Identifier: MIT

// Lottery contract
// Enter the lottery, by paying an amount
// Pick a random winner with is verifable
// Pick a winner at intervals --> completely autonomous
// Chainlink oracle --> Randomness, automated execution (Chainlink keepers)

pragma solidity ^0.8.7;

error Lottery__NotEnoughETH();

contract Lottery {
    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterLottery() public payable {
        if (msg.value > i_entranceFee) {
            revert Lottery__NotEnoughETH();
        }
        s_players.push(payable(msg.sender));
    }

    // function pickRandomWinner() public {}

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }
}
