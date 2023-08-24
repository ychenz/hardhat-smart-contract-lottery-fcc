// Example: https://github.com/aave/aave-v3-core/blob/master/helper-hardhat-config.ts

import { ethers } from "ethers";

interface NetworkConfig {
    [name: string]: {
        blockConfirmations?: number;
        vrfCoordinatorAddress: string;
        entranceFee: bigint;
        gasLane: string;
        subscriptionId?: string;
        callbackGasLimit: string;
        interval: string;
    };
}

export const networkConfig: NetworkConfig = {
    sepolia: {
        blockConfirmations: 2,
        vrfCoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        entranceFee: ethers.parseEther("0.01"),
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "4710",
        callbackGasLimit: "500000",
        interval: "30", // 30s internal between each raffle
    },
    // local nets
    localhost: {
        blockConfirmations: 1,
        vrfCoordinatorAddress: "",
        entranceFee: ethers.parseEther("0.01"),
        // Any gasLane string is good for mocking
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        interval: "30",
    },
    hardhat: {
        blockConfirmations: 1,
        vrfCoordinatorAddress: "",
        entranceFee: ethers.parseEther("0.01"),
        // Any gasLane string is good for mocking
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        interval: "30",
    },
};

export const devChains = ["hardhat", "localhost"];
