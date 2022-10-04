import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium as per Chainlink
const GAS_PRICE_LINK = 1e9 // This is a calculated value, based on the gas price of the chain. "Link per gas"

const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId
  const args = [BASE_FEE, GAS_PRICE_LINK]

  if (chainId == 31337) {
    log("Local network detected, deploying mocks ...")
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args,
    })
    log("Mocks deployed")
    log("----------------------------------------------------")
  }
}

export default deployMocks
deployMocks.tags = ["all", "mocks"]
