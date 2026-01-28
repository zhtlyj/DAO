const fs = require("fs");
const path = require("path");

/**
 * 导出 ABI 文件到前端可用的位置
 */
async function exportABI() {
  try {
    // 读取编译后的合约文件
    const artifactPath = path.join(__dirname, "../artifacts/contracts/DAO.sol/DAO.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // 提取 ABI
    const abi = artifact.abi;

    // 创建导出目录
    const exportDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 导出 ABI
    const abiPath = path.join(exportDir, "DAO.abi.json");
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log("✅ ABI 已导出到:", abiPath);

    // 读取合约地址（如果存在）
    const addressPath = path.join(exportDir, "DAO.address.json");
    let addresses = {};
    if (fs.existsSync(addressPath)) {
      addresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));
    }

    // 创建完整的合约信息文件（包含 ABI 和地址）
    const contractInfo = {
      abi: abi,
      addresses: addresses,
      contractName: "DAO",
      network: "hardhat"
    };

    const infoPath = path.join(exportDir, "DAO.json");
    fs.writeFileSync(infoPath, JSON.stringify(contractInfo, null, 2));
    console.log("✅ 合约信息已导出到:", infoPath);

    // 导出到前端目录（如果存在）
    // 从 backend/HardHat/scripts 到 frontend/src/contracts
    const frontendDir = path.join(__dirname, "../../../frontend/src/contracts");
    const frontendRoot = path.join(__dirname, "../../../frontend");
    
    if (fs.existsSync(frontendRoot)) {
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }

      // 复制 ABI 到前端
      fs.writeFileSync(
        path.join(frontendDir, "DAO.abi.json"),
        JSON.stringify(abi, null, 2)
      );

      // 复制合约信息到前端（包含最新的地址）
      fs.writeFileSync(
        path.join(frontendDir, "DAO.json"),
        JSON.stringify(contractInfo, null, 2)
      );

      console.log("✅ 已更新前端目录:", frontendDir);
      console.log("   合约地址:", JSON.stringify(addresses, null, 2));
    } else {
      console.log("⚠️  前端目录不存在，跳过前端文件更新");
      console.log("   查找路径:", frontendRoot);
    }

    console.log("\n导出完成！");
  } catch (error) {
    console.error("导出失败:", error);
    process.exit(1);
  }
}

exportABI();

