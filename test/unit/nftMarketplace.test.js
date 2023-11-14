const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.scip
    : describe("NftMarketplace Unit Test", async function () {
          let nftMarketplace, nftTest, accounts, deployer, buyer
          const chainId = network.config.chainId

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              buyer = accounts[1]
              await deployments.fixture("all")
              nftMarketplace = await ethers.getContract("NftMarketplace", deployer)
              nftTest = await ethers.getContract("BasicNft", deployer)
              await nftTest.mintNft()
              await nftTest.approve(nftMarketplace.target, 0)
          })

          describe("listItem function", function () {
              it("lists item", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  const result = await nftMarketplace.getListing(nftTest.target, 0)
                  assert.equal(result[0], 108n)
                  assert.equal(result[1], deployer.address)
              })

              it("emits event ItemListed", async () => {
                  await expect(nftMarketplace.listItem(nftTest.target, 0, 108)).to.emit(
                      nftMarketplace,
                      "ItemListed",
                  )
              })

              it("reverts if item already listed", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await expect(
                      nftMarketplace.listItem(nftTest.target, 0, 108),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed")
              })
          })
          describe("buyItem function", function () {
              it("allows to buy nft", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await nftMarketplace.connect(buyer).buyItem(nftTest.target, 0, { value: 108 })
                  assert.equal(await nftTest.ownerOf(0), buyer.address)
              })
              it("removes item from list after selling", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await nftMarketplace.connect(buyer).buyItem(nftTest.target, 0, { value: 108 })
                  const result = await nftMarketplace.getListing(nftTest.target, 0)
                  assert.equal(result[0], 0n)
              })
              it("adds proceed to seller", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await nftMarketplace.connect(buyer).buyItem(nftTest.target, 0, { value: 108 })
                  assert.equal(await nftMarketplace.getProceeds(deployer.address), 108n)
              })
              it("emits ItemBought event", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await expect(
                      nftMarketplace.connect(buyer).buyItem(nftTest.target, 0, { value: 108 }),
                  ).to.emit(nftMarketplace, "ItemBought")
              })
              it("reverts if price is not enough", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await expect(
                      nftMarketplace.connect(buyer).buyItem(nftTest.target, 0, { value: 100 }),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet")
              })
          })

          describe("cancelListing function", function () {
              it("deletes item from list", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  let result = await nftMarketplace.getListing(nftTest.target, 0)
                  assert.equal(result[0], 108n)
                  await nftMarketplace.cancelListing(nftTest.target, 0)
                  result = await nftMarketplace.getListing(nftTest.target, 0)
                  assert.equal(result[0], 0n)
              })
              it("emits ItemCanceled event", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await expect(nftMarketplace.cancelListing(nftTest.target, 0)).to.emit(
                      nftMarketplace,
                      "ItemCanceled",
                  )
              })
              it("reverts if not owner", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await expect(
                      nftMarketplace.connect(buyer).cancelListing(nftTest.target, 0),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
          })
          describe("updateListing function", function () {
              it("updates items price", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  let result = await nftMarketplace.getListing(nftTest.target, 0)
                  assert.equal(result[0], 108n)
                  await nftMarketplace.updateListing(nftTest.target, 0, 1008)
                  result = await nftMarketplace.getListing(nftTest.target, 0)
                  assert.equal(result[0], 1008n)
              })
              it("emits ItemListed event", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await expect(nftMarketplace.updateListing(nftTest.target, 0, 1008)).to.emit(
                      nftMarketplace,
                      "ItemListed",
                  )
              })
              it("reverts if not listed", async () => {
                  await expect(
                      nftMarketplace.updateListing(nftTest.target, 0, 1008),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
          })
          describe("withdrawProceeds function", function () {
              it("withdraws proceeds to seller", async () => {
                  await nftMarketplace.listItem(nftTest.target, 0, 108)
                  await nftMarketplace.connect(buyer).buyItem(nftTest.target, 0, { value: 108 })
                  let result = await nftMarketplace.getProceeds(deployer.address)
                  assert.equal(result, 108n)
                  await expect(nftMarketplace.withdrawProceeds()).to.changeEtherBalances(
                      [nftMarketplace.target, deployer.address],
                      [-108, 108],
                  )
                  result = await nftMarketplace.getProceeds(deployer.address)
                  assert.equal(result, 0n)
              })
              it("reverts if no proceeds", async () => {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceeds",
                  )
              })
          })
      })
