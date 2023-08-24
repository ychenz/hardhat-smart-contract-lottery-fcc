import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { devChains } from "../helper-hardhat-config";
import { ethers } from "hardhat";

// Example premium for Sepolia: https://docs.chain.link/vrf/v2/subscription/supported-networks#sepolia-testnet
const BASE_FEE = ethers.parseEther("0.25"); // 0.25 is the premium, It cost 0.25 LINK per request.
const GAS_PRICE_LINK = 1e9; // LINK per eth gas. Calculated value based on the gas price of the chain. Any number is good for mocking.

// Pre-deploy steps
const func: DeployFunction = async function ({
    deployments,
    getNamedAccounts,
    network,
}: HardhatRuntimeEnvironment) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    if (devChains.includes(network.name)) {
        log("Local network detected! Deploying Mocks ...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
        });
        log(`VRFCoordinatorV2Mock Mock deployed on network '${network.name}'!`);
        log("----------------------------------------------------------------");
    }
};

export default func;
func.tags = ["all", "mocks"];
