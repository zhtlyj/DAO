import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { transactionAPI } from '../services/api';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const { user } = useAuth();
  const { account } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, create_proposal, vote, change_vote
  const [statusFilter, setStatusFilter] = useState('all'); // all, confirmed, pending, failed

  useEffect(() => {
    fetchTransactions();
  }, [filter, statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = { page: 1, limit: 50 };
      if (filter !== 'all') {
        params.type = filter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await transactionAPI.getMyTransactions(params);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('获取交易历史失败:', error);
      setError('获取交易历史失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化交易类型
  const getTransactionTypeLabel = (type) => {
    const typeMap = {
      'create_proposal': '创建提案',
      'vote': '投票',
      'change_vote': '修改投票'
    };
    return typeMap[type] || type;
  };

  // 获取交易类型图标
  const getTransactionTypeIcon = (type) => {
    const iconMap = {
      'create_proposal': '📝',
      'vote': '🗳️',
      'change_vote': '🔄'
    };
    return iconMap[type] || '📋';
  };

  // 格式化交易状态
  const getStatusLabel = (status) => {
    const statusMap = {
      'confirmed': '已确认',
      'pending': '待确认',
      'failed': '失败'
    };
    return statusMap[status] || status;
  };

  // 获取状态样式
  const getStatusStyle = (status) => {
    const styles = {
      'confirmed': { bg: '#d1fae5', color: '#059669' },
      'pending': { bg: '#fef3c7', color: '#d97706' },
      'failed': { bg: '#fee2e2', color: '#dc2626' }
    };
    return styles[status] || styles.pending;
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
    });
  };

  // 格式化交易哈希（显示前6位和后4位）
  const formatHash = (hash) => {
    if (!hash) return '-';
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // 复制交易哈希
  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    alert('交易哈希已复制到剪贴板');
  };

  // 获取投票类型标签
  const getVoteTypeLabel = (voteType) => {
    const voteMap = {
      'upvote': '支持',
      'downvote': '反对',
      'abstain': '弃权'
    };
    return voteMap[voteType] || voteType;
  };

  // 统计信息
  const stats = {
    total: transactions.length,
    create_proposal: transactions.filter(t => t.type === 'create_proposal').length,
    vote: transactions.filter(t => t.type === 'vote').length,
    change_vote: transactions.filter(t => t.type === 'change_vote').length
  };

  return (
    <Layout>
      <div className="transaction-history-page">
        <div className="transaction-header">
          <div>
            <h1>交易历史</h1>
            <p className="page-subtitle">查看您的所有链上交易记录</p>
          </div>
          {account && (
            <div className="wallet-info">
              <span className="wallet-label">钱包地址：</span>
              <span className="wallet-address">{formatHash(account)}</span>
            </div>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="transaction-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">总交易数</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{stats.create_proposal}</div>
              <div className="stat-label">创建提案</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗳️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.vote}</div>
              <div className="stat-label">投票</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-value">{stats.change_vote}</div>
              <div className="stat-label">修改投票</div>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="transaction-filters">
          <div className="filter-group">
            <label>交易类型：</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">全部</option>
              <option value="create_proposal">创建提案</option>
              <option value="vote">投票</option>
              <option value="change_vote">修改投票</option>
            </select>
          </div>
          <div className="filter-group">
            <label>交易状态：</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">全部</option>
              <option value="confirmed">已确认</option>
              <option value="pending">待确认</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </div>

        {/* 交易列表 */}
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无交易记录</p>
            <p className="empty-hint">当您创建提案或投票时，交易记录会显示在这里</p>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx) => {
              const statusStyle = getStatusStyle(tx.status);
              return (
                <div key={tx._id} className="transaction-card">
                  <div className="transaction-card-header">
                    <div className="transaction-type">
                      <span className="type-icon">{getTransactionTypeIcon(tx.type)}</span>
                      <span className="type-label">{getTransactionTypeLabel(tx.type)}</span>
                    </div>
                    <span 
                      className="transaction-status"
                      style={{ 
                        backgroundColor: statusStyle.bg, 
                        color: statusStyle.color 
                      }}
                    >
                      {getStatusLabel(tx.status)}
                    </span>
                  </div>

                  <div className="transaction-details">
                    <div className="detail-row">
                      <span className="detail-label">交易哈希：</span>
                      <span className="detail-value hash-value" onClick={() => copyHash(tx.transactionHash)} title="点击复制">
                        {formatHash(tx.transactionHash)}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">时间：</span>
                      <span className="detail-value">{formatDate(tx.createdAt)}</span>
                    </div>

                    {tx.proposal && (
                      <div className="detail-row">
                        <span className="detail-label">关联提案：</span>
                        <span className="detail-value">{tx.proposal.title || '未知提案'}</span>
                        {tx.chainProposalId && (
                          <span className="chain-id">(链上ID: {tx.chainProposalId})</span>
                        )}
                      </div>
                    )}

                    {tx.details && (
                      <>
                        {tx.details.proposalTitle && (
                          <div className="detail-row">
                            <span className="detail-label">提案标题：</span>
                            <span className="detail-value">{tx.details.proposalTitle}</span>
                          </div>
                        )}
                        {tx.details.voteType && (
                          <div className="detail-row">
                            <span className="detail-label">投票类型：</span>
                            <span className="detail-value">{getVoteTypeLabel(tx.details.voteType)}</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="detail-row">
                      <span className="detail-label">网络：</span>
                      <span className="detail-value">{tx.network || 'hardhat'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TransactionHistory;

