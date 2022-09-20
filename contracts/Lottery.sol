// SPDX-License-Identifier: MIT

// Lottery contract
// Enter the lottery, by paying an amount
// Pick a random winner with is verifable
// Pick a winner at intervals --> completely autonomous
// Chainlink oracle --> Randomness, automated execution (Chainlink keepers)

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

error Lottery__NotEnoughETH();
error Raffle__TransferFailed();

contract Lottery is VRFConsumerBaseV2 {
    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    /* Lottery variables */
    address private s_recentWinner;

    /* Events */
    event EnterLottery(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address recentWinner);

    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        uint64 subscriptionId,
        uint256 entranceFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        i_callbackGasLimit = callbackGasLimit;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    }

    function enterLottery() public payable {
        if (msg.value > i_entranceFee) {
            revert Lottery__NotEnoughETH();
        }
        s_players.push(payable(msg.sender));
        emit EnterLottery(msg.sender);
    }

    /* https://docs.chain.link/docs/vrf/v2/examples/get-a-random-number/ */
    function requestRandomWinner() external {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // gasLane
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    /* Gets random numbers, but 'word' is a Computer Science term */
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /* View / Pure Functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getWinners() public view returns (address) {
        return s_recentWinner;
    }
}
