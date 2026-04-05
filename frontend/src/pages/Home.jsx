import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { proposalAPI } from '../services/api';
import { voteOnChain, VoteType, getUserVoteFromChain } from '../utils/contract';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const { contract, isConnected, account, network } = useWallet();
  const [allProposals, setAllProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // all, active, ended, notStarted
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userVote, setUserVote] = useState(null); // 'upvote', 'downvote', 'abstain', null
  const [voting, setVoting] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyContentMap, setReplyContentMap] = useState({});
  const [replySubmittingMap, setReplySubmittingMap] = useState({});
  const [replyVisibleMap, setReplyVisibleMap] = useState({});

  // 获取审核通过的提案列表（只获取 active, passed, closed 状态的提案）
  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      // 获取所有提案，然后在前端筛选出审核通过的提案
      const response = await proposalAPI.getProposals({ limit: 100 });
      const allProposalsData = response.data.proposals || [];
      
      // 只显示审核通过的提案：active（进行中）、passed（已通过）、closed（已关闭）
      // 不显示：pending（待审核）、rejected（已拒绝）、draft（草稿）
      const approvedProposals = allProposalsData.filter(p => 
        ['active', 'passed', 'closed'].includes(p.status)
      );
      
      setAllProposals(approvedProposals);
    } catch (error) {
      console.error('获取提案列表失败:', error);
      setError('获取提案列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 根据分类筛选提案（根据时间判断）
  const getFilteredProposals = () => {
    const now = new Date();
    
    switch (activeCategory) {
      case 'active':
        // 进行中：当前时间在开始时间和结束时间之间
        return allProposals.filter(p => {
          if (p.status !== 'active') return false;
          if (!p.startTime || !p.endTime) return false;
          const start = new Date(p.startTime);
          const end = new Date(p.endTime);
          return now >= start && now <= end;
        });
      case 'ended':
        // 已结束：当前时间超过结束时间
        return allProposals.filter(p => {
          if (!p.endTime) return false;
          const end = new Date(p.endTime);
          return now > end;
        });
      case 'notStarted':
        // 未开始：当前时间早于开始时间
        return allProposals.filter(p => {
          if (p.status !== 'active') return false;
          if (!p.startTime) return false;
          const start = new Date(p.startTime);
          return now < start;
        });
      case 'all':
      default:
        // 全部提案：所有审核通过的提案
        return allProposals;
    }
  };

  const proposals = getFilteredProposals();

  // 获取状态标签样式（根据实际时间判断）
  const getStatusStyle = (proposal) => {
    const now = new Date();
    const startTime = proposal.startTime ? new Date(proposal.startTime) : null;
    const endTime = proposal.endTime ? new Date(proposal.endTime) : null;
    
    // 如果数据库状态是 closed 或 passed，直接返回
    if (proposal.status === 'closed') {
      return { bg: '#f3f4f6', color: '#6b7280', text: '已关闭' };
    }
    if (proposal.status === 'passed') {
      return { bg: '#d1fae5', color: '#059669', text: '已通过' };
    }
    
    // 根据实际时间判断状态
    if (endTime && now > endTime) {
      // 已过期，显示"已结束"
      return { bg: '#fee2e2', color: '#dc2626', text: '已结束' };
    } else if (startTime && now < startTime) {
      // 未开始
      return { bg: '#fef3c7', color: '#d97706', text: '未开始' };
    } else if (startTime && endTime && now >= startTime && now <= endTime) {
      // 进行中
      return { bg: '#dbeafe', color: '#2563eb', text: '进行中' };
    }
    
    // 默认返回进行中
    return { bg: '#dbeafe', color: '#2563eb', text: '进行中' };
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // 打开提案详情弹窗
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
    setCommentContent('');
    setReplyContentMap({});
    setReplySubmittingMap({});
    setReplyVisibleMap({});
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
      setAllProposals(prev => prev.map(p => 
        p._id === selectedProposal._id ? response.data.proposal : p
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

  // 提交评论
  const handleSubmitComment = async () => {
    if (!selectedProposal || commentSubmitting) return;
    if (!commentContent.trim()) {
      setError('请输入评论内容');
      return;
    }

    try {
      setCommentSubmitting(true);
      const response = await proposalAPI.addComment(selectedProposal._id, commentContent.trim());
      setSelectedProposal(response.data.proposal);
      setAllProposals(prev => prev.map(p => 
        p._id === selectedProposal._id ? response.data.proposal : p
      ));
      setCommentContent('');
    } catch (err) {
      console.error('添加评论失败:', err);
      setError(err.response?.data?.message || '添加评论失败，请稍后重试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // 提交回复
  const handleSubmitReply = async (commentId) => {
    if (!selectedProposal || replySubmittingMap[commentId]) return;
    const content = replyContentMap[commentId]?.trim() || '';
    if (!content) {
      setError('请输入回复内容');
      return;
    }

    try {
      setReplySubmittingMap(prev => ({ ...prev, [commentId]: true }));
      const response = await proposalAPI.addReply(selectedProposal._id, commentId, content);
      setSelectedProposal(response.data.proposal);
      setAllProposals(prev => prev.map(p =>
        p._id === selectedProposal._id ? response.data.proposal : p
      ));
      setReplyContentMap(prev => ({ ...prev, [commentId]: '' }));
    } catch (err) {
      console.error('添加回复失败:', err);
      setError(err.response?.data?.message || '添加回复失败，请稍后重试');
    } finally {
      setReplySubmittingMap(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // 切换回复框显示
  const handleToggleReply = (commentId) => {
    setReplyVisibleMap(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // 根据时间判断提案状态并统计
  const getProposalTimeStatus = (proposal) => {
    if (!proposal.startTime || !proposal.endTime) return null;
    const now = new Date();
    const start = new Date(proposal.startTime);
    const end = new Date(proposal.endTime);
    
    if (now < start) return 'notStarted';
    if (now >= start && now <= end) return 'active';
    if (now > end) return 'ended';
    return null;
  };

  // 分类配置（根据时间判断）
  const now = new Date();
  const categories = [
    { 
      key: 'all', 
      label: '全部提案', 
      count: allProposals.length 
    },
    { 
      key: 'active', 
      label: '进行中', 
      count: allProposals.filter(p => {
        if (p.status !== 'active') return false;
        if (!p.startTime || !p.endTime) return false;
        const start = new Date(p.startTime);
        const end = new Date(p.endTime);
        return now >= start && now <= end;
      }).length 
    },
    { 
      key: 'ended', 
      label: '已结束', 
      count: allProposals.filter(p => {
        if (!p.endTime) return false;
        const end = new Date(p.endTime);
        return now > end;
      }).length 
    },
    { 
      key: 'notStarted', 
      label: '未开始', 
      count: allProposals.filter(p => {
        if (p.status !== 'active') return false;
        if (!p.startTime) return false;
        const start = new Date(p.startTime);
        return now < start;
      }).length 
    }
  ];

  return (
    <Layout>
      <div className="home-container">
        {/* 控制台卡片 */}
        <div className="dashboard-section">
          <h2>控制台</h2>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-icon">📊</div>
              <h3>数据概览</h3>
              <p>查看系统整体数据统计</p>
            </div>
            <div className="dashboard-card" onClick={() => window.location.href = '/proposals'}>
              <div className="dashboard-icon">📝</div>
              <h3>我的提案</h3>
              <p>查看和管理我提交的提案</p>
            </div>
            <div className="dashboard-card" onClick={() => window.location.href = '/my-votes'}>
              <div className="dashboard-icon">🗳️</div>
              <h3>我的投票</h3>
              <p>查看我参与的投票记录</p>
            </div>
            <div className="dashboard-card" onClick={() => window.location.href = '/discussion'}>
              <div className="dashboard-icon">💬</div>
              <h3>我的讨论</h3>
              <p>查看我参与的讨论话题</p>
            </div>
          </div>
        </div>

        {/* 提案广场 */}
        <div className="proposals-section">
          <div className="section-header">
            <h2>提案广场</h2>
            <p className="section-subtitle">展示所有审核通过的提案</p>
          </div>

          {/* 分类标签 */}
          <div className="category-tabs">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`category-tab category-tab-${category.key} ${activeCategory === category.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.key)}
              >
                <span className="category-label">{category.label}</span>
                {category.count > 0 && (
                  <span className="category-count">{category.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* 提案列表 */}
          {loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : proposals.length === 0 ? (
            <div className="empty-state">
              <p>暂无{activeCategory === 'all' ? '' : categories.find(c => c.key === activeCategory)?.label}提案</p>
              <p className="empty-hint">只有管理员审核通过的提案才会显示在这里</p>
            </div>
          ) : (
            <div className="proposals-list">
              {proposals.map((proposal) => {
                const statusStyle = getStatusStyle(proposal);
                // 格式化截至时间
                const formatEndTime = (dateString) => {
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
                return (
                  <div 
                    key={proposal._id} 
                    className="proposal-card"
                  >
                    {/* 卡片顶部信息 */}
                    <div className="proposal-top-info">
                      <div className="proposal-meta-top">
                        <span className="proposal-author-top">
                          <span className="author-icon">👤</span>
                          {proposal.author?.name || '未知用户'}
                        </span>
                        {proposal.category && (
                          <span className="proposal-category-badge">
                            {proposal.category === 'general' ? '通用' : 
                             proposal.category === 'academic' ? '学术' :
                             proposal.category === 'campus' ? '校园' :
                             proposal.category === 'welfare' ? '福利' :
                             proposal.category === 'other' ? '其他' : proposal.category}
                          </span>
                        )}
                        {proposal.visibility && (
                          <span className="proposal-visibility-badge">
                            {proposal.visibility === 'all' ? '全部可见' :
                             proposal.visibility === 'student' ? '仅学生' :
                             proposal.visibility === 'teacher' ? '仅教师' : proposal.visibility}
                          </span>
                        )}
                        {proposal.endTime && (
                          <span className="proposal-endtime">
                            <span className="endtime-icon">⏰</span>
                            截至 {formatEndTime(proposal.endTime)}
                          </span>
                        )}
                      </div>
                      <span 
                        className="proposal-status"
                        style={{ 
                          backgroundColor: statusStyle.bg, 
                          color: statusStyle.color 
                        }}
                      >
                        {statusStyle.text}
                      </span>
                    </div>
                    
                    {/* 标题和描述 */}
                    <div className="proposal-content">
                      <h3 className="proposal-title">{proposal.title}</h3>
                      <p className="proposal-description">{proposal.description}</p>
                    </div>
                    
                    {/* 图片 */}
                    {proposal.images && proposal.images.length > 0 && (
                      <div className="proposal-images">
                        {proposal.images.slice(0, 3).map((image, index) => {
                          const imageUrl = image.startsWith('http') 
                            ? image 
                            : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'}${image}`;
                          return (
                            <img
                              key={index}
                              src={imageUrl}
                              alt={`提案图片 ${index + 1}`}
                              className="proposal-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          );
                        })}
                        {proposal.images.length > 3 && (
                          <div className="proposal-image-more">
                            +{proposal.images.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 底部统计和操作 */}
                    <div className="proposal-footer">
                      <div className="proposal-stats">
                        <span className="stat-item stat-upvote">
                          <span className="stat-icon">👍</span>
                          <span className="stat-label">支持</span>
                          <span className="stat-value">{proposal.votes?.upvotes || 0}</span>
                        </span>
                        <span className="stat-item stat-downvote">
                          <span className="stat-icon">👎</span>
                          <span className="stat-label">反对</span>
                          <span className="stat-value">{proposal.votes?.downvotes || 0}</span>
                        </span>
                        <span className="stat-item stat-abstain">
                          <span className="stat-icon">🤷</span>
                          <span className="stat-label">弃权</span>
                          <span className="stat-value">{proposal.votes?.abstains || 0}</span>
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
        </div>

        {/* 提案详情弹窗 */}
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

                    {/* 讨论区 */}
                    <div className="detail-section comments-section">
                      <h3 className="detail-section-title">讨论</h3>
                      {selectedProposal.comments && selectedProposal.comments.length > 0 ? (
                        <div className="comment-list">
                          {selectedProposal.comments.map((comment, index) => (
                            <div key={comment._id || index} className="comment-item">
                              <div className="comment-header">
                                <div className="comment-author">
                                  <span className="comment-author-icon">💬</span>
                                  <span className="comment-author-name">
                                    {comment.user?.name || '匿名用户'}
                                  </span>
                                </div>
                                <span className="comment-time">
                                  {formatTimeShort(comment.createdAt)}
                                </span>
                              </div>
                              <p className="comment-content">{comment.content}</p>

                              {/* 回复列表 */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="reply-list">
                                  {comment.replies.map((reply) => (
                                    <div key={reply._id} className="reply-item">
                                      <div className="reply-header">
                                        <div className="reply-author">
                                          <span className="reply-author-icon">↩</span>
                                          <span className="reply-author-name">
                                            {reply.user?.name || '匿名用户'}
                                          </span>
                                        </div>
                                        <span className="reply-time">{formatTimeShort(reply.createdAt)}</span>
                                      </div>
                                      <p className="reply-content">{reply.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="comment-actions">
                                <button
                                  className="reply-toggle-btn"
                                  onClick={() => handleToggleReply(comment._id)}
                                >
                                  {replyVisibleMap[comment._id] ? '收起回复' : '回复'}
                                </button>
                              </div>

                              {/* 回复输入 - 点击后展示 */}
                              {replyVisibleMap[comment._id] && (
                                user ? (
                                  <div className="reply-form">
                                    <textarea
                                      value={replyContentMap[comment._id] || ''}
                                      onChange={(e) => setReplyContentMap(prev => ({ ...prev, [comment._id]: e.target.value }))}
                                      placeholder="回复该评论..."
                                      rows={2}
                                    />
                                    <button
                                      className="btn-primary reply-submit-btn"
                                      onClick={() => handleSubmitReply(comment._id)}
                                      disabled={replySubmittingMap[comment._id]}
                                    >
                                      {replySubmittingMap[comment._id] ? '发布中...' : '发布回复'}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="comment-login-hint">
                                    请登录后参与讨论
                                  </div>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="comment-empty">暂无讨论，快来发表第一条评论吧</div>
                      )}

                      {user ? (
                        <div className="comment-form">
                          <textarea
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="发表你的看法..."
                            rows={3}
                          />
                          <button
                            className="btn-primary comment-submit-btn"
                            onClick={handleSubmitComment}
                            disabled={commentSubmitting}
                          >
                            {commentSubmitting ? '发布中...' : '发布评论'}
                          </button>
                        </div>
                      ) : (
                        <div className="comment-login-hint">
                          请登录后参与讨论
                        </div>
                      )}
                    </div>
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

export default Home;
