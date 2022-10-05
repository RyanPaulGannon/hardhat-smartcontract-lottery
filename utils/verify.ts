import { run } from "hardhat"

async function verify(address: string, args: any[]) {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: address,
            constructorArguments: args,
        })
    } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Already verified")
        } else {
            console.error(error)
        }
    }
}

export default verify
