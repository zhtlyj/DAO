import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { proposalAPI } from '../services/api';
import { updateProposalStatusOnChain, StatusMap, getContractOwner } from '../utils/contract';
import './AdminProposals.css';

const AdminProposals = () => {
  const { user } = useAuth();
  const { contract, isConnected, account, network, provider } = useWallet();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 默认显示待审核的提案
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingProposalId, setRejectingProposalId] = useState(null);

  // 获取提案列表
  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await proposalAPI.getProposals(params);
      setProposals(response.data.proposals || []);
    } catch (error) {
      console.error('获取提案列表失败:', error);
      setError('获取提案列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开拒绝理由输入框
  const handleRejectClick = (proposalId) => {
    setRejectingProposalId(proposalId);
    setShowRejectModal(true);
    setRejectReason('');
  };

  // 确认拒绝提案
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setError('请填写拒绝理由');
      return;
    }

    try {
      setError('正在更新提案状态...');
      
      // 找到提案对象
      const proposal = proposals.find(p => p._id === rejectingProposalId);
      let chainTransactionHash = null;
      let gasUsed = null;
      let gasPrice = null;
      let transactionFee = null;
      let blockNumber = null;
      
      // 如果已连接钱包且有链上提案ID，先更新链上状态
      if (isConnected && contract && proposal?.chainProposalId && account) {
        try {
          const chainStatus = StatusMap['rejected']; // 3 = Rejected
          console.log('更新链上提案状态为 Rejected...', { 
            proposalId: proposal.chainProposalId, 
            status: chainStatus 
          });
          
          // 提示用户确认交易
          setError('正在请求 MetaMask 确认交易，请在弹出的窗口中确认...');
          
          const receipt = await updateProposalStatusOnChain(
            contract,
            proposal.chainProposalId,
            chainStatus,
            account,
            network || 'sepolia'
          );
          
          chainTransactionHash = receipt.hash;
          
          // 提取gas信息
          gasUsed = receipt.gasUsed?.toString() || null;
          gasPrice = receipt.gasPrice?.toString() || null;
          // 如果receipt中没有gasPrice，尝试从交易中获取
          if (!gasPrice && receipt.hash && provider) {
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
          
          console.log('✅ 链上状态更新成功！', { txHash: chainTransactionHash });
          
          // 显示成功提示
          alert(`✅ 链上提案状态更新成功！\n操作: 拒绝提案\n提案ID: ${proposal.chainProposalId}\n交易哈希: ${chainTransactionHash}\nGas使用: ${gasUsed || 'N/A'}\nETH消耗: ${transactionFee ? ethers.formatEther(transactionFee) : 'N/A'} ETH`);
        } catch (chainError) {
          console.error('链上状态更新失败:', chainError);
          const errorMessage = chainError.message || chainError.toString();
          if (errorMessage.includes('Only owner') || errorMessage.includes('only owner') || errorMessage.includes('Contract owner')) {
            // 尝试获取合约所有者地址以便显示
            let ownerInfo = '';
            try {
              const owner = await getContractOwner(contract, network || 'sepolia');
              ownerInfo = `\n合约所有者地址: ${owner}\n当前账户地址: ${account}`;
            } catch (e) {
              console.warn('无法获取合约所有者:', e);
            }
            setError(`⚠️ 您不是合约所有者，无法更新链上状态。${ownerInfo}\n\n请确保：\n1. 使用部署合约时的账户连接钱包\n2. 或者联系合约所有者进行状态更新\n\n状态将仅保存到数据库。`);
          } else if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
            setError('您已取消交易，状态将仅保存到数据库。');
          } else {
            setError(`链上状态更新失败: ${errorMessage}。状态将仅保存到数据库。`);
          }
          // 继续执行，保存到数据库
        }
      }
      
      // 更新数据库状态
      await proposalAPI.updateProposal(rejectingProposalId, { 
        status: 'rejected',
        rejectionReason: rejectReason.trim()
      });
      
      setError('');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingProposalId(null);
      fetchProposals(); // 刷新列表
    } catch (error) {
      setError(error.response?.data?.message || '拒绝提案失败，请稍后重试');
    }
  };

  // 审核提案（通过/激活/关闭）
  const handleReviewProposal = async (proposalId, status) => {
    try {
      setError('正在更新提案状态...');
      
      // 找到提案对象
      const proposal = proposals.find(p => p._id === proposalId);
      let chainTransactionHash = null;
      let gasUsed = null;
      let gasPrice = null;
      let transactionFee = null;
      let blockNumber = null;
      
      // 获取状态文本
      const statusText = {
        'active': '通过审核',
        'closed': '关闭提案',
        'passed': '标记为已通过'
      }[status] || status;
      
      // 如果已连接钱包且有链上提案ID，先更新链上状态
      if (isConnected && contract && proposal?.chainProposalId && account) {
        try {
          const chainStatus = StatusMap[status];
          if (chainStatus === undefined) {
            console.warn(`状态 ${status} 没有对应的链上状态映射`);
          } else {
            console.log('更新链上提案状态...', { 
              proposalId: proposal.chainProposalId, 
              status: status,
              chainStatus: chainStatus 
            });
            
            // 提示用户确认交易
            setError('正在请求 MetaMask 确认交易，请在弹出的窗口中确认...');
            
            const receipt = await updateProposalStatusOnChain(
              contract,
              proposal.chainProposalId,
              chainStatus,
              account,
              network || 'sepolia'
            );
            
            chainTransactionHash = receipt.hash;
            
            // 提取gas信息
            gasUsed = receipt.gasUsed?.toString() || null;
            gasPrice = receipt.gasPrice?.toString() || null;
            // 如果receipt中没有gasPrice，尝试从交易中获取
            if (!gasPrice && receipt.hash && provider) {
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
            
            console.log('✅ 链上状态更新成功！', { txHash: chainTransactionHash });
            
            // 显示成功提示
            alert(`✅ 链上提案状态更新成功！\n操作: ${statusText}\n提案ID: ${proposal.chainProposalId}\n交易哈希: ${chainTransactionHash}\nGas使用: ${gasUsed || 'N/A'}\nETH消耗: ${transactionFee ? ethers.formatEther(transactionFee) : 'N/A'} ETH`);
          }
        } catch (chainError) {
          console.error('链上状态更新失败:', chainError);
          const errorMessage = chainError.message || chainError.toString();
          if (errorMessage.includes('Only owner') || errorMessage.includes('only owner') || errorMessage.includes('Contract owner')) {
            // 尝试获取合约所有者地址以便显示
            let ownerInfo = '';
            try {
              const owner = await getContractOwner(contract, network || 'sepolia');
              ownerInfo = `\n合约所有者地址: ${owner}\n当前账户地址: ${account}`;
            } catch (e) {
              console.warn('无法获取合约所有者:', e);
            }
            setError(`⚠️ 您不是合约所有者，无法更新链上状态。${ownerInfo}\n\n请确保：\n1. 使用部署合约时的账户连接钱包\n2. 或者联系合约所有者进行状态更新\n\n状态将仅保存到数据库。`);
          } else if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
            setError('您已取消交易，状态将仅保存到数据库。');
          } else if (errorMessage.includes('Failed to fetch')) {
            setError('无法连接到区块链网络。请确保 Hardhat 节点正在运行。状态将仅保存到数据库。');
          } else {
            setError(`链上状态更新失败: ${errorMessage}。状态将仅保存到数据库。`);
          }
          // 继续执行，保存到数据库
        }
      }
      
      // 更新数据库状态
      await proposalAPI.updateProposal(proposalId, { status });
      
      setError('');
      fetchProposals(); // 刷新列表
      setSelectedProposal(null);
    } catch (error) {
      setError(error.response?.data?.message || '审核失败，请稍后重试');
    }
  };

  // 获取状态标签样式
  const getStatusStyle = (status) => {
    const styles = {
      draft: { bg: '#f3f4f6', color: '#6b7280', text: '草稿' },
      pending: { bg: '#fef3c7', color: '#d97706', text: '待审核' },
      active: { bg: '#dbeafe', color: '#2563eb', text: '进行中' },
      passed: { bg: '#d1fae5', color: '#059669', text: '已通过' },
      rejected: { bg: '#fee2e2', color: '#dc2626', text: '已拒绝' },
      closed: { bg: '#f3f4f6', color: '#6b7280', text: '已关闭' }
    };
    return styles[status] || styles.pending;
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取图片URL
  const getImageUrl = (image) => {
    return image.startsWith('http') 
      ? image 
      : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'}${image}`;
  };

  return (
    <Layout>
      <div className="admin-proposals-page">
        <div className="admin-proposals-header">
          <div>
            <h1>提案管理</h1>
            <p className="page-subtitle">审核和管理所有提案</p>
          </div>
        </div>

        {/* 状态筛选器 */}
        <div className="admin-proposals-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              待审核
              {proposals.filter(p => p.status === 'pending').length > 0 && (
                <span className="filter-count">{proposals.filter(p => p.status === 'pending').length}</span>
              )}
            </button>
            <button
              className={`filter-tab ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              进行中
            </button>
            <button
              className={`filter-tab ${statusFilter === 'passed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('passed')}
            >
              已通过
            </button>
            <button
              className={`filter-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              已拒绝
            </button>
            <button
              className={`filter-tab ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              全部
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* 提案列表 */}
        {loading ? (
          <div className="loading">加载中...</div>
        ) : proposals.length === 0 ? (
          <div className="empty-state">
            <p>暂无{statusFilter === 'pending' ? '待审核' : statusFilter ? '该状态' : ''}提案</p>
          </div>
        ) : (
          <div className="admin-proposals-list">
            {proposals.map((proposal) => {
              const statusStyle = getStatusStyle(proposal.status);
              return (
                <div key={proposal._id} className="admin-proposal-card">
                  <div className="proposal-card-header">
                    <div className="proposal-title-section">
                      <h3 className="proposal-title">{proposal.title}</h3>
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
                  </div>
                  
                  <div className="proposal-content">
                    <p className="proposal-description">{proposal.description}</p>
                    
                    {proposal.images && proposal.images.length > 0 && (
                      <div className="proposal-images">
                        {proposal.images.map((image, index) => (
                          <img
                            key={index}
                            src={getImageUrl(image)}
                            alt={`提案图片 ${index + 1}`}
                            className="proposal-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="proposal-meta-info">
                    <div className="meta-item">
                      <span className="meta-label">提交人：</span>
                      <span className="meta-value">{proposal.author?.name || '未知用户'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">提交时间：</span>
                      <span className="meta-value">{formatDate(proposal.createdAt)}</span>
                    </div>
                    {proposal.category && (
                      <div className="meta-item">
                        <span className="meta-label">分类：</span>
                        <span className="meta-value">{proposal.category}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-label">投票：</span>
                      <span className="meta-value">👍 {proposal.votes?.upvotes || 0} 👎 {proposal.votes?.downvotes || 0}</span>
                    </div>
                  </div>

                  {/* 显示拒绝理由（如果已拒绝） */}
                  {proposal.status === 'rejected' && proposal.rejectionReason && (
                    <div className="rejection-reason-box">
                      <div className="rejection-reason-header">
                        <span className="rejection-icon">⚠️</span>
                        <span className="rejection-title">拒绝理由</span>
                      </div>
                      <p className="rejection-reason-text">{proposal.rejectionReason}</p>
                    </div>
                  )}

                  {/* 审核操作按钮（仅待审核状态显示） */}
                  {proposal.status === 'pending' && (
                    <div className="proposal-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleReviewProposal(proposal._id, 'active')}
                      >
                        ✓ 通过审核
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleRejectClick(proposal._id)}
                      >
                        ✗ 拒绝
                      </button>
                    </div>
                  )}

                  {/* 已审核提案的操作 */}
                  {proposal.status !== 'pending' && (
                    <div className="proposal-actions">
                      {proposal.status === 'active' && (
                        <button
                          className="btn-close"
                          onClick={() => handleReviewProposal(proposal._id, 'closed')}
                        >
                          关闭提案
                        </button>
                      )}
                      {(proposal.status === 'rejected' || proposal.status === 'closed') && (
                        <button
                          className="btn-reactivate"
                          onClick={() => handleReviewProposal(proposal._id, 'active')}
                        >
                          重新激活
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 拒绝理由模态框 */}
        {showRejectModal && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>拒绝提案</h3>
                <button 
                  className="modal-close"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectingProposalId(null);
                    setError('');
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-description">请填写拒绝该提案的理由，该理由将同步给提案提交者。</p>
                <div className="form-group">
                  <label htmlFor="rejectReason">拒绝理由 *</label>
                  <textarea
                    id="rejectReason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请输入拒绝理由..."
                    rows={5}
                    required
                    className="reject-reason-input"
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectingProposalId(null);
                    setError('');
                  }}
                >
                  取消
                </button>
                <button
                  className="btn-reject"
                  onClick={handleConfirmReject}
                >
                  确认拒绝
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminProposals;

