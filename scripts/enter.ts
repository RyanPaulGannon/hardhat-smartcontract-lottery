import { ethers } from "hardhat"
import "@nomiclabs/hardhat-ethers"

const enterLottery = async () => {
    const lottery = await ethers.getContract("Lottery")
    const entranceFee = await lottery.getEntranceFee()
    await lottery.enterLottery({ value: entranceFee + 1 })
    console.log("Entered!")
}

enterLottery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
