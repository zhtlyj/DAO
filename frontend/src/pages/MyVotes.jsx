import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { proposalAPI } from '../services/api';
import { voteOnChain, VoteType, getUserVoteFromChain } from '../utils/contract';
import './MyVotes.css';

const MyVotes = () => {
  const { user } = useAuth();
  const { contract, isConnected, account, network } = useWallet();
  const navigate = useNavigate();
  const [myVotes, setMyVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, upvote, downvote, abstain
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetchMyVotes();
  }, []);

  const fetchMyVotes = async () => {
    try {
      setLoading(true);
      // 获取所有提案
      const response = await proposalAPI.getProposals({ limit: 1000 });
      const allProposals = response.data.proposals || [];
      
      // 筛选出用户投票过的提案
      const votedProposals = allProposals.filter(proposal => {
        if (!proposal.votes?.voterRecords) return false;
        return proposal.votes.voterRecords.some(
          record => record.user?._id === user._id || record.user?.toString() === user._id
        );
      });

      // 为每个提案添加用户的投票信息
      const proposalsWithVoteInfo = votedProposals.map(proposal => {
        const userVoteRecord = proposal.votes.voterRecords.find(
          record => record.user?._id === user._id || record.user?.toString() === user._id
        );
        return {
          ...proposal,
          myVoteType: userVoteRecord?.voteType || null,
          myVoteTime: userVoteRecord?.votedAt || null
        };
      });

      setMyVotes(proposalsWithVoteInfo);
    } catch (error) {
      console.error('获取我的投票失败:', error);
      setError('获取投票记录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 根据筛选条件过滤投票
  const getFilteredVotes = () => {
    if (filter === 'all') return myVotes;
    return myVotes.filter(vote => vote.myVoteType === filter);
  };

  const filteredVotes = getFilteredVotes();

  // 获取投票类型样式
  const getVoteTypeStyle = (voteType) => {
    const styles = {
      upvote: { bg: '#dbeafe', color: '#2563eb', text: '支持', icon: '👍' },
      downvote: { bg: '#fee2e2', color: '#dc2626', text: '反对', icon: '👎' },
      abstain: { bg: '#fef3c7', color: '#d97706', text: '弃权', icon: '🤷' }
    };
    return styles[voteType] || styles.upvote;
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 检查提案是否在投票期内
  const isVotingActive = (proposal) => {
    if (proposal.status !== 'active') return false;
    const now = new Date();
    if (proposal.startTime && now < new Date(proposal.startTime)) return false;
    if (proposal.endTime && now > new Date(proposal.endTime)) return false;
    return true;
  };

  // 打开提案详情
  const handleViewDetail = async (proposalId) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const [proposalResponse, voteResponse] = await Promise.all([
        proposalAPI.getProposalById(proposalId),
        proposalAPI.getMyVote(proposalId)
      ]);
      setSelectedProposal(proposalResponse.data);
      setUserVote(voteResponse.data.voteType);
    } catch (error) {
      console.error('获取提案详情失败:', error);
      setError('获取提案详情失败，请稍后重试');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedProposal(null);
    setUserVote(null);
  };

  // 检查提案是否可投票
  const canVote = (proposal) => {
    if (!proposal || proposal.status !== 'active') return false;
    const now = new Date();
    if (proposal.startTime && now < new Date(proposal.startTime)) return false;
    if (proposal.endTime && now > new Date(proposal.endTime)) return false;
    return true;
  };

  // 处理投票
  const handleVote = async (voteType) => {
    if (!selectedProposal || voting) return;
    
    // 检查是否已经投过票（每人只能投票一次）
    if (userVote) {
      setError('您已经投过票了，每人只能投票一次。');
      return;
    }
    
    try {
      setVoting(true);
      setError('');
      
      let chainTransactionHash = null;
      let chainVoteType = null;
      let gasUsed = null;
      let gasPrice = null;
      let transactionFee = null;
      let blockNumber = null;
      
      // 如果已连接钱包且有链上提案ID，先在链上投票
      if (isConnected && contract && selectedProposal.chainProposalId && account) {
        try {
          // 映射投票类型
          const voteTypeMap = {
            'upvote': VoteType.Upvote,    // 0
            'downvote': VoteType.Downvote, // 1
            'abstain': VoteType.Abstain    // 2
          };
          
          chainVoteType = voteTypeMap[voteType];
          if (chainVoteType === undefined) {
            throw new Error('无效的投票类型');
          }
          
          setError('正在链上投票，请确认 MetaMask 交易...');
          
          // 查询用户是否已对该提案投票（链上检查）
          let hasVotedOnChain = false;
          try {
            const userVoteInfo = await getUserVoteFromChain(
              contract, 
              selectedProposal.chainProposalId, 
              account
            );
            hasVotedOnChain = userVoteInfo.voted;
            console.log(`用户对提案 ${selectedProposal.chainProposalId} 的投票状态:`, hasVotedOnChain);
            
            // 如果链上已投票，不允许再次投票
            if (hasVotedOnChain) {
              throw new Error('您已经投过票了，每人只能投票一次。');
            }
          } catch (queryError) {
            // 如果查询失败，检查是否是已投票错误
            if (queryError.message && queryError.message.includes('已经投过票')) {
              throw queryError;
            }
            console.warn('查询链上投票状态失败，将尝试直接投票:', queryError);
            // 如果查询失败，假设未投票，尝试直接投票
          }
          
          // 使用 vote 进行首次投票（每人只能投票一次）
          console.log(`用户首次投票: ${voteType}`);
          const receipt = await voteOnChain(contract, selectedProposal.chainProposalId, chainVoteType);
          
          chainTransactionHash = receipt.hash;
          
          // 提取gas信息
          gasUsed = receipt.gasUsed?.toString() || null;
          // gasPrice可能在receipt中，也可能需要从provider获取
          gasPrice = receipt.gasPrice?.toString() || null;
          // 如果receipt中没有gasPrice，尝试从交易中获取
          if (!gasPrice && receipt.hash) {
            try {
              const txResponse = await provider.getTransaction(receipt.hash);
              gasPrice = txResponse?.gasPrice?.toString() || null;
            } catch (e) {
              console.warn('无法获取gasPrice:', e);
            }
          }
          transactionFee = gasUsed && gasPrice 
            ? (BigInt(gasUsed) * BigInt(gasPrice)).toString() 
            : null;
          blockNumber = receipt.blockNumber || null;
          
          // 获取投票类型文本
          const voteTypeText = {
            'upvote': '支持',
            'downvote': '反对',
            'abstain': '弃权'
          }[voteType] || voteType;
          
          console.log('✅ 链上投票成功！', { 
            proposalId: selectedProposal.chainProposalId,
            voteType: voteType,
            txHash: chainTransactionHash 
          });
          
          // 显示成功提示
          alert(`✅ 链上投票成功！\n投票类型: ${voteTypeText}\n提案ID: ${selectedProposal.chainProposalId}\n交易哈希: ${chainTransactionHash}\nGas使用: ${gasUsed || 'N/A'}\nETH消耗: ${transactionFee ? ethers.formatEther(transactionFee) : 'N/A'} ETH`);
          
        } catch (chainError) {
          console.error('链上投票失败:', chainError);
          const errorMessage = chainError.message || chainError.toString();
          
          // 根据错误类型给出提示
          if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
            setError('您已取消交易，投票将仅保存到数据库。');
          } else if (errorMessage.includes('insufficient funds')) {
            setError('账户余额不足，无法支付 gas 费用。投票将仅保存到数据库。');
          } else if (errorMessage.includes('Failed to fetch')) {
            setError('无法连接到区块链网络。请确保 Hardhat 节点正在运行。投票将仅保存到数据库。');
          } else if (errorMessage.includes('Already voted') || errorMessage.includes('已经投过票')) {
            setError('您已经投过票了，每人只能投票一次。');
            setVoting(false);
            return; // 直接返回，不允许再次投票
          } else {
            setError(`链上投票失败: ${errorMessage}。投票将仅保存到数据库。`);
          }
          // 继续执行，保存到数据库
        }
      }
      
      // 准备链上投票数据（如果有）
      const chainVoteData = chainTransactionHash ? {
        chainVoted: true,
        chainAddress: account,
        chainVoteType: chainVoteType,
        chainTransactionHash: chainTransactionHash,
        network: network || 'sepolia',
        gasUsed: gasUsed || null,
        gasPrice: gasPrice || null,
        transactionFee: transactionFee || null,
        blockNumber: blockNumber || null
      } : null;
      
      // 调用后端API保存投票（包含链上信息）
      const response = await proposalAPI.voteProposal(
        selectedProposal._id, 
        voteType,
        chainVoteData
      );
      
      setSelectedProposal(response.data.proposal);
      setUserVote(voteType);
      
      // 更新列表中的提案数据
      setMyVotes(prev => prev.map(p => 
        p._id === selectedProposal._id ? { ...response.data.proposal, myVoteType: voteType } : p
      ));
      
      // 清除错误提示（如果链上投票成功）
      if (chainTransactionHash) {
        setError('');
      }
    } catch (error) {
      console.error('投票失败:', error);
      setError(error.response?.data?.message || '投票失败，请稍后重试');
    } finally {
      setVoting(false);
    }
  };

  // 获取状态标签样式
  const getStatusStyle = (status) => {
    const styles = {
      active: { bg: '#dbeafe', color: '#2563eb', text: '进行中' },
      passed: { bg: '#d1fae5', color: '#059669', text: '已通过' },
      closed: { bg: '#f3f4f6', color: '#6b7280', text: '已关闭' }
    };
    return styles[status] || styles.active;
  };

  // 格式化时间（简短版）
  const formatTimeShort = (dateString) => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 统计信息
  const stats = {
    total: myVotes.length,
    upvote: myVotes.filter(v => v.myVoteType === 'upvote').length,
    downvote: myVotes.filter(v => v.myVoteType === 'downvote').length,
    abstain: myVotes.filter(v => v.myVoteType === 'abstain').length
  };

  return (
    <Layout>
      <div className="my-votes-page">
        <div className="my-votes-header">
          <div>
            <h1>我的投票</h1>
            <p className="page-subtitle">查看您参与的所有投票记录</p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="votes-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">总投票数</div>
            </div>
          </div>
          <div className="stat-card stat-upvote">
            <div className="stat-icon">👍</div>
            <div className="stat-content">
              <div className="stat-value">{stats.upvote}</div>
              <div className="stat-label">支持</div>
            </div>
          </div>
          <div className="stat-card stat-downvote">
            <div className="stat-icon">👎</div>
            <div className="stat-content">
              <div className="stat-value">{stats.downvote}</div>
              <div className="stat-label">反对</div>
            </div>
          </div>
          <div className="stat-card stat-abstain">
            <div className="stat-icon">🤷</div>
            <div className="stat-content">
              <div className="stat-value">{stats.abstain}</div>
              <div className="stat-label">弃权</div>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="votes-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部 ({stats.total})
          </button>
          <button
            className={`filter-btn filter-upvote ${filter === 'upvote' ? 'active' : ''}`}
            onClick={() => setFilter('upvote')}
          >
            👍 支持 ({stats.upvote})
          </button>
          <button
            className={`filter-btn filter-downvote ${filter === 'downvote' ? 'active' : ''}`}
            onClick={() => setFilter('downvote')}
          >
            👎 反对 ({stats.downvote})
          </button>
          <button
            className={`filter-btn filter-abstain ${filter === 'abstain' ? 'active' : ''}`}
            onClick={() => setFilter('abstain')}
          >
            🤷 弃权 ({stats.abstain})
          </button>
        </div>

        {/* 投票列表 */}
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredVotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗳️</div>
            <p>暂无投票记录</p>
            <p className="empty-hint">您还没有参与任何投票</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/')}
            >
              去投票
            </button>
          </div>
        ) : (
          <div className="votes-list">
            {filteredVotes.map((proposal) => {
              const voteStyle = getVoteTypeStyle(proposal.myVoteType);
              const isActive = isVotingActive(proposal);
              
              return (
                <div key={proposal._id} className="vote-card">
                  <div className="vote-card-header">
                    <h3 className="vote-proposal-title">{proposal.title}</h3>
                    <span 
                      className="vote-badge"
                      style={{ 
                        backgroundColor: voteStyle.bg, 
                        color: voteStyle.color 
                      }}
                    >
                      <span className="vote-badge-icon">{voteStyle.icon}</span>
                      {voteStyle.text}
                    </span>
                  </div>
                  
                  <p className="vote-proposal-description">{proposal.description}</p>
                  
                  <div className="vote-card-meta">
                    <div className="vote-meta-left">
                      <span className="vote-time">
                        <span className="meta-icon">⏰</span>
                        投票时间：{formatDate(proposal.myVoteTime)}
                      </span>
                      {proposal.category && (
                        <span className="vote-category">
                          <span className="meta-icon">📁</span>
                          {proposal.category === 'general' ? '通用' : 
                           proposal.category === 'academic' ? '学术' :
                           proposal.category === 'campus' ? '校园' :
                           proposal.category === 'welfare' ? '福利' :
                           proposal.category === 'other' ? '其他' : proposal.category}
                        </span>
                      )}
                    </div>
                    <div className="vote-meta-right">
                      {isActive && (
                        <span className="vote-status-active">进行中</span>
                      )}
                      {!isActive && proposal.endTime && new Date() > new Date(proposal.endTime) && (
                        <span className="vote-status-ended">已结束</span>
                      )}
                    </div>
                  </div>

                  <div className="vote-card-footer">
                    <div className="vote-stats">
                      <span className="vote-stat-item">
                        <span className="vote-stat-icon">👍</span>
                        <span className="vote-stat-value">{proposal.votes?.upvotes || 0}</span>
                      </span>
                      <span className="vote-stat-item">
                        <span className="vote-stat-icon">👎</span>
                        <span className="vote-stat-value">{proposal.votes?.downvotes || 0}</span>
                      </span>
                      <span className="vote-stat-item">
                        <span className="vote-stat-icon">🤷</span>
                        <span className="vote-stat-value">{proposal.votes?.abstains || 0}</span>
                      </span>
                    </div>
                    <button 
                      className="btn-view-detail"
                      onClick={() => handleViewDetail(proposal._id)}
                    >
                      查看详情
                      <span className="btn-arrow">→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 提案详情弹窗（与首页保持一致体验） */}
        {showDetailModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {detailLoading ? (
                <div className="modal-loading">加载中...</div>
              ) : selectedProposal ? (
                <div className="proposal-detail">
                  {/* 详情头部 */}
                  <div className="detail-header">
                    <div className="detail-header-top">
                      <h2 className="detail-title">{selectedProposal.title}</h2>
                      <span 
                        className="detail-status"
                        style={{ 
                          backgroundColor: getStatusStyle(selectedProposal.status).bg, 
                          color: getStatusStyle(selectedProposal.status).color 
                        }}
                      >
                        {getStatusStyle(selectedProposal.status).text}
                      </span>
                    </div>
                    <div className="detail-meta">
                      <div className="detail-meta-item">
                        <span className="meta-label">发起人：</span>
                        <span className="meta-value">{selectedProposal.author?.name || '未知用户'}</span>
                      </div>
                      {selectedProposal.category && (
                        <div className="detail-meta-item">
                          <span className="meta-label">分类：</span>
                          <span className="meta-value">
                            {selectedProposal.category === 'general' ? '通用' : 
                             selectedProposal.category === 'academic' ? '学术' :
                             selectedProposal.category === 'campus' ? '校园' :
                             selectedProposal.category === 'welfare' ? '福利' :
                             selectedProposal.category === 'other' ? '其他' : selectedProposal.category}
                          </span>
                        </div>
                      )}
                      <div className="detail-meta-item">
                        <span className="meta-label">创建时间：</span>
                        <span className="meta-value">{formatDate(selectedProposal.createdAt)}</span>
                      </div>
                      {selectedProposal.startTime && (
                        <div className="detail-meta-item">
                          <span className="meta-label">开始时间：</span>
                          <span className="meta-value">{formatTimeShort(selectedProposal.startTime)}</span>
                        </div>
                      )}
                      {selectedProposal.endTime && (
                        <div className="detail-meta-item">
                          <span className="meta-label">截至时间：</span>
                          <span className="meta-value">{formatTimeShort(selectedProposal.endTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 详情内容 */}
                  <div className="detail-content">
                    <div className="detail-section">
                      <h3 className="detail-section-title">提案描述</h3>
                      <p className="detail-description">{selectedProposal.description}</p>
                    </div>

                    {/* 图片展示 */}
                    {selectedProposal.images && selectedProposal.images.length > 0 && (
                      <div className="detail-section">
                        <h3 className="detail-section-title">相关图片</h3>
                        <div className="detail-images">
                          {selectedProposal.images.map((image, index) => {
                            const imageUrl = image.startsWith('http') 
                              ? image 
                              : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'}${image}`;
                            return (
                              <div key={index} className="detail-image-item">
                                <img
                                  src={imageUrl}
                                  alt={`提案图片 ${index + 1}`}
                                  className="detail-image"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 投票区域 */}
                    {canVote(selectedProposal) ? (
                      <div className="detail-section vote-section">
                        <h3 className="detail-section-title">参与投票</h3>
                        <p className="vote-description">请选择您的投票选项：</p>
                        <div className="vote-buttons">
                          <button
                            className={`vote-btn vote-btn-upvote ${userVote === 'upvote' ? 'active' : ''}`}
                            onClick={() => handleVote('upvote')}
                            disabled={voting || !!userVote}
                            title={userVote ? '您已经投过票了，每人只能投票一次' : ''}
                          >
                            <span className="vote-icon">👍</span>
                            <div className="vote-content">
                              <span className="vote-text">支持</span>
                              <span className="vote-count">{selectedProposal.votes?.upvotes || 0} 票</span>
                            </div>
                            {userVote === 'upvote' && <span className="vote-check">✓</span>}
                          </button>
                          <button
                            className={`vote-btn vote-btn-downvote ${userVote === 'downvote' ? 'active' : ''}`}
                            onClick={() => handleVote('downvote')}
                            disabled={voting || !!userVote}
                            title={userVote ? '您已经投过票了，每人只能投票一次' : ''}
                          >
                            <span className="vote-icon">👎</span>
                            <div className="vote-content">
                              <span className="vote-text">反对</span>
                              <span className="vote-count">{selectedProposal.votes?.downvotes || 0} 票</span>
                            </div>
                            {userVote === 'downvote' && <span className="vote-check">✓</span>}
                          </button>
                          <button
                            className={`vote-btn vote-btn-abstain ${userVote === 'abstain' ? 'active' : ''}`}
                            onClick={() => handleVote('abstain')}
                            disabled={voting || !!userVote}
                            title={userVote ? '您已经投过票了，每人只能投票一次' : ''}
                          >
                            <span className="vote-icon">🤷</span>
                            <div className="vote-content">
                              <span className="vote-text">弃权</span>
                              <span className="vote-count">{selectedProposal.votes?.abstains || 0} 票</span>
                            </div>
                            {userVote === 'abstain' && <span className="vote-check">✓</span>}
                          </button>
                        </div>
                        {voting && <div className="voting-indicator">投票中...</div>}
                        {userVote && (
                          <div className="vote-success-message">
                            ✓ 您已投票：{userVote === 'upvote' ? '支持' : userVote === 'downvote' ? '反对' : '弃权'}（每人只能投票一次）
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="detail-section vote-section">
                        <h3 className="detail-section-title">投票状态</h3>
                        <div className="vote-status-info">
                          {selectedProposal.status !== 'active' ? (
                            <p className="vote-status-text">该提案当前不可投票</p>
                          ) : (() => {
                            const now = new Date();
                            const start = selectedProposal.startTime ? new Date(selectedProposal.startTime) : null;
                            const end = selectedProposal.endTime ? new Date(selectedProposal.endTime) : null;
                            
                            if (start && now < start) {
                              return <p className="vote-status-text">投票尚未开始</p>;
                            }
                            if (end && now > end) {
                              return <p className="vote-status-text">投票已结束</p>;
                            }
                            return <p className="vote-status-text">该提案当前不可投票</p>;
                          })()}
                        </div>
                        <div className="vote-results">
                          <div className="vote-result-item">
                            <span className="vote-result-label">👍 支持</span>
                            <span className="vote-result-count">{selectedProposal.votes?.upvotes || 0} 票</span>
                          </div>
                          <div className="vote-result-item">
                            <span className="vote-result-label">👎 反对</span>
                            <span className="vote-result-count">{selectedProposal.votes?.downvotes || 0} 票</span>
                          </div>
                          <div className="vote-result-item">
                            <span className="vote-result-label">🤷 弃权</span>
                            <span className="vote-result-count">{selectedProposal.votes?.abstains || 0} 票</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="modal-error">加载失败</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyVotes;

