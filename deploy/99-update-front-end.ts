import fs from "fs"
import { ethers, network } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"

const FRONT_END_ABI_FILE = "../next-smartcontract-lottery/constants/abi.json"
const FRONT_END_ADDRESSES_FILE = "../next-smartcontract-lottery/constants/contractAddresses.json"

const updateFrontEnd: DeployFunction = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end")
    console.log("----------------------------------------------------")
    updateABI()
    updateContractAddresses()
  }
}

const updateABI = async () => {
  const lottery = await ethers.getContract("Lottery")
  fs.writeFileSync(FRONT_END_ABI_FILE, lottery.interface.format(ethers.utils.FormatTypes.json))
}

const updateContractAddresses = async () => {
  const lottery = await ethers.getContract("Lottery")
  const chainId = network.config.chainId!.toString()
  // This will read the empty object
  const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
  if (chainId in currentAddresses)
    if (!currentAddresses[chainId].includes(currentAddresses)) {
      // We check here if the address is already in the file (relative to each chainId, and push if not)
      currentAddresses[chainId].push(lottery.address)
    }
  {
    currentAddresses[chainId] = [lottery.address]
  }
  // Write the addresses to the file
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}
export default updateFrontEnd
