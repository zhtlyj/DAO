import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { proposalAPI } from '../services/api';
import { getProposalCountFromChain } from '../utils/contract';
import './Proposals.css';

const Proposals = () => {
  const { user } = useAuth();
  const { contract, isConnected, account, network, provider } = useWallet();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    visibility: 'all',
    startTime: '',
    endTime: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 所有登录用户都可以提交提案
  const canCreateProposal = !!user;

  // 获取提案列表
  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const params = { limit: 20, scope: 'mine' }; // 只获取当前用户提交的提案
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

  // 处理图片选择
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // 限制最多5张图片
    if (selectedImages.length + files.length > 5) {
      setError('最多只能上传5张图片');
      return;
    }

    // 验证文件类型和大小
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('只能上传图片文件');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('图片大小不能超过5MB');
        return false;
      }
      return true;
    });

    setSelectedImages([...selectedImages, ...validFiles]);

    // 生成预览
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 移除图片
  const handleRemoveImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // 提交提案
  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('请填写提案标题和描述');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('请选择开始时间和结束时间');
      return;
    }

    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    const now = new Date();

    if (endTime <= startTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    if (startTime < now) {
      setError('开始时间不能早于当前时间');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      let chainProposalId = null;
      let chainTransactionHash = null;
      let gasUsed = null;
      let gasPrice = null;
      let transactionFee = null;
      let blockNumber = null;
      
      // 如果已连接钱包，先在链上创建提案
      if (isConnected && contract) {
        try {
          setError('正在创建链上提案，请确认 MetaMask 交易...');
          
          // 转换时间戳
          const startTimestamp = Math.floor(startTime.getTime() / 1000);
          const endTimestamp = Math.floor(endTime.getTime() / 1000);
          
          // 调用合约创建提案
          console.log('调用合约创建提案...', { title: formData.title, startTimestamp, endTimestamp });
          const tx = await contract.createProposal(
            formData.title,
            formData.description,
            startTimestamp,
            endTimestamp
          );
          
          console.log('交易已发送，等待确认...', { hash: tx.hash });
          
          // 等待交易确认
          const receipt = await tx.wait();
          console.log('交易已确认', { 
            hash: receipt.hash, 
            status: receipt.status,
            blockNumber: receipt.blockNumber,
            logsCount: receipt.logs?.length || 0
          });
          
          // 检查交易状态
          if (receipt.status !== 1) {
            throw new Error('交易失败，状态码: ' + receipt.status);
          }
          
          // 保存交易哈希和gas信息
          chainTransactionHash = receipt.hash;
          gasUsed = receipt.gasUsed?.toString() || null;
          
          // 在ethers v6中，gasPrice需要从交易响应中获取
          // 优先从原始交易获取，然后从receipt，最后从provider获取
          if (tx.gasPrice) {
            gasPrice = tx.gasPrice.toString();
          } else if (receipt.gasPrice) {
            gasPrice = receipt.gasPrice.toString();
          } else if (provider) {
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
          
          console.log('Gas信息:', { gasUsed, gasPrice, transactionFee, blockNumber });
          
          console.log('Gas信息:', { gasUsed, gasPrice, transactionFee, blockNumber });
          
          // 从事件中获取提案ID
          if (receipt.logs && receipt.logs.length > 0) {
            const iface = contract.interface;
            const eventTopic = iface.getEvent('ProposalCreated').topicHash;
            
            // 查找 ProposalCreated 事件
            for (const log of receipt.logs) {
              if (log.topics && log.topics[0] === eventTopic && log.topics[1]) {
                // topics[1] 是提案ID（indexed uint256）
                chainProposalId = Number(BigInt(log.topics[1]));
                console.log('从事件中获取到提案ID:', chainProposalId);
                break;
              }
            }
            
            // 如果从 topics 获取失败，尝试解析日志
            if (chainProposalId === null) {
              for (const log of receipt.logs) {
                try {
                  const parsedLog = iface.parseLog(log);
                  if (parsedLog && parsedLog.name === 'ProposalCreated') {
                    chainProposalId = Number(parsedLog.args[0]);
                    console.log('从解析日志获取到提案ID:', chainProposalId);
                    break;
                  }
                } catch (e) {
                  // 继续尝试下一个日志
                }
              }
            }
          }
          
          // 如果仍然无法获取提案ID，尝试从合约查询
          if (chainProposalId === null) {
            try {
              const count = await getProposalCountFromChain(
                contract,
                network || 'sepolia'
              );
              chainProposalId = Number(count);
              console.log('从合约提案数量获取提案ID:', chainProposalId);
            } catch (e) {
              console.warn('无法获取提案ID:', e);
            }
          }
          
          if (chainProposalId !== null) {
            console.log('✅ 链上提案创建成功！', { 
              proposalId: chainProposalId, 
              txHash: chainTransactionHash 
            });
            // 显示成功提示
            alert(`✅ 链上提案创建成功！\n提案ID: ${chainProposalId}\n交易哈希: ${chainTransactionHash}\nGas使用: ${gasUsed || 'N/A'}\nETH消耗: ${transactionFee ? ethers.formatEther(transactionFee) : 'N/A'} ETH`);
          }
        } catch (chainError) {
          console.error('链上创建提案失败:', chainError);
          const errorMessage = chainError.message || chainError.toString();
          
          // 根据错误类型给出提示
          if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
            setError('您已取消交易，提案将仅保存到数据库。');
          } else if (errorMessage.includes('insufficient funds')) {
            setError('账户余额不足，无法支付 gas 费用。提案将仅保存到数据库。');
          } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Failed to fetch')) {
            setError('无法连接到区块链网络。请确保 Hardhat 节点正在运行 (npm run node)。提案将仅保存到数据库。');
          } else {
            setError(`链上创建提案失败: ${errorMessage}。提案将仅保存到数据库。`);
          }
          // 继续提交到数据库，不阻止用户
        }
      }
      
      // 创建FormData
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('visibility', formData.visibility);
      submitData.append('startTime', new Date(formData.startTime).toISOString());
      submitData.append('endTime', new Date(formData.endTime).toISOString());
      
      // 如果链上创建成功，添加链上信息
      if (chainProposalId !== null) {
        submitData.append('chainProposalId', chainProposalId.toString());
        submitData.append('chainAddress', account);
      }
      if (chainTransactionHash) {
        submitData.append('chainTransactionHash', chainTransactionHash);
        // 添加gas信息（如果存在）
        if (typeof gasUsed !== 'undefined' && gasUsed !== null) {
          submitData.append('gasUsed', gasUsed);
        }
        if (typeof gasPrice !== 'undefined' && gasPrice !== null) {
          submitData.append('gasPrice', gasPrice);
        }
        if (typeof transactionFee !== 'undefined' && transactionFee !== null) {
          submitData.append('transactionFee', transactionFee);
        }
        if (typeof blockNumber !== 'undefined' && blockNumber !== null) {
          submitData.append('blockNumber', blockNumber.toString());
        }
      }
      if (network) {
        submitData.append('network', network);
      }
      
      // 添加图片
      selectedImages.forEach((image) => {
        submitData.append('images', image);
      });

      // 提交到后端
      await proposalAPI.createProposal(submitData);
      
      // 清空表单
      setFormData({ title: '', description: '', category: 'general', visibility: 'all', startTime: '', endTime: '' });
      setSelectedImages([]);
      setImagePreviews([]);
      setShowCreateForm(false);
      setError(''); // 清除错误提示
      
      // 刷新列表
      fetchProposals();
    } catch (error) {
      console.error('提交提案失败:', error);
      setError(error.response?.data?.message || '提交提案失败，请稍后重试');
    } finally {
      setSubmitting(false);
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

  // 检查是否是提案作者
  const isAuthor = (proposal) => {
    return user && proposal.author?._id === user._id;
  };

  // 检查是否是管理员
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // 处理编辑提案
  const handleEdit = (proposalId) => {
    // 可以导航到编辑页面或打开编辑表单
    console.log('编辑提案:', proposalId);
  };

  // 处理删除提案
  const handleDelete = async (proposalId) => {
    if (!window.confirm('确定要删除这个提案吗？')) {
      return;
    }

    try {
      await proposalAPI.deleteProposal(proposalId);
      fetchProposals(); // 刷新列表
    } catch (error) {
      setError(error.response?.data?.message || '删除提案失败，请稍后重试');
    }
  };

  return (
    <Layout>
      <div className="proposals-page">
        <div className="proposals-header">
          <h1>提案管理</h1>
          {canCreateProposal && (
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? '取消' : '+ 提交提案'}
            </button>
          )}
        </div>

        {/* 提交提案表单 */}
        {showCreateForm && canCreateProposal && (
          <div className="create-proposal-form">
            <div className="form-header">
              <div className="form-header-icon">📝</div>
              <div>
                <h2>提交新提案</h2>
                <p className="form-subtitle">填写以下信息提交您的治理提案</p>
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmitProposal}>
              <div className="form-group">
                <label htmlFor="title">提案标题 *</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入提案标题"
                  maxLength={200}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">提案描述 *</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请详细描述您的提案内容..."
                  rows={6}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">分类</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="general">通用</option>
                  <option value="academic">学术</option>
                  <option value="campus">校园</option>
                  <option value="welfare">福利</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="visibility">可视范围 *</label>
                <select
                  id="visibility"
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  required
                >
                  <option value="all">全部可见</option>
                  {user?.role === 'student' && <option value="student">仅学生可见</option>}
                  {user?.role === 'teacher' && <option value="teacher">仅教师可见</option>}
                </select>
                <span className="form-hint">
                  {user?.role === 'student' && '学生只能创建"全部可见"或"仅学生可见"的提案'}
                  {user?.role === 'teacher' && '教师只能创建"全部可见"或"仅教师可见"的提案'}
                  {!['student', 'teacher'].includes(user?.role) && '选择该提案的可见范围'}
                </span>
              </div>
              <div className="form-group form-time-group">
                <div className="time-input-wrapper">
                  <label htmlFor="startTime">开始时间 *</label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div className="time-input-wrapper">
                  <label htmlFor="endTime">结束时间 *</label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    min={formData.startTime || new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="images">
                  <span>上传图片</span>
                  <span className="label-hint">（最多5张，每张不超过5MB）</span>
                </label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="file-input"
                  />
                  <label htmlFor="images" className="file-upload-label">
                    <div className="file-upload-icon">📷</div>
                    <div className="file-upload-text">
                      <span className="file-upload-main">点击或拖拽图片到此处</span>
                      <span className="file-upload-sub">支持 JPG、PNG、GIF 格式</span>
                    </div>
                  </label>
                  {selectedImages.length > 0 && (
                    <div className="file-upload-count">
                      已选择 {selectedImages.length} / 5 张图片
                    </div>
                  )}
                </div>
                {imagePreviews.length > 0 && (
                  <div className="image-preview-container">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="image-preview-item">
                        <div className="image-preview-overlay">
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() => handleRemoveImage(index)}
                            title="删除图片"
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                        <img src={preview} alt={`预览 ${index + 1}`} />
                        <div className="image-preview-number">{index + 1}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? '提交中...' : '提交提案'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ title: '', description: '', category: 'general', visibility: 'all', startTime: '', endTime: '' });
                    setSelectedImages([]);
                    setImagePreviews([]);
                    setError('');
                  }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 筛选器和提案列表 - 只在未显示提交表单时显示 */}
        {!showCreateForm && (
          <>
            {/* 筛选器 */}
            <div className="proposals-filters">
              <div className="filter-group">
                <label htmlFor="status-filter">状态筛选：</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="pending">待审核</option>
                  <option value="active">进行中</option>
                  <option value="passed">已通过</option>
                  <option value="rejected">已拒绝</option>
                  <option value="closed">已关闭</option>
                </select>
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
                <p>暂无提案</p>
                {canCreateProposal && (
                  <button 
                    className="btn-primary"
                    onClick={() => setShowCreateForm(true)}
                  >
                    提交第一个提案
                  </button>
                )}
              </div>
            ) : (
          <div className="proposals-list">
            {proposals.map((proposal) => {
              const statusStyle = getStatusStyle(proposal.status);
              const canEdit = isAuthor(proposal) || isAdmin();
              return (
                <div key={proposal._id} className="proposal-card">
                  <div className="proposal-header">
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
                  <p className="proposal-description">{proposal.description}</p>
                  
                  {/* 显示拒绝理由 */}
                  {proposal.status === 'rejected' && proposal.rejectionReason && (
                    <div className="rejection-reason-box">
                      <div className="rejection-reason-header">
                        <span className="rejection-icon">⚠️</span>
                        <span className="rejection-title">拒绝理由</span>
                      </div>
                      <p className="rejection-reason-text">{proposal.rejectionReason}</p>
                    </div>
                  )}
                  
                  {proposal.images && proposal.images.length > 0 && (
                    <div className="proposal-images">
                      {proposal.images.map((image, index) => {
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
                    </div>
                  )}
                  <div className="proposal-footer">
                    <div className="proposal-meta">
                      <span className="proposal-author">
                        {proposal.author?.name || '未知用户'}
                      </span>
                      <span className="proposal-date">
                        {formatDate(proposal.createdAt)}
                      </span>
                      {proposal.category && (
                        <span className="proposal-category">
                          {proposal.category}
                        </span>
                      )}
                    </div>
                    <div className="proposal-actions">
                      <div className="proposal-stats">
                        <span>👍 {proposal.votes?.upvotes || 0}</span>
                        <span>👎 {proposal.votes?.downvotes || 0}</span>
                        <span>💬 {proposal.comments?.length || 0}</span>
                      </div>
                      {canEdit && (
                        <div className="proposal-buttons">
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit(proposal._id)}
                          >
                            编辑
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(proposal._id)}
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Proposals;

