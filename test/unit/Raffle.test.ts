import { network, getNamedAccounts, deployments, ethers } from "hardhat";
import { devChains, networkConfig } from "../../helper-hardhat-config";
import { assert, expect } from "chai";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

!devChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", async () => {
          let raffle: Raffle;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          let entranceFee: bigint;
          let deployer: string;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);

              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer,
              );
              raffle = await ethers.getContract("Raffle", deployer);
              entranceFee = await raffle.getEntranceFee();
          });

          describe("constructor", async () => {
              it("initializes the raffle contract correctly", async () => {
                  assert.equal(await raffle.getRaffleState(), 0n);
                  assert.equal(
                      (await raffle.getInterval()).toString(),
                      networkConfig[network.name].interval,
                  );
                  assert.equal(
                      await raffle.getEntranceFee(),
                      networkConfig[network.name].entranceFee,
                  );
              });
          });

          describe("enterRaffle", async () => {
              it("revert if you don't pay enough entrance fee", async () => {
                  await expect(
                      raffle.enterRaffle({
                          value: ethers.parseEther("0.009"),
                      }),
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughEthEntered",
                  );
              });

              it("records players when they enter", async () => {
                  await raffle.enterRaffle({
                      value: entranceFee,
                  });
                  await raffle.enterRaffle({
                      value: entranceFee,
                  });

                  assert.equal(await raffle.getPlayer(0), deployer);
                  assert.equal(await raffle.getNumberOfPlayers(), 2n);
              });

              it("emits event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: entranceFee }))
                      .to.emit(raffle, "RaffleEnter")
                      .withArgs(deployer);
              });
          });
      });
