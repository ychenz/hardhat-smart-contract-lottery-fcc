// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Created by Yuchen: 2023-Aug-22

// Outline:
// Enter lottery
// Pick random winner
// Winner to be selected every X minutes
// Chainlink Oracle -> random, Automated execution (Chainlink keeper)

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

// Previously keeper
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Raffle__NotEnoughEthEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 state
);

/**
 * @title A Sample Raffle Contract
 * @author Yuchen
 * @notice Creating an untamperable decentralized raffle smart contract
 * @dev This contract implemented Chainlink VRF v2 and Chainlink Automation (Keepers)
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /** Type declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /** State variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    // Chainlink VRF gasLane which sets the max gas used for getting the random number
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQ_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimestamp;
    uint256 private immutable i_interval;

    /** Events */
    // Naming convention: Function name reversed
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /** Functions */
    constructor(
        address vrfConsumerBaseV2, // Contract
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfConsumerBaseV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfConsumerBaseV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        // block.timestamp is a global variable returns current timestamp
        s_lastTimestamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughEthEntered();
        }

        if (s_raffleState == RaffleState.CALCULATING) {
            revert Raffle__NotOpen();
        }

        s_players.push(payable(msg.sender));

        // Events
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that Chainlink Keeper nodes call. They look for `upkeepNeeded` to return true.
     * This is a required override by Chainlink AutomationCompatibleInterface (Keepers).
     *
     * The following should be true in order for upkeepNeeded to be true:
     * 1. The lottery should be in open state (closed when the random number is being generated)
     * 2. The interval has passed since the last upkeep was performed
     * 3 The lottery should have >= 1 player, and have some ETH
     * 4. Our subscription should have enough LINK to pay for the VRF call and the upkeep call
     */
    function checkUpkeep(
        bytes
            memory /* checkData: bytes can be very flexible, like allow calling other functions */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData: Needed by Chainlink */
        )
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool isTimePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        // Returns the upkeepNeeded
        upkeepNeeded = isOpen && isTimePassed && hasPlayers && hasBalance;
    }

    /**
     * @dev Called by Chainlink upkeep if `checkUpkeep()` returns true for `upkeepNeeded`.
     * If `performData` is returned by `checkUpkeep()`, it will be passed here as `performData`.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // Make sure this is called by Chainlink Keeper, not by other random people
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        // Req random number
        // 2 transactions process
        s_raffleState = RaffleState.CALCULATING; // Prevent entering when calculating random number
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQ_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    /**
     * @dev Required implementation by Chainlink VRFConsumerBaseV2
     */
    function fulfillRandomWords(
        uint256, // requestId
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        // Reset states
        s_players = new address payable[](0);
        s_raffleState = RaffleState.OPEN;
        s_lastTimestamp = block.timestamp;

        (bool success, ) = recentWinner.call{value: address(this).balance}("");

        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /** View/Pure functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address payable) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS; // Can be pure since constant is not a state variable
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimestamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    function getRequestConfirmations() public pure returns (uint16) {
        return REQ_CONFIRMATIONS;
    }
}
