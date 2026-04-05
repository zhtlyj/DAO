const hre = require("hardhat");

async function main() {
  console.log("开始部署智能合约...");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    const net = hre.network.name;
    if (net === "sepolia") {
      throw new Error(
        "未配置部署账户：请在 backend/HardHat/.env 中设置 PRIVATE_KEY（0x 开头的私钥），" +
          "并确认文件与 hardhat.config.js 同目录。勿将 .env 提交到 git。"
      );
    }
    throw new Error("无法获取部署账户（getSigners 为空）。");
  }

  console.log("使用账户部署合约:", deployer.address);
  console.log("账户余额:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 部署 DAO 合约
  const DAO = await hre.ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();

  await dao.waitForDeployment();

  const daoAddress = await dao.getAddress();
  console.log("DAO 合约已部署到:", daoAddress);

  // 等待几个区块确认（用于测试网络）
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("等待区块确认...");
    await dao.deploymentTransaction().wait(5);
  }

  console.log("\n部署完成！");
  console.log("合约地址:", daoAddress);
  console.log("网络:", hre.network.name);
  
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

  const frontendDir = path.join(__dirname, "../../../frontend/src/contracts");
  const frontendContractPath = path.join(frontendDir, "DAO.json");
  if (fs.existsSync(frontendContractPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(frontendContractPath, "utf8"));
      if (prev.addresses && typeof prev.addresses === "object") {
        addresses = { ...prev.addresses, ...addresses };
      }
    } catch (e) {
      console.warn("读取前端 DAO.json 地址合并时跳过:", e.message);
    }
  }

  addresses[hre.network.name] = daoAddress;
  fs.writeFileSync(addressPath, JSON.stringify(addresses, null, 2));
  console.log("✅ 合约地址已保存到:", addressPath);
  
  // 读取编译后的合约文件以获取 ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/DAO.sol/DAO.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;
  
  // 创建完整的合约信息
  const contractInfo = {
    abi: abi,
    addresses: addresses,
    contractName: "DAO",
    network: hre.network.name
  };
  
  // 更新前端合约文件
  const frontendRoot = path.join(__dirname, "../../../frontend");
  if (fs.existsSync(frontendRoot)) {
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    fs.writeFileSync(frontendContractPath, JSON.stringify(contractInfo, null, 2));
    console.log("✅ 前端合约地址已更新到:", frontendContractPath);
    
    // 同时更新 ABI 文件
    const frontendABIPath = path.join(frontendDir, "DAO.abi.json");
    fs.writeFileSync(frontendABIPath, JSON.stringify(abi, null, 2));
    console.log("✅ 前端 ABI 已更新到:", frontendABIPath);
  } else {
    console.log("⚠️  前端目录不存在，跳过前端文件更新");
  }
  
  // 如果配置了 Etherscan API key，可以验证合约
  // if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
  //   console.log("\n等待几秒后验证合约...");
  //   await new Promise(resolve => setTimeout(resolve, 20000));
  //   try {
  //     await hre.run("verify:verify", {
  //       address: daoAddress,
  //       constructorArguments: [],
  //     });
  //     console.log("合约验证成功！");
  //   } catch (error) {
  //     console.log("合约验证失败:", error.message);
  //   }
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

