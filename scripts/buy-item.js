const {network} = require("hardhat")
const {moveBlocks} = require("../utils/move-blocks.js")

const TOKEN_ID = 1
async function buyItem(){
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const listing = await nftMarketplace.getListing(basicNft.target,TOKEN_ID)
    const price = await listing.price
    const tx = await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {value:price})
    await tx.wait(1)
    console.log("Bought NFT!")
    if (network.config.chainId == "31337") {
        await moveBlocks (2, sleepAmount = 1000)
    }
}

buyItem()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })