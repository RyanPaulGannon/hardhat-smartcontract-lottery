const { getNamedAccounts } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, logs } = deployments
  const { deployer } = await getNamedAccounts()

  const lottery = await deploy("Lottery")
}
