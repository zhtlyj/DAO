import { ethers } from 'ethers';
import DAO_ABI from '../contracts/DAO.abi.json';
import DAO_INFO from '../contracts/DAO.json';

/**
 * 获取 DAO 合约实例
 * @param {ethers.BrowserProvider} provider - ethers provider
 * @param {string} network - 网络名称 (hardhat, localhost, sepolia 等)
 * @returns {Promise<ethers.Contract>} 合约实例
 */
export async function getDAOContract(provider, network = 'hardhat') {
  if (!provider) {
    throw new Error('Provider is required');
  }

  const signer = await provider.getSigner();
  
  // 如果网络名称不在地址列表中，尝试使用其他网络地址
  let contractAddress = DAO_INFO.addresses[network];
  if (!contractAddress) {
    console.warn(`网络 ${network} 的合约地址未找到，尝试使用其他网络地址`);
    // 优先尝试 localhost，然后尝试 hardhat
    contractAddress = DAO_INFO.addresses['localhost'] || DAO_INFO.addresses['hardhat'];
    if (contractAddress) {
      console.warn(`使用 ${contractAddress === DAO_INFO.addresses['localhost'] ? 'localhost' : 'hardhat'} 网络的合约地址`);
    }
  }

  if (!contractAddress) {
    const availableNetworks = Object.keys(DAO_INFO.addresses).join(', ');
    throw new Error(
      `合约地址未找到。当前网络: ${network}，可用网络: ${availableNetworks}。请确保已运行 npm run deploy:local 部署合约到 localhost 网络。`
    );
  }

  console.log(`使用合约地址: ${contractAddress} (网络: ${network})`);
  return new ethers.Contract(contractAddress, DAO_ABI, signer);
}

/**
 * 检查是否已连接钱包
 * @returns {boolean}
 */
export function isWalletConnected() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * 连接钱包
 * @returns {Promise<ethers.BrowserProvider>}
 */
