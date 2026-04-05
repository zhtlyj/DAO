const path = require("path");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
// 始终从本目录加载 .env（避免从仓库根目录执行时读不到 backend/HardHat/.env）
require("dotenv").config({ path: path.join(__dirname, ".env") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    sepolia: {
      // 公共 RPC 易拥堵导致 HeadersTimeout；可换 Alchemy/Infura 等在 .env 设 SEPOLIA_RPC_URL
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://ethereum-sepolia.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 180000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    // 如果需要验证合约，添加 API key
    // apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

