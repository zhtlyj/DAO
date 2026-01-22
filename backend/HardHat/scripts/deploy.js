const hre = require("hardhat");

async function main() {
  console.log("开始部署智能合约...");

  // 获取部署账户
  const [deployer] = await hre.ethers.getSigners();
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
  
  addresses[hre.network.name] = daoAddress;
  fs.writeFileSync(addressPath, JSON.stringify(addresses, null, 2));
  console.log("✅ 合约地址已保存到:", addressPath);
  
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

