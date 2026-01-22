import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { settingsAPI } from '../services/api';
import './AdminSettings.css';

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    points: {
      proposal: 20,
      vote: 2,
      comment: 1
    },
    proposal: {
      titleMaxLength: 200,
      minDescriptionLength: 10,
      maxImages: 5,
      maxImageSize: 5
    },
    voting: {
      defaultDurationDays: 7,
      allowVoteChange: true,
      minVotersRequired: 0,
      resultCalculation: 'simple'
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await settingsAPI.getSettings();
      const data = res.data;
      setSettings(data);
      setFormData({
        points: {
          proposal: data.points?.proposal || 20,
          vote: data.points?.vote || 2,
          comment: data.points?.comment || 1
        },
        proposal: {
          titleMaxLength: data.proposal?.titleMaxLength || 200,
          minDescriptionLength: data.proposal?.minDescriptionLength || 10,
          maxImages: data.proposal?.maxImages || 5,
          maxImageSize: data.proposal?.maxImageSize ? data.proposal.maxImageSize / (1024 * 1024) : 5
        },
        voting: {
          defaultDurationDays: data.voting?.defaultDurationDays || 7,
          allowVoteChange: data.voting?.allowVoteChange !== undefined ? data.voting.allowVoteChange : true,
          minVotersRequired: data.voting?.minVotersRequired || 0,
          resultCalculation: data.voting?.resultCalculation || 'simple'
        }
      });
    } catch (err) {
      console.error('获取设置失败:', err);
      setError(err.response?.data?.message || '获取设置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        points: formData.points,
        proposal: {
          ...formData.proposal,
          maxImageSize: formData.proposal.maxImageSize * 1024 * 1024 // 转换为字节
        },
        voting: formData.voting
      };

      await settingsAPI.updateSettings(submitData);
      setSuccess('设置保存成功！');
      await fetchSettings(); // 重新获取最新设置
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('保存设置失败:', err);
      setError(err.response?.data?.message || '保存设置失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="admin-settings-page">
          <div className="loading">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="admin-settings-page">
        <div className="settings-header">
          <div>
            <h1>系统设置</h1>
            <p className="page-subtitle">配置系统参数和规则</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="settings-form">
          {/* 积分规则 */}
          <div className="settings-section">
            <div className="section-header">
              <h2>积分规则</h2>
              <p className="section-desc">配置用户参与活动获得的积分</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="proposal-points">每个提案积分</label>
                <input
                  type="number"
                  id="proposal-points"
                  min="0"
                  value={formData.points.proposal}
                  onChange={(e) => handleChange('points', 'proposal', parseInt(e.target.value) || 0)}
                  required
                />
                <span className="form-hint">用户提交一个提案获得的积分</span>
              </div>
              <div className="form-group">
                <label htmlFor="vote-points">每次投票积分</label>
                <input
                  type="number"
                  id="vote-points"
                  min="0"
                  value={formData.points.vote}
                  onChange={(e) => handleChange('points', 'vote', parseInt(e.target.value) || 0)}
                  required
                />
                <span className="form-hint">用户参与一次投票获得的积分</span>
              </div>
              <div className="form-group">
                <label htmlFor="comment-points">每条评论/回复积分</label>
                <input
                  type="number"
                  id="comment-points"
                  min="0"
                  value={formData.points.comment}
                  onChange={(e) => handleChange('points', 'comment', parseInt(e.target.value) || 0)}
                  required
                />
                <span className="form-hint">用户发表一条评论或回复获得的积分</span>
              </div>
            </div>
          </div>

          {/* 提案规则 */}
          <div className="settings-section">
            <div className="section-header">
              <h2>提案规则</h2>
              <p className="section-desc">配置提案提交的限制和要求</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title-max">标题最大长度</label>
                <input
                  type="number"
                  id="title-max"
                  min="10"
                  max="500"
                  value={formData.proposal.titleMaxLength}
                  onChange={(e) => handleChange('proposal', 'titleMaxLength', parseInt(e.target.value) || 10)}
                  required
                />
                <span className="form-hint">提案标题允许的最大字符数</span>
              </div>
              <div className="form-group">
                <label htmlFor="desc-min">描述最小长度</label>
                <input
                  type="number"
                  id="desc-min"
                  min="1"
                  value={formData.proposal.minDescriptionLength}
                  onChange={(e) => handleChange('proposal', 'minDescriptionLength', parseInt(e.target.value) || 1)}
                  required
                />
                <span className="form-hint">提案描述要求的最小字符数</span>
              </div>
              <div className="form-group">
                <label htmlFor="max-images">最多图片数</label>
                <input
                  type="number"
                  id="max-images"
                  min="1"
                  max="10"
                  value={formData.proposal.maxImages}
                  onChange={(e) => handleChange('proposal', 'maxImages', parseInt(e.target.value) || 1)}
                  required
                />
                <span className="form-hint">每个提案最多可上传的图片数量</span>
              </div>
              <div className="form-group">
                <label htmlFor="max-image-size">图片最大大小 (MB)</label>
                <input
                  type="number"
                  id="max-image-size"
                  min="1"
                  max="20"
                  step="0.5"
                  value={formData.proposal.maxImageSize}
                  onChange={(e) => handleChange('proposal', 'maxImageSize', parseFloat(e.target.value) || 1)}
                  required
                />
                <span className="form-hint">单张图片允许的最大大小（单位：MB）</span>
              </div>
            </div>
          </div>

          {/* 投票规则 */}
          <div className="settings-section">
            <div className="section-header">
              <h2>投票规则</h2>
              <p className="section-desc">配置投票相关的规则和限制</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="default-duration">默认投票持续天数</label>
                <input
                  type="number"
                  id="default-duration"
                  min="1"
                  max="30"
                  value={formData.voting.defaultDurationDays}
                  onChange={(e) => handleChange('voting', 'defaultDurationDays', parseInt(e.target.value) || 1)}
                  required
                />
                <span className="form-hint">创建提案时默认的投票持续天数</span>
              </div>
              <div className="form-group">
                <label htmlFor="min-voters">最小投票人数要求</label>
                <input
                  type="number"
                  id="min-voters"
                  min="0"
                  value={formData.voting.minVotersRequired}
                  onChange={(e) => handleChange('voting', 'minVotersRequired', parseInt(e.target.value) || 0)}
                  required
                />
                <span className="form-hint">提案通过所需的最小投票人数（0表示无要求）</span>
              </div>
              <div className="form-group form-group-full">
                <label htmlFor="result-calculation">投票结果计算方式</label>
                <select
                  id="result-calculation"
                  value={formData.voting.resultCalculation}
                  onChange={(e) => handleChange('voting', 'resultCalculation', e.target.value)}
                >
                  <option value="simple">简单多数（支持票最多即通过）</option>
                  <option value="absolute">绝对多数（支持票需超过总票数50%）</option>
                </select>
                <span className="form-hint">决定提案是否通过的计算方式</span>
              </div>
              <div className="form-group form-group-full">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.voting.allowVoteChange}
                    onChange={(e) => handleChange('voting', 'allowVoteChange', e.target.checked)}
                  />
                  <span>允许用户修改已投的票</span>
                </label>
                <span className="form-hint">开启后，用户可以在投票期内修改自己的投票选择</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '保存中...' : '保存设置'}
            </button>
            <button type="button" className="btn-secondary" onClick={fetchSettings} disabled={saving}>
              重置
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AdminSettings;

