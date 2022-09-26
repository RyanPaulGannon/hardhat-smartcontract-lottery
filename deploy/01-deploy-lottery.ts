import verify from "../utils/verify"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"

const FUND_SUB_AMOUNT = "1000000000000000000000"

const deployLottery: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network, ethers } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = 31337
  let vrfCoordinatorV2Address: string | undefined, subscriptionId: string | undefined

  if (chainId == 31337) {
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    const transactionReponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionReponse.wait(1)
    subscriptionId = transactionReceipt.events[0].args.subId
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_SUB_AMOUNT)
  } else {
    vrfCoordinatorV2Address = networkConfig[network.config.chainId!]["vrfCoordinatorV2"]
    subscriptionId = networkConfig[network.config.chainId!]["subscriptionId"]
  }
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS

  log("----------------------------------------------------")

  const entranceFee = networkConfig[chainId]["entranceFee"]
  const gasLane = networkConfig[chainId]["gasLane"]
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
  const interval = networkConfig[chainId]["interval"]

  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ]
  const lottery = await deploy("Lottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations || 1,
  })

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying ...")
    await verify(lottery.address, args)
  }
  log("--------------------")
}

export default deployLottery
deployLottery.tags = ["all", "lottery"]
