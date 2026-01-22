# DAO Smart Contracts

基于 Hardhat 的校园 DAO 治理系统智能合约。

## 项目结构

```
HardHat/
├── contracts/          # 智能合约源码
│   └── DAO.sol        # DAO 治理合约
├── scripts/            # 部署脚本
│   └── deploy.js       # 部署脚本
├── test/               # 测试文件
│   └── DAO.test.js     # DAO 合约测试
├── hardhat.config.js   # Hardhat 配置文件
├── package.json        # 项目依赖
└── README.md          # 项目说明
```

## 安装依赖

```bash
cd backend/HardHat
npm install
```

## 编译合约

```bash
npm run compile
```

## 运行测试

```bash
npm run test
```

## 部署合约

### 本地 Hardhat 网络

```bash
# 启动本地节点（新终端）
npm run node

# 部署合约（另一个终端）
npm run deploy:local
```

### 本地网络（localhost）

```bash
npm run deploy:local
```

### 导出 ABI 到前端

部署合约后，ABI 和合约地址会自动导出到 `exports/` 目录和 `frontend/src/contracts/` 目录。

也可以手动导出：

```bash
npm run export-abi
```

导出的文件：
- `exports/DAO.abi.json` - 合约 ABI
- `exports/DAO.address.json` - 各网络的合约地址
- `exports/DAO.json` - 完整的合约信息
- `frontend/src/contracts/DAO.abi.json` - 前端使用的 ABI
- `frontend/src/contracts/DAO.json` - 前端使用的完整信息

## 合约功能

### DAO.sol

主要的治理合约，包含以下功能：

1. **创建提案**
   - 用户可以创建新的治理提案
   - 设置提案标题、描述、开始和结束时间

2. **投票**
   - 支持三种投票类型：支持、反对、弃权
   - 防止重复投票
   - 允许修改投票（如果提案仍在进行中）

3. **提案状态管理**
   - 提案状态：待审核、进行中、已通过、已拒绝、已关闭
   - 仅所有者可以更新提案状态

4. **查询功能**
   - 获取提案信息
   - 获取用户投票记录
   - 获取提案总数

## 环境变量

创建 `.env` 文件（可选，用于测试网络部署）：

```env
# 私钥（用于部署和验证）
PRIVATE_KEY=your_private_key_here

# RPC URL（测试网络）
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key

# Etherscan API Key（用于验证合约）
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 网络配置

在 `hardhat.config.js` 中配置网络：

- `hardhat`: 本地 Hardhat 网络（默认）
- `localhost`: 本地节点（如 Ganache）
- 其他测试网络（Sepolia, Mumbai 等）

## 测试

运行所有测试：

```bash
npm run test
```

运行特定测试文件：

```bash
npx hardhat test test/DAO.test.js
```

## 验证合约

部署到测试网络后，可以验证合约：

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 开发建议

1. 在修改合约前，先运行测试确保现有功能正常
2. 使用 `hardhat node` 启动本地节点进行测试
3. 部署前检查 `hardhat.config.js` 中的网络配置
4. 使用 `.env` 文件管理敏感信息，不要提交到 Git

## 许可证

MIT

