import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployment } from "hardhat-deploy/types";
import { networkConfig, devChains } from "../helper-hardhat-config";
import { VRFCoordinatorV2Mock } from "../typechain-types";
import { ethers } from "hardhat";
import { verify } from "../utils/verify";

const VRF_FUND_AMOUNT = ethers.parseEther("30"); // Fund the subscription with 30 LINK

const deployRaffle = async ({
    getNamedAccounts,
    deployments,
    network,
}: HardhatRuntimeEnvironment) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    let vrfCoordinatorAddress, subscriptionId;

    if (devChains.includes(network.name)) {
        // If we are on a local dev chain, we want to use mock price feed contract
        const vrfCoordinatorMock: VRFCoordinatorV2Mock =
            await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorAddress = await vrfCoordinatorMock.getAddress();

        // Mock the VRF subscription
        const txResponse = await vrfCoordinatorMock.createSubscription();
        await txResponse.wait(1);

        // Getting the events after subscription creation
        // Note: This is how we get event with ethers.js v6
        const filter = vrfCoordinatorMock.filters.SubscriptionCreated;
        const events = await vrfCoordinatorMock.queryFilter(filter, -1);
        subscriptionId = events[0].args.subId;

        // Fund the subscription
        // Usually you need LINK to fund the sub on real network
        await vrfCoordinatorMock.fundSubscription(
            subscriptionId,
            VRF_FUND_AMOUNT,
        );
    } else {
        vrfCoordinatorAddress =
            networkConfig[network.name].vrfCoordinatorAddress;
        subscriptionId = networkConfig[network.name].subscriptionId;
    }

    const args = [
        vrfCoordinatorAddress,
        networkConfig[network.name].entranceFee,
        networkConfig[network.name].gasLane,
        subscriptionId,
        networkConfig[network.name].callbackGasLimit,
        networkConfig[network.name].interval,
    ];

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: networkConfig[network.name].blockConfirmations,
    });

    if (!devChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(raffle.address, args);
    }
    log("------------------------------------------------------------------");
};

export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];
