const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks.js")

async function mint() {
    const basicNft = await ethers.getContract("BasicNft")
    console.log("Minting NFT...")
    const tx = await basicNft.mintNft()
    const txReceipt = await tx.wait(1)
    const tokenId = txReceipt.logs[0].args.tokenId
    console.log(`Got TokenID: ${tokenId}`)
    console.log(`NFT Address: ${basicNft.target}`)

    if (network.config.chainId == "31337") {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
