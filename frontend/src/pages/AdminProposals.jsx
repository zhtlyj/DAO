import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { proposalAPI } from '../services/api';
import './AdminProposals.css';

const AdminProposals = () => {
  const { user } = useAuth();
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

  // 审核提案（通过）
  const handleReviewProposal = async (proposalId, status) => {
    try {
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

