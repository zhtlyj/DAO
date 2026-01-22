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
  const contractAddress = DAO_INFO.addresses[network];

  if (!contractAddress) {
    throw new Error(`Contract address not found for network: ${network}`);
  }

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
  return network.name || 'unknown';
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

