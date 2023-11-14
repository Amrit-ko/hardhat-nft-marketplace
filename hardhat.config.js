/** @type import('hardhat/config').HardhatUserConfig */
require("hardhat-contract-sizer")
require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()
require("hardhat-deploy")
require("@nomicfoundation/hardhat-ethers")
require("hardhat-deploy-ethers")
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key"
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia"
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "https://eth-sepolia"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key"
const REPORT_GAS = process.env.REPORT_GAS || false

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        localhost: {
            chainId: 31337,
            // gasPrice: 130000000000,
            blockConfirmations: 1,
        },
        hardhat: {
            chainId: 31337,
            // gasPrice: 130000000000,
            blockConfirmations: 1,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            saveDeployments: true,
            // blockConfirmations: 6,
            // gas: 6000000,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            saveDeployments: true,
            // blockConfirmations: 6,
            // gas: 6000000,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.19",
            },
            {
                version: "0.4.24",
            },
            {
                version: "0.6.6",
            },
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        sender: {
            default: 1,
        },
    },
    mocha: {
        timeout: 200000,
        exit: true,
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            sepolia: ETHERSCAN_API_KEY,
            goerli: ETHERSCAN_API_KEY,
        },
    },
    contractSizer: {
        runOnCompile: false,
        only: ["Raffle"],
    },
}
