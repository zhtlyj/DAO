# 快速开始 - 部署合约到 localhost

## 为什么需要 localhost 网络？

虽然 `hardhat` 和 `localhost` 配置相同（chainId: 1337），但：
- **hardhat 网络**：脚本内部的内存网络，脚本结束后数据丢失，前端无法连接
- **localhost 网络**：连接到运行中的 `hardhat node`，数据持久化，前端可以通过 MetaMask 连接

## 快速部署步骤

### 方法 1：使用一键脚本（推荐）

```bash
# 1. 启动 Hardhat 节点（保持运行）
cd backend/HardHat
npm run node

# 2. 在另一个终端运行部署脚本
cd backend/HardHat
npm run deploy:local
```

### 方法 2：手动部署

```bash
# 1. 启动 Hardhat 节点（终端 1）
cd backend/HardHat
npm run node

# 2. 部署合约（终端 2）
cd backend/HardHat
npx hardhat run scripts/deploy.js --network localhost

# 3. 导出 ABI（终端 2）
cd backend/HardHat
npm run export-abi
```

## 验证部署

部署完成后，检查：

1. **检查地址文件**：`backend/HardHat/exports/DAO.address.json` 应该包含 `localhost` 地址
2. **检查前端文件**：`frontend/src/contracts/DAO.json` 应该包含 `localhost` 地址
3. **测试合约**：在前端尝试提交提案，应该能正常连接

## 常见问题

### Q: 为什么部署后前端还是找不到合约？
A: 确保：
- Hardhat 节点正在运行（`npm run node`）
- 使用 `--network localhost` 部署，而不是 `--network hardhat`
- MetaMask 连接到 `http://127.0.0.1:8545`，chainId: 1337

### Q: 可以同时使用 hardhat 和 localhost 吗？
A: 可以，但前端只能连接 localhost。hardhat 网络主要用于测试。

### Q: 重启 Hardhat 节点后合约会丢失吗？
A: 是的，需要重新部署。这是正常的，因为 localhost 是本地开发网络。

