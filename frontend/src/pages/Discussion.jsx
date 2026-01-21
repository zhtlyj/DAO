import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { proposalAPI } from '../services/api';
import './Discussion.css';

const Discussion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyDiscussions();
  }, []);

  const fetchMyDiscussions = async () => {
    try {
      setLoading(true);
      const response = await proposalAPI.getMyDiscussions({ limit: 100 });
      setProposals(response.data.proposals || []);
    } catch (err) {
      console.error('获取我的讨论失败:', err);
      setError(err.response?.data?.message || '获取讨论数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      active: { bg: '#dbeafe', color: '#2563eb', text: '进行中' },
      passed: { bg: '#d1fae5', color: '#059669', text: '已通过' },
      closed: { bg: '#f3f4f6', color: '#6b7280', text: '已关闭' }
    };
    return styles[status] || styles.active;
  };

  const getVoteType = (proposal) => {
    if (!proposal?.votes?.voterRecords || !user) return null;
    const record = proposal.votes.voterRecords.find(
      (r) => r.user?._id === user._id || r.user?.toString() === user._id
    );
    return record?.voteType || null;
  };

  const getVoteStyle = (voteType) => {
    const styles = {
      upvote: { bg: '#dbeafe', color: '#2563eb', text: '支持', icon: '👍' },
      downvote: { bg: '#fee2e2', color: '#dc2626', text: '反对', icon: '👎' },
      abstain: { bg: '#fef3c7', color: '#d97706', text: '弃权', icon: '🤷' }
    };
    return styles[voteType] || null;
  };

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

  const stats = useMemo(() => {
    const total = proposals.length;
    const voteCounts = proposals.reduce(
      (acc, p) => {
        const vt = getVoteType(p);
        if (vt && acc[vt] !== undefined) acc[vt] += 1;
        return acc;
      },
      { upvote: 0, downvote: 0, abstain: 0 }
    );
    return { total, ...voteCounts };
  }, [proposals]);

  return (
    <Layout>
      <div className="discussion-page">
        <div className="discussion-header">
          <div>
            <h1>我的讨论</h1>
            <p className="page-subtitle">查看你参与过的讨论话题及投票</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>

        <div className="discussion-stats">
          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">参与话题</div>
            </div>
          </div>
          <div className="stat-card stat-upvote">
            <div className="stat-icon">👍</div>
            <div className="stat-content">
              <div className="stat-value">{stats.upvote}</div>
              <div className="stat-label">已投支持</div>
            </div>
          </div>
          <div className="stat-card stat-downvote">
            <div className="stat-icon">👎</div>
            <div className="stat-content">
              <div className="stat-value">{stats.downvote}</div>
              <div className="stat-label">已投反对</div>
            </div>
          </div>
          <div className="stat-card stat-abstain">
            <div className="stat-icon">🤷</div>
            <div className="stat-content">
              <div className="stat-value">{stats.abstain}</div>
              <div className="stat-label">已投弃权</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : proposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>暂无参与的讨论</p>
            <p className="empty-hint">去提案详情下发表评论或投票吧</p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              去首页
            </button>
          </div>
        ) : (
          <div className="discussion-list">
            {proposals.map((proposal) => {
              const voteType = getVoteType(proposal);
              const voteStyle = getVoteStyle(voteType);
              const statusStyle = getStatusStyle(proposal.status);
              return (
                <div key={proposal._id} className="discussion-card">
                  <div className="discussion-card-header">
                    <div className="discussion-title-wrap">
                      <h3 className="discussion-title">{proposal.title}</h3>
                      <span
                        className="discussion-status"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color
                        }}
                      >
                        {statusStyle.text}
                      </span>
                    </div>
                    {voteStyle && (
                      <span
                        className="discussion-vote-badge"
                        style={{
                          backgroundColor: voteStyle.bg,
                          color: voteStyle.color
                        }}
                      >
                        <span className="vote-badge-icon">{voteStyle.icon}</span>
                        {voteStyle.text}
                      </span>
                    )}
                  </div>

                  <p className="discussion-description">{proposal.description}</p>

                  <div className="discussion-meta">
                    <span className="meta-item">
                      <span className="meta-icon">🗳️</span>
                      支持 {proposal.votes?.upvotes || 0} · 反对 {proposal.votes?.downvotes || 0} · 弃权 {proposal.votes?.abstains || 0}
                    </span>
                    {proposal.updatedAt && (
                      <span className="meta-item">
                        <span className="meta-icon">⏰</span>
                        更新于 {formatTimeShort(proposal.updatedAt)}
                      </span>
                    )}
                  </div>

                  {proposal.comments?.length > 0 && (
                    <div className="discussion-snippet">
                      <div className="snippet-header">
                        <span className="snippet-icon">💬</span>
                        <span className="snippet-title">最近讨论</span>
                      </div>
                      <div className="snippet-content">
                        {proposal.comments.slice(0, 2).map((c) => (
                          <div key={c._id} className="snippet-item">
                            <span className="snippet-author">{c.user?.name || '匿名用户'}：</span>
                            <span className="snippet-text">{c.content}</span>
                          </div>
                        ))}
                        {proposal.comments.length > 2 && <span className="snippet-more">… 共 {proposal.comments.length} 条讨论</span>}
                      </div>
                    </div>
                  )}

                  <div className="discussion-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => navigate('/my-votes')}
                    >
                      查看我的投票
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => navigate('/')}
                    >
                      去详情继续讨论
                    </button>
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

export default Discussion;

