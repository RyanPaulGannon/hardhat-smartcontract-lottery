import { BigNumber } from "ethers"
import { assert, expect } from "chai"
import { Lottery } from "../../typechain-types"
import { network, ethers, getNamedAccounts } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"

// These tests are for running on a testnet
// Before testing, we need to check what kind of network we're on

developmentChains.includes(network.name)
    ? // If we are running on a local network, we can skip these tests. If we're on a development chain, run the tests
      describe.skip
    : describe("Lottery Staging Test", () => {
          let lottery: Lottery
          let entranceFee: BigNumber
          let deployer: string

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              // No need for fixtures because the contract should already be deployed
              lottery = await ethers.getContract("Lottery", deployer)
              entranceFee = await lottery.getEntranceFee()
          })

          describe("Fulfill Random Words", () => {
              it("Works with a live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  console.log("Setting up the test...")
                  // Enter the lottery
                  const startingTimeStamp = await lottery.getLastestTimeStamp()
                  const accounts = await ethers.getSigners()
                  // Setup the listener before entering the lottery
                  // Just incase the blockchain moves real fast

                  await new Promise<void>(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("Winner Picked, event fired!")
                          try {
                              // Add asserts in here
                              const recentWinner = await lottery.getRecentWinner()
                              const lotteryState = await lottery.getLotteryState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await lottery.getLastestTimeStamp()

                              // This will revert because there won't be an object at 0
                              await expect(lottery.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(lotteryState.toString(), "0")
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  // They should get there entrance fee back as they are the only ones who've entered the lottery
                                  winnerStartingBalance.add(entranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      // Enter the lottery
                      console.log("Entering the lottery...")
                      const tx = await lottery.enterLottery({ value: entranceFee })
                      await tx.wait(2)
                      console.log("Waiting...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      // This code won't complete until the listener has finished
                  })
              })
          })
      })
