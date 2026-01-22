# 智能合约文件

此目录包含从 Hardhat 导出的智能合约 ABI 和地址信息。

## 文件说明

- `DAO.abi.json` - DAO 合约的 ABI（Application Binary Interface）
- `DAO.json` - 完整的合约信息（包含 ABI 和部署地址）

## 使用方式

```javascript
import DAO_ABI from './contracts/DAO.abi.json';
import DAO_INFO from './contracts/DAO.json';

// 使用 ethers.js 连接合约
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const daoContract = new ethers.Contract(
  DAO_INFO.addresses.hardhat, // 或 localhost, sepolia 等
  DAO_ABI,
  signer
);
```

## 更新合约

当合约重新部署后，运行以下命令更新文件：

```bash
cd backend/HardHat
npm run export-abi
```

