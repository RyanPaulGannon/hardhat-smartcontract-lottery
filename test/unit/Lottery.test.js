const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

// These test only need to run on a local network
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
          const lotteryEntranceFee = await lottery.getEntranceFee()
          assert.equal(lotteryState.toString(), "0")
          assert.equal(interval.toString(), networkConfig[chainId]["interval"])
          assert.equal(gasLane.toString(), networkConfig[chainId]["gasLane"])
          assert.equal(callbackGasLimit, networkConfig[chainId]["callbackGasLimit"])
          assert.equal(lotteryEntranceFee.toString(), networkConfig[chainId]["entranceFee"])
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
      describe("Perform Upkeep", () => {
        it("Can only run if checkUpkeep is true", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const tx = await lottery.performUpkeep([])
          assert(tx)
        })
        it("Reverts when checkUpkeep is false", async () => {
          expect(lottery.performUpkeep([])).to.be
            .revertedWith(`Lottery__UpkeepNotNeeded(address(this).balance,
          s_players.length,
          uint256(s_lotteryState)`)
        })
        it("Updates the state, emits an event and calls the vrf coordinator", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const txReponse = await lottery.performUpkeep([])
          const txReceipt = await txReponse.wait(1)
          // If we do events[0], it will send out the uint256 requestID from i_vrfcoordinator.requestRandomWords, events[1] will be the emit
          const requestId = await txReceipt.events[1].args.requestId
          const lotteryState = await lottery.getLotteryState()
          assert(requestId.toNumber() > 0)
          assert(lotteryState.toString() == 1)
        })
      })

      describe("Fulfill Random Words", () => {
        // This says that before we test Fulfill Random Words, we want someone to have entered the lottery, increased the time and a block to have been mined
        beforeEach(async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
        })
        it("Can only be called after perform", async () => {
          // The following takes in a requestId and an address as parameters
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
          ).to.be.revertedWith("nonexistent request")
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
          ).to.be.revertedWith("nonexistent request")
        })
        it("Picks a winner, resets the lottery and sends the money", async () => {
          // Need to add more fake players to the lottery because
          const additionalEntrants = 3
          const startingAccountIndex = 1
          const accounts = await ethers.getSigners() // A Signer in Ethers.js is an object that represents an Ethereum account. It's used to send transactions to contracts and other accounts. Here we're getting a list of the accounts in the node we're connected to, which in this case is Hardhat Network, and only keeping the first and second ones.
          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            // Loop and connect the lottery contract to the new accounts and have them enter the lottery
            lottery = lottery.connect(accounts[i])
            await lottery.enterLottery({ value: lotteryEntranceFee })
          }
          // Keep note of starting timestamp
          const startingTimeStamp = await lottery.getLastestTimeStamp()

          // Need to performUpkeep which will mock being Chainlink Keepers
          // This will then call fulfillRandomWords() and mock being the Chainlink VRF
          // We will have to wait for the fulfillRandomWords() to be called and simulate it
          await new Promise(async (resolve, reject) => {
            // Once the "WinnerPicked" event is trigger, then we want to do something
            lottery.once("WinnerPicked", async () => {
              try {
                // const recentWinner = await lottery.getRecentWinner()
                const lotteryState = await lottery.getLotteryState()
                const endingTimeStamp = await lottery.getLastestTimeStamp()
                const numPlayers = await lottery.getNumberOfPlayers()
                const winnerBalance = await accounts[1].getBalance()
                // Lottery is reset and so should the players array
                assert.equal(numPlayers.toString(), "0")
                // State of the lottery post reset should be OPEN = 0
                assert.equal(lotteryState.toString(), "0")
                // This is saying that the winning balance should be the money that the winner put in, plus the rest of the money that the other players put in
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance
                    .add(lotteryEntranceFee.mul(additionalEntrants).add(lotteryEntranceFee))
                    .toString()
                )
                assert(endingTimeStamp > startingTimeStamp)
              } catch (e) {
                reject(e)
              }
              resolve()
            })
            // Set up the listener
            // This will fire the event, the listener will pick it up and resolve
            const tx = await lottery.performUpkeep("0x")
            const txReceipt = await tx.wait(1)
            const startingBalance = await accounts[1].getBalance()
            // Once the below is called, it should emit a WinnerPicked event
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              lottery.address
            )
          })
        })
      })
    })
