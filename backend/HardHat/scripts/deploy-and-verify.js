const hre = require("hardhat");

/**
 * 部署合约并验证部署状态
 * 这个脚本会：
 * 1. 部署合约到指定网络
 * 2. 验证合约代码是否存在
 * 3. 测试合约方法是否可用
 */
async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 开始部署到 ${network} 网络...\n`);

  // 获取部署账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 使用账户部署合约:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", hre.ethers.formatEther(balance), "ETH\n");

  // 部署 DAO 合约
  console.log("📦 正在部署 DAO 合约...");
  const DAO = await hre.ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();

  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("✅ DAO 合约已部署到:", daoAddress);

  // 验证合约代码
  console.log("\n🔍 验证合约部署...");
  const code = await hre.ethers.provider.getCode(daoAddress);
  if (!code || code === "0x") {
    console.error("❌ 错误：合约地址没有代码！");
    process.exit(1);
  }
  console.log("✅ 合约代码验证通过，代码长度:", code.length);

  // 测试合约方法
  console.log("\n🧪 测试合约方法...");
  try {
    const count = await dao.getProposalCount();
    console.log("✅ getProposalCount() 测试通过，当前提案数量:", count.toString());
  } catch (error) {
    console.error("❌ getProposalCount() 测试失败:", error.message);
    process.exit(1);
  }

  // 等待几个区块确认（用于测试网络）
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ 等待区块确认...");
    await dao.deploymentTransaction().wait(5);
  }

  console.log("\n✅ 部署完成！");
  console.log("📍 合约地址:", daoAddress);
  console.log("🌐 网络:", network);
  
  // 保存合约地址到文件
  const fs = require("fs");
  const path = require("path");
  const exportDir = path.join(__dirname, "../exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const addressPath = path.join(exportDir, "DAO.address.json");
  let addresses = {};
  if (fs.existsSync(addressPath)) {
    addresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));
  }
  
  addresses[network] = daoAddress;
  fs.writeFileSync(addressPath, JSON.stringify(addresses, null, 2));
  console.log("💾 合约地址已保存到:", addressPath);
  
  // 读取编译后的合约文件以获取 ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/DAO.sol/DAO.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;
  
  // 创建完整的合约信息
  const contractInfo = {
    abi: abi,
    addresses: addresses,
    contractName: "DAO",
    network: network
  };
  
  // 更新前端合约文件
  const frontendDir = path.join(__dirname, "../../../frontend/src/contracts");
  const frontendRoot = path.join(__dirname, "../../../frontend");
  if (fs.existsSync(frontendRoot)) {
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    // 更新前端合约信息文件
    const frontendContractPath = path.join(frontendDir, "DAO.json");
    fs.writeFileSync(frontendContractPath, JSON.stringify(contractInfo, null, 2));
    console.log("📤 前端合约地址已更新到:", frontendContractPath);
    
    // 同时更新 ABI 文件
    const frontendABIPath = path.join(frontendDir, "DAO.abi.json");
    fs.writeFileSync(frontendABIPath, JSON.stringify(abi, null, 2));
    console.log("📤 前端 ABI 已更新到:", frontendABIPath);
  } else {
    console.log("⚠️  前端目录不存在，跳过前端文件更新");
  }

  console.log("\n🎉 所有步骤完成！");
  console.log("\n📋 下一步：");
  console.log("1. 确保 Hardhat 节点正在运行 (npm run node)");
  console.log("2. 确保 MetaMask 连接到 localhost:8545, chainId: 1337");
  console.log("3. 在前端尝试提交提案\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败:", error);
    process.exit(1);
  });

