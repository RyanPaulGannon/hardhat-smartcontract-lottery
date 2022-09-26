export interface networkConfigItem {
  name?: string
  vrfCoordinatorV2?: string
  entranceFee?: string
  gasLane?: string
  callbackGasLimit?: string
  subscriptionId?: string
  interval?: string
}

export interface networkConfigInfo {
  [key: number]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
  5: {
    name: "goerli",
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    entranceFee: "100000000000000000",
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    callbackGasLimit: "500000",
    subscriptionId: "2501",
    interval: "30",
  },
  31337: {
    name: "hardhat",
    entranceFee: "100000000000000000",
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    callbackGasLimit: "500000",
    interval: "30",
  },
}

export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
