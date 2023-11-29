const { ethers, network } = require("hardhat")
const {moveBlocks} = require("../utils/move-blocks.js")
const PRICE = ethers.parseEther("0.1")

async function mintAndList() {
    const basicNft = await ethers.getContract("BasicNft")
    console.log("Minting NFT...")
    let tx = await basicNft.mintNft()
    let txReceipt = await tx.wait(1)
    const tokenId = txReceipt.logs[0].args.tokenId
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    console.log("Approving NFT...")
    tx = await basicNft.approve(nftMarketplace.target, tokenId)
    await tx.wait(1)
    console.log("Listing NFT...")
    tx = await nftMarketplace.listItem(basicNft.target, tokenId, PRICE)
    await tx.wait(1)
    console.log("NFT Listed!")

    if (network.config.chainId == "31337") {
        await moveBlocks (2, sleepAmount = 1000)
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
