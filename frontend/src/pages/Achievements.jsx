import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { achievementAPI } from '../services/api';
import './Achievements.css';

const Achievements = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await achievementAPI.getMyAchievements();
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || '获取成就失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const earnedCount = useMemo(() => data?.achievements?.filter((a) => a.earned).length || 0, [data]);

  return (
    <Layout>
      <div className="ach-page">
        <div className="ach-header">
          <div>
            <h1>个人成就与积分</h1>
            <p className="page-subtitle">参与提案、投票、讨论即可解锁成就并获得积分奖励</p>
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !data ? (
          <div className="empty-state">暂无数据</div>
        ) : (
          <>
            <div className="ach-summary">
              <div className="ach-card primary">
                <div className="ach-card-title">当前积分</div>
                <div className="ach-card-value">{data.points || 0}</div>
                <div className="ach-card-desc">累计积分可用于奖励兑换（待上线）</div>
              </div>
              <div className="ach-card">
                <div className="ach-card-title">已解锁成就</div>
                <div className="ach-card-value">{earnedCount}</div>
                <div className="ach-card-desc">共 {data.achievements?.length || 0} 个成就</div>
              </div>
              <div className="ach-card">
                <div className="ach-card-title">参与度</div>
                <div className="ach-card-stats">
                  <span>提案 {data.proposalCount || 0}</span>
                  <span>投票 {data.voteCount || 0}</span>
                  <span>讨论 {data.commentCount || 0}</span>
                </div>
                <div className="ach-card-desc">多参与可获得更多积分</div>
              </div>
            </div>

            <div className="ach-list">
              {data.achievements?.map((ach) => (
                <div key={ach.code} className={`ach-item ${ach.earned ? 'earned' : ''}`}>
                  <div className="ach-item-left">
                    <div className="ach-icon">{ach.earned ? '🏅' : '🎯'}</div>
                    <div>
                      <div className="ach-title">{ach.title}</div>
                      <div className="ach-desc">{ach.description}</div>
                    </div>
                  </div>
                  <div className="ach-item-right">
                    <div className="ach-reward">奖励 +{ach.reward} 积分</div>
                    <div className={`ach-status ${ach.earned ? 'ok' : ''}`}>
                      {ach.earned ? '已解锁' : '未解锁'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Achievements;

