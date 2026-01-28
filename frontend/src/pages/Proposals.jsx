import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { proposalAPI } from '../services/api';
import { createProposalOnChain, VoteType } from '../utils/contract';
import './Proposals.css';

const Proposals = () => {
  const { user } = useAuth();
  const { contract, isConnected, account, network } = useWallet();
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
      
      // 如果已连接钱包，先在链上创建提案
      if (isConnected && contract) {
        try {
          // 显示提示信息
          setError('正在创建链上提案，请确认 MetaMask 交易...');
          
          // 验证合约地址和代码
          let contractValid = false;
          try {
            const contractAddress = await contract.getAddress();
            const code = await contract.runner.provider.getCode(contractAddress);
            console.log('合约地址:', contractAddress);
            console.log('合约代码长度:', code?.length || 0);
            if (!code || code === '0x' || code.length <= 2) {
              // 合约不存在，给出友好提示但不阻止提交
              console.warn('⚠️ 警告：合约地址没有代码，合约可能未部署到当前网络');
              console.warn('请确保：');
              console.warn('1. Hardhat 节点正在运行 (npm run node)');
              console.warn('2. 合约已部署到 localhost 网络 (npm run deploy:local)');
              console.warn('3. MetaMask 连接到正确的网络 (localhost:8545, chainId: 1337)');
              setError('警告：合约未部署到当前网络。提案将仅保存到数据库。请先部署合约到 localhost 网络。');
              contractValid = false;
            } else {
              console.log('✅ 合约验证通过，代码长度:', code.length);
              contractValid = true;
            }
          } catch (verifyError) {
            console.error('合约验证失败:', verifyError);
            setError('警告：无法验证合约。提案将仅保存到数据库。请检查合约部署和网络配置。');
            contractValid = false;
          }
          
          // 如果合约无效，跳过链上操作，直接提交到数据库
          if (!contractValid) {
            console.log('合约验证失败，跳过链上操作，直接提交到数据库');
            // 不执行链上操作，直接跳到数据库提交
          } else {
            // 合约有效，继续执行链上操作
            try {
              const startTimestamp = Math.floor(startTime.getTime() / 1000);
              const endTimestamp = Math.floor(endTime.getTime() / 1000);
              
              // 在创建提案前获取当前提案数量（可选，失败不影响后续流程）
              // 注意：如果合约地址不正确或网络不匹配，这个方法会失败
              let currentCount = 0;
              try {
                // 添加超时处理，避免长时间等待
                const countPromise = contract.getProposalCount();
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('获取提案数量超时')), 10000)
                );
                const count = await Promise.race([countPromise, timeoutPromise]);
                // 检查返回值是否有效（排除 '0x'、null、undefined 等无效值）
                const countStr = count?.toString() || '';
                if (countStr && countStr !== '0x' && countStr !== '0x0' && !isNaN(Number(count))) {
                  currentCount = Number(count);
                  console.log('获取到当前提案数量:', currentCount);
                } else {
                  console.warn('获取到的提案数量无效:', countStr, '这可能是合约地址或网络配置问题');
                }
              } catch (countError) {
                console.warn('无法获取当前提案数量，将从事件中获取:', countError);
                // 如果获取失败，继续尝试从事件中获取，不影响后续流程
                // 这通常意味着合约地址不正确或网络不匹配
              }
              
              // 调用合约方法创建提案，添加超时处理
              console.log('开始创建链上提案...', { title: formData.title, startTimestamp, endTimestamp });
              const createPromise = contract.createProposal(
                formData.title,
                formData.description,
                startTimestamp,
                endTimestamp
              );
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('创建提案交易超时')), 120000) // 2分钟超时
              );
              
              const tx = await Promise.race([createPromise, timeoutPromise]);
              console.log('交易已发送，等待确认...', { hash: tx.hash });
              
              // 等待交易确认，添加超时处理
              const waitPromise = tx.wait();
              const waitTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('等待交易确认超时')), 120000) // 2分钟超时
              );
              
              const receipt = await Promise.race([waitPromise, waitTimeoutPromise]);
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
              
              // 检查事件日志
              const contractAddress = await contract.getAddress();
              let hasEventLogs = receipt.logs && receipt.logs.length > 0;
              
              if (!hasEventLogs) {
                console.error('❌ 严重警告：交易成功但没有事件日志！');
                console.error('合约地址:', contractAddress);
                console.error('交易哈希:', receipt.hash);
                console.error('交易状态:', receipt.status);
                console.error('这可能意味着：');
                console.error('1. 合约地址不正确');
                console.error('2. 合约未正确部署');
                console.error('3. 网络配置不匹配');
                console.error('4. 调用的合约方法不存在或签名不匹配');
                
                // 验证合约代码
                try {
                  const code = await contract.runner.provider.getCode(contractAddress);
                  if (!code || code === '0x') {
                    console.error(`❌ 合约地址 ${contractAddress} 没有代码，合约未部署或地址错误`);
                    setError(`警告：合约地址 ${contractAddress} 没有代码。交易已发送但可能未正确执行。提案将仅保存到数据库。`);
                  } else {
                    console.warn('⚠️ 合约代码存在，但交易没有产生事件日志。可能是调用了错误的合约方法或合约版本不匹配。');
                    setError(`警告：交易成功但没有事件日志。合约地址: ${contractAddress}。提案将仅保存到数据库。`);
                  }
                } catch (codeError) {
                  console.error('合约验证失败:', codeError);
                  setError(`警告：无法验证合约。${codeError.message}。提案将仅保存到数据库。`);
                }
                // 不抛出错误，允许继续提交到数据库
              }
              
              // 方法1: 从事件中获取提案ID（最可靠的方法）
              if (hasEventLogs) {
                const iface = contract.interface;
                console.log('开始解析事件日志，日志数量:', receipt.logs.length);
                
                // 方法1a: 使用 parseLog 解析
                for (const log of receipt.logs) {
                  try {
                    const parsedLog = iface.parseLog(log);
                    if (parsedLog && parsedLog.name === 'ProposalCreated') {
                      chainProposalId = Number(parsedLog.args[0]);
                      console.log('从事件中获取到提案ID (parseLog):', chainProposalId);
                      break;
                    }
                  } catch (e) {
                    // 继续尝试下一个日志
                  }
                }
                
                // 方法1b: 如果 parseLog 失败，尝试使用事件过滤器
                if (chainProposalId === null) {
                  try {
                    const eventFilter = iface.getEvent('ProposalCreated');
                    const decodedLogs = receipt.logs
                      .map(log => {
                        try {
                          return iface.parseLog(log);
                        } catch (e) {
                          return null;
                        }
                      })
                      .filter(log => log && log.name === 'ProposalCreated');
                    
                    if (decodedLogs.length > 0) {
                      chainProposalId = Number(decodedLogs[0].args[0]);
                      console.log('从事件中获取到提案ID (事件过滤器):', chainProposalId);
                    }
                  } catch (e) {
                    console.warn('使用事件过滤器解析失败:', e);
                  }
                }
                
                // 方法1c: 如果前两种方法都失败，尝试直接解码事件数据
                if (chainProposalId === null) {
                  try {
                    const eventTopic = iface.getEvent('ProposalCreated').topicHash;
                    console.log('ProposalCreated 事件主题:', eventTopic);
                    for (const log of receipt.logs) {
                      console.log('检查日志:', { 
                        topics: log.topics, 
                        address: log.address,
                        data: log.data 
                      });
                      if (log.topics && log.topics.length > 0 && log.topics[0] === eventTopic) {
                        // 第一个 indexed 参数是 proposalId (topics[1])
                        // 第二个 indexed 参数是 proposer (topics[2])
                        if (log.topics[1]) {
                          // 将 hex 字符串转换为 BigInt，再转换为 Number
                          const proposalIdBigInt = BigInt(log.topics[1]);
                          chainProposalId = Number(proposalIdBigInt);
                          console.log('从事件主题中获取到提案ID:', chainProposalId);
                          break;
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('直接解码事件数据失败:', e);
                  }
                }
              }
              
              // 方法2: 如果无法从事件中获取，说明事件解析失败，尝试其他方法
              // 注意：如果事件日志为空，上面的检查已经抛出错误
              
              // 方法3: 如果无法从事件中获取，使用创建后的数量（最不可靠，但作为备选）
              // 创建后 proposalCount 已经增加，所以新提案ID就是当前的 proposalCount
              if (chainProposalId === null) {
                try {
                  console.log('尝试从合约获取最新提案数量...');
                  const newCountPromise = contract.getProposalCount();
                  const newCountTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('获取提案数量超时')), 10000)
                  );
                  const newCount = await Promise.race([newCountPromise, newCountTimeoutPromise]);
                  // 检查返回值是否有效（排除 '0x'、null、undefined 等无效值）
                  const newCountStr = newCount?.toString() || '';
                  console.log('获取到的最新提案数量 (原始值):', newCountStr);
                  if (newCountStr && newCountStr !== '0x' && newCountStr !== '0x0' && !isNaN(Number(newCount))) {
                    chainProposalId = Number(newCount); // 创建后 proposalCount 已经增加，所以就是新提案ID
                    console.log('从最新提案数量获取提案ID:', chainProposalId);
                  } else {
                    console.warn('获取到的最新提案数量无效:', newCountStr);
                  }
                } catch (countError) {
                  console.warn('无法从合约获取提案ID，将仅保存到数据库:', countError);
                  // 不阻止用户提交，只是不保存链上提案ID
                }
              }
              
              // 如果仍然无法获取提案ID，给出警告但不阻止提交
              if (chainProposalId === null) {
                console.warn('警告：无法获取链上提案ID，提案将仅保存到数据库');
                setError('链上提案创建成功，但无法获取提案ID。提案将仅保存到数据库。');
              } else {
                console.log('成功获取链上提案ID:', chainProposalId);
                // 清除错误提示，显示成功消息
                setError('');
              }
              
              // 保存交易哈希
              if (receipt && receipt.hash) {
                chainTransactionHash = receipt.hash;
                console.log('交易哈希已保存:', chainTransactionHash);
              }
              
              // 显示成功提示
              if (chainProposalId !== null && chainTransactionHash) {
                console.log('✅ 链上提案创建成功！', { 
                  proposalId: chainProposalId, 
                  txHash: chainTransactionHash 
                });
              }
            } catch (chainError) {
              console.error('链上创建提案失败:', chainError);
              // 不阻止用户提交，允许仅保存到数据库
              const errorMessage = chainError.message || chainError.toString();
              // 如果是超时错误，给出更友好的提示
              if (errorMessage.includes('超时')) {
                setError('链上创建提案超时，提案将仅保存到数据库。请检查网络连接。');
              } else if (errorMessage.includes('aborted') || errorMessage.includes('signal')) {
                setError('链上创建提案被中断，提案将仅保存到数据库。请重试或检查 MetaMask 连接。');
              } else if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
                setError('您已取消交易，提案将仅保存到数据库。');
              } else if (errorMessage.includes('insufficient funds')) {
                setError('账户余额不足，无法支付 gas 费用。提案将仅保存到数据库。');
              } else {
                setError(`链上创建提案失败: ${errorMessage}。提案将仅保存到数据库。`);
              }
              // 不 return，允许继续提交到后端
            }
          }
        } catch (outerError) {
          console.error('外层错误:', outerError);
          setError(`提交提案时发生错误: ${outerError.message}。提案将仅保存到数据库。`);
        }
      } else {
        // 如果未连接钱包，提示用户
        console.log('未连接钱包，提案将仅保存到数据库');
      }
      
      // 创建FormData
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('visibility', formData.visibility);
      // 将本地时间转换为ISO格式
      submitData.append('startTime', new Date(formData.startTime).toISOString());
      submitData.append('endTime', new Date(formData.endTime).toISOString());
      
      // 如果链上创建成功，添加链上提案ID和交易信息
      if (chainProposalId !== null) {
        submitData.append('chainProposalId', chainProposalId.toString());
        submitData.append('chainAddress', account);
      }
      if (chainTransactionHash) {
        submitData.append('chainTransactionHash', chainTransactionHash);
      }
      if (network) {
        submitData.append('network', network);
      }
      
      // 添加图片
      selectedImages.forEach((image) => {
        submitData.append('images', image);
      });

      await proposalAPI.createProposal(submitData);
      setFormData({ title: '', description: '', category: 'general', visibility: 'all', startTime: '', endTime: '' });
      setSelectedImages([]);
      setImagePreviews([]);
      setShowCreateForm(false);
      fetchProposals(); // 刷新列表
    } catch (error) {
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

