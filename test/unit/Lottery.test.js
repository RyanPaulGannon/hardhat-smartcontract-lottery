const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, network, ethers } = require("hardhat")
const { check } = require("prettier")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Test", () => {
      let lottery, lotteryEntranceFee, deployer, interval
      const chainId = network.config.chainId

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        lottery = await ethers.getContract("Lottery", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        lotteryEntranceFee = await lottery.getEntranceFee()
        interval = await lottery.getInterval()
      })

      describe("Constructor", () => {
        it("Initializes the Lottery correctly", async () => {
          // Ideally the tests should have only one "assert" per "it"
          const lotteryState = await lottery.getLotteryState()
          const interval = await lottery.getInterval()
          const gasLane = await lottery.getGasLane()
          const callbackGasLimit = await lottery.getCallbackGasLimit()
          assert.equal(lotteryState.toString(), "0")
          assert.equal(interval.toString(), networkConfig[chainId]["interval"])
          assert.equal(gasLane.toString(), networkConfig[chainId]["gasLane"])
          assert.equal(callbackGasLimit, networkConfig[chainId]["callbackGasLimit"])
        })
      })

      describe("Enter Lottery", () => {
        it("Reverts if you don't pay enough", async () => {
          await expect(lottery.enterLottery()).to.be.revertedWith("Lottery__NotEnoughETH")
        })
        it("Records players when they enter", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          const playerFromContract = await lottery.getPlayer(0)
          assert.equal(playerFromContract, deployer)
        })
        it("Emits event on enter", async () => {
          await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.be.emit(
            lottery,
            "EnterLottery"
          )
        })
        it("Doesn't allow entry whilst calculating", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          // Now, we need to pretend to be Chainlink Keeper
          await lottery.performUpkeep([])
          await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.be.revertedWith(
            "Lottery__LotteryNotOpen"
          )
        })
      })

      describe("Check Upkeep", () => {
        it("Returns false if people haven't sent ETH", async () => {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          // Simulate calling the transaction to see how it will respond
          // await lottery.callStatic.checkUpkeep([])
          // Extrapolate the upkeepNeeded bool
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
          // As its a bool, it must equal false to pass
          assert(!upkeepNeeded)
        })
        it("Returns false if the lottery isn't open", async () => {
          // Enter the lottery and pass a fee
          await lottery.enterLottery({ value: lotteryEntranceFee })
          // Speed up the interval time for testing purposes
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          // Execute the "performUpkeep" method and pass empty params
          await lottery.performUpkeep([])
          // Declare lotteryState as the lotteryState
          let lotteryState = await lottery.getLotteryState()
          // Declare "upkeepNeeded"
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
          // Check for truth
          assert.equal(lotteryState.toString(), "1")
          assert.equal(upkeepNeeded, false)
        })
        it("Returns false if enough time hasn't passed", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
          assert(!upkeepNeeded)
        })
        it("Returns true if enough time has passed, has players, ETH and is open", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
          assert(upkeepNeeded)
        })
      })
    })