export async function connectWallet() {
  if (!isWalletConnected()) {
    throw new Error('MetaMask or other Web3 wallet is not installed');
  }

  try {
    // 请求连接账户
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // 创建 provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    return provider;
  } catch (error) {
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * 获取当前网络
 * @param {ethers.BrowserProvider} provider
 * @returns {Promise<string>}
 */
export async function getNetwork(provider) {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // 处理网络名称，根据 chainId 和 RPC URL 判断
  if (network.name === 'unknown' || !network.name) {
    // Hardhat 本地网络 chainId 通常是 31337 或 1337
    if (chainId === 31337 || chainId === 1337) {
      // 检查是否是 localhost 网络（通过 provider 的 connection 属性）
      // 如果是连接到 localhost:8545，优先使用 localhost
      try {
        const url = provider.connection?.url || provider._getConnection?.()?.url || '';
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          return 'localhost';
        }
      } catch (e) {
        // 如果无法获取 URL，继续使用默认逻辑
      }
      // 默认返回 hardhat（用于内存网络）
      return 'hardhat';
    }
    // 其他常见测试网络
    if (chainId === 11155111) return 'sepolia';
    if (chainId === 5) return 'goerli';
    if (chainId === 1) return 'mainnet';
    // 默认返回 hardhat 用于本地开发
    return 'hardhat';
  }
  
  // 如果网络名称存在，直接返回
  // 但如果是 'unknown' 且 chainId 是 1337，优先检查是否是 localhost
  if (network.name === 'unknown' && (chainId === 31337 || chainId === 1337)) {
    try {
      const url = provider.connection?.url || provider._getConnection?.()?.url || '';
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        return 'localhost';
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  return network.name;
}

/**
 * 提案状态枚举
 */
export const ProposalStatus = {
  Pending: 0,
  Active: 1,
  Passed: 2,
  Rejected: 3,
  Closed: 4
};

/**
 * 投票类型枚举
 */
export const VoteType = {
  Upvote: 0,
  Downvote: 1,
  Abstain: 2
};

/**
 * 格式化提案状态
 * @param {number} status
 * @returns {string}
 */
export function formatProposalStatus(status) {
  const statusMap = {
    0: '待审核',
    1: '进行中',
    2: '已通过',
    3: '已拒绝',
    4: '已关闭'
  };
  return statusMap[status] || '未知';
}

/**
 * 格式化投票类型
 * @param {number} voteType
 * @returns {string}
 */
export function formatVoteType(voteType) {
  const voteMap = {
    0: '支持',
    1: '反对',
    2: '弃权'
  };
  return voteMap[voteType] || '未知';
}

/**
 * 创建提案（调用合约）
 * @param {ethers.Contract} contract - DAO 合约实例
 * @param {string} title - 提案标题
 * @param {string} description - 提案描述
 * @param {number} startTime - 开始时间（Unix 时间戳）
 * @param {number} endTime - 结束时间（Unix 时间戳）
 * @returns {Promise<ethers.ContractTransactionReceipt>}
 */
export async function createProposalOnChain(contract, title, description, startTime, endTime) {
  if (!contract) {
    throw new Error('Contract instance is required');
  }

  try {
    const tx = await contract.createProposal(title, description, startTime, endTime);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    throw new Error(`创建提案失败: ${error.message}`);
  }
}

/**
 * 投票（调用合约）
 * @param {ethers.Contract} contract - DAO 合约实例
 * @param {number} proposalId - 提案 ID
 * @param {number} voteType - 投票类型（0=支持, 1=反对, 2=弃权）
 * @returns {Promise<ethers.ContractTransactionReceipt>}
 */
export async function voteOnChain(contract, proposalId, voteType) {
  if (!contract) {
    throw new Error('Contract instance is required');
  }

  try {
    const tx = await contract.vote(proposalId, voteType);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    throw new Error(`投票失败: ${error.message}`);
  }
}

/**
 * 修改投票（调用合约）
 * @param {ethers.Contract} contract - DAO 合约实例
 * @param {number} proposalId - 提案 ID
 * @param {number} voteType - 新的投票类型
 * @returns {Promise<ethers.ContractTransactionReceipt>}
 */
export async function changeVoteOnChain(contract, proposalId, voteType) {
  if (!contract) {
    throw new Error('Contract instance is required');
  }

  try {
    const tx = await contract.changeVote(proposalId, voteType);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    throw new Error(`修改投票失败: ${error.message}`);
  }
}

/**
 * 获取提案信息（从合约读取）
 * @param {ethers.Contract} contract - DAO 合约实例
 * @param {number} proposalId - 提案 ID
 * @returns {Promise<Object>}
 */
export async function getProposalFromChain(contract, proposalId) {
  if (!contract) {
    throw new Error('Contract instance is required');
  }

  try {
    const proposal = await contract.getProposal(proposalId);
    return {
      id: proposal.id.toString(),
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.proposer,
      startTime: Number(proposal.startTime),
      endTime: Number(proposal.endTime),
      upvotes: Number(proposal.upvotes),
      downvotes: Number(proposal.downvotes),
      abstains: Number(proposal.abstains),
      status: Number(proposal.status)
    };
  } catch (error) {
    throw new Error(`获取提案失败: ${error.message}`);
  }
}

/**
 * 获取用户投票（从合约读取）
 * @param {ethers.Contract} contract - DAO 合约实例
 * @param {number} proposalId - 提案 ID
 * @param {string} voterAddress - 投票者地址
 * @returns {Promise<Object>}
 */
export async function getUserVoteFromChain(contract, proposalId, voterAddress) {
  if (!contract) {
    throw new Error('Contract instance is required');
  }

  try {
    const result = await contract.getUserVote(proposalId, voterAddress);
    return {
      voteType: Number(result.voteType),
      voted: result.voted
    };
  } catch (error) {
    throw new Error(`获取用户投票失败: ${error.message}`);
  }
}

/**
 * 获取提案总数（从合约读取）
 * @param {ethers.Contract} contract - DAO 合约实例
 * @returns {Promise<number>}
 */
export async function getProposalCountFromChain(contract) {
  if (!contract) {
    throw new Error('Contract instance is required');
  }

  try {
    const count = await contract.getProposalCount();
    return Number(count);
  } catch (error) {
    throw new Error(`获取提案总数失败: ${error.message}`);
  }
}

