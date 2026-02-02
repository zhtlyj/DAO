import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { transactionAPI } from '../services/api';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const { user } = useAuth();
  const { account, contract, provider } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      // 使用新的投票记录API端点
      const params = { page: 1, limit: 100 };
      
      const response = await transactionAPI.getAllVotes(params);
      const voteTransactions = response.data.data?.transactions || response.data.transactions || [];
      setTransactions(voteTransactions);
    } catch (error) {
      console.error('获取交易历史失败:', error);
      setError('获取交易历史失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 同步链上投票
  const syncChainVotes = async () => {
    if (!contract || !provider) {
      setError('请先连接钱包');
      return;
    }

    try {
      setSyncing(true);
      setError('');
      
      // 获取链上所有提案的投票记录
      // 这里需要遍历所有提案，获取每个提案的投票记录
      // 由于这是一个复杂操作，暂时显示提示信息
      alert('同步链上投票功能开发中，请稍后...');
      
      // TODO: 实现从链上同步投票记录到数据库的逻辑
      
    } catch (error) {
      console.error('同步链上投票失败:', error);
      setError('同步链上投票失败: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '/');
  };

  // 格式化交易哈希（显示前6位和后4位）
  const formatHash = (hash) => {
    if (!hash) return '-';
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // 格式化地址（显示前6位和后4位）
  const formatAddress = (address) => {
    if (!address) return '-';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 获取交易类型标签和样式
  const getTransactionTypeInfo = (tx) => {
    // 如果是创建提案
    if (tx.type === 'create_proposal') {
      return { label: '创建提案', icon: '📝', color: '#3b82f6' };
    }
    
    // 如果是投票
    const voteType = tx.details?.voteType || 'upvote';
    const voteMap = {
      'upvote': { label: '支持', icon: '👍', color: '#10b981' },
      'downvote': { label: '反对', icon: '👎', color: '#ef4444' },
      'abstain': { label: '弃权', icon: '➖', color: '#6b7280' }
    };
    return voteMap[voteType] || { label: voteType, icon: '❓', color: '#6b7280' };
  };

  // 计算Gas使用量（从字符串转换为数字）
  const getGasUsed = (tx) => {
    if (!tx.gasUsed) return 0;
    return typeof tx.gasUsed === 'string' ? parseInt(tx.gasUsed) : tx.gasUsed;
  };

  // 计算ETH消耗（优先使用transactionFee，否则计算gasUsed * gasPrice）
  const getEthConsumption = (tx) => {
    if (tx.transactionFee) {
      // transactionFee 可能是 wei 格式的字符串
      const fee = typeof tx.transactionFee === 'string' 
        ? parseFloat(tx.transactionFee) 
        : tx.transactionFee;
      return ethers.formatEther(fee.toString());
    }
    
    // 如果没有transactionFee，尝试计算
    if (tx.gasUsed && tx.gasPrice) {
      const gasUsed = typeof tx.gasUsed === 'string' ? BigInt(tx.gasUsed) : BigInt(tx.gasUsed);
      const gasPrice = typeof tx.gasPrice === 'string' ? BigInt(tx.gasPrice) : BigInt(tx.gasPrice);
      const total = gasUsed * gasPrice;
      return ethers.formatEther(total.toString());
    }
    
    return '0';
  };

  // 统计信息
  const totalTransactions = transactions.length;
  const totalGas = transactions.reduce((sum, tx) => sum + getGasUsed(tx), 0);
  const totalEth = transactions.reduce((sum, tx) => {
    const eth = parseFloat(getEthConsumption(tx));
    return sum + (isNaN(eth) ? 0 : eth);
  }, 0);
  const avgEth = totalTransactions > 0 ? totalEth / totalTransactions : 0;

  return (
    <Layout>
      <div className="transaction-history-page">
        <div className="transaction-header">
          <div>
            <h1>交易记录与Gas消耗</h1>
            <p className="page-subtitle">查看所有投票和提案创建记录及其消耗的Gas和ETH</p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn sync-btn" 
              onClick={syncChainVotes}
              disabled={syncing}
            >
              <span className="btn-icon">🔄</span>
              {syncing ? '同步中...' : '同步链上投票'}
            </button>
            <button 
              className="action-btn refresh-btn" 
              onClick={fetchTransactions}
              disabled={loading}
            >
              <span className="btn-icon">🔄</span>
              刷新
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="transaction-stats">
          <div className="stat-card stat-total">
            <div className="stat-icon stat-icon-total">✓</div>
            <div className="stat-content">
              <div className="stat-value">{totalTransactions}</div>
              <div className="stat-unit">次</div>
              <div className="stat-label">总交易数</div>
            </div>
          </div>
          <div className="stat-card stat-gas">
            <div className="stat-icon stat-icon-gas">⛽</div>
            <div className="stat-content">
              <div className="stat-value">{totalGas.toLocaleString()}</div>
              <div className="stat-unit">Gas</div>
              <div className="stat-label">总Gas消耗</div>
            </div>
          </div>
          <div className="stat-card stat-eth">
            <div className="stat-icon stat-icon-eth">💎</div>
            <div className="stat-content">
              <div className="stat-value">{totalEth.toFixed(6)}</div>
              <div className="stat-unit">ETH</div>
              <div className="stat-label">总ETH消耗</div>
            </div>
          </div>
          <div className="stat-card stat-avg">
            <div className="stat-icon stat-icon-avg">📊</div>
            <div className="stat-content">
              <div className="stat-value">{avgEth.toFixed(6)}</div>
              <div className="stat-unit">ETH</div>
              <div className="stat-label">平均ETH消耗</div>
            </div>
          </div>
        </div>

        {/* 交易表格 */}
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无交易记录</p>
            <p className="empty-hint">当您进行投票或创建提案时，交易记录会显示在这里</p>
          </div>
        ) : (
          <div className="transaction-table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>提案</th>
                  <th>操作</th>
                  <th>GAS使用</th>
                  <th>ETH消耗</th>
                  <th>交易哈希</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => {
                  const typeInfo = getTransactionTypeInfo(tx);
                  const gasUsed = getGasUsed(tx);
                  const ethConsumption = getEthConsumption(tx);
                  // 对于创建提案，显示创建的提案ID；对于投票，显示投票的提案ID
                  const proposalId = tx.type === 'create_proposal' 
                    ? (tx.chainProposalId || tx.proposal?.chainProposalId || '-')
                    : (tx.proposal?.chainProposalId || tx.chainProposalId || '-');
                  
                  return (
                    <tr key={tx._id}>
                      <td>
                        <div className="proposal-cell">
                          <span className="proposal-id">{proposalId}</span>
                          <span className="proposal-seq">ID: {transactions.length - index}</span>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="vote-choice" 
                          style={{ backgroundColor: typeInfo.color }}
                        >
                          <span className="vote-icon">{typeInfo.icon}</span>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="gas-cell">{gasUsed.toLocaleString()}</td>
                      <td className="eth-cell">{parseFloat(ethConsumption).toFixed(6)} ETH</td>
                      <td>
                        <span 
                          className="tx-hash" 
                          onClick={() => {
                            navigator.clipboard.writeText(tx.transactionHash);
                            alert('交易哈希已复制到剪贴板');
                          }}
                          title="点击复制"
                        >
                          {formatHash(tx.transactionHash)}
                        </span>
                      </td>
                      <td className="time-cell">{formatDate(tx.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TransactionHistory;
