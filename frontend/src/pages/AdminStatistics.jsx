import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { statisticsAPI } from '../services/api';
import './AdminStatistics.css';

const AdminStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await statisticsAPI.getOverview();
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || '获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const roleLabels = {
    student: '学生',
    teacher: '教师',
    student_representative: '学生代表',
    teacher_representative: '教师代表',
    admin: '管理员'
  };

  const statusLabels = {
    draft: '草稿',
    pending: '待审核',
    active: '进行中',
    passed: '已通过',
    rejected: '已拒绝',
    closed: '已关闭'
  };

  const roleList = useMemo(() => {
    if (!stats?.users?.byRole) return [];
    return Object.entries(stats.users.byRole).map(([k, v]) => ({
      key: k,
      label: roleLabels[k] || k,
      value: v
    }));
  }, [stats]);

  const statusList = useMemo(() => {
    if (!stats?.proposals?.byStatus) return [];
    return Object.entries(stats.proposals.byStatus).map(([k, v]) => ({
      key: k,
      label: statusLabels[k] || k,
      value: v
    }));
  }, [stats]);

  return (
    <Layout>
      <div className="stats-page">
        <div className="stats-header">
          <div>
            <h1>数据统计</h1>
            <p className="page-subtitle">系统关键指标概览（管理员）</p>
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !stats ? (
          <div className="empty-state">暂无统计数据</div>
        ) : (
          <>
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.users?.total || 0}</div>
                  <div className="stat-label">用户总数</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📄</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.proposals?.total || 0}</div>
                  <div className="stat-label">提案总数</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🚀</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.proposals?.active || 0}</div>
                  <div className="stat-label">进行中提案</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-content">
                  <div className="stat-value">
                    {(stats.discussions?.comments || 0) + (stats.discussions?.replies || 0)}
                  </div>
                  <div className="stat-label">讨论总量</div>
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stats-panel">
                <div className="panel-title">用户角色分布</div>
                <div className="panel-list">
                  {roleList.length === 0 ? (
                    <div className="empty-state small">暂无数据</div>
                  ) : (
                    roleList.map((item) => (
                      <div key={item.key} className="panel-row">
                        <span>{item.label}</span>
                        <span className="panel-value">{item.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="stats-panel">
                <div className="panel-title">提案状态分布</div>
                <div className="panel-list">
                  {statusList.length === 0 ? (
                    <div className="empty-state small">暂无数据</div>
                  ) : (
                    statusList.map((item) => (
                      <div key={item.key} className="panel-row">
                        <span>{item.label}</span>
                        <span className="panel-value">{item.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="stats-panel">
                <div className="panel-title">投票数据</div>
                <div className="panel-list">
                  <div className="panel-row">
                    <span>支持</span>
                    <span className="panel-value">{stats.votes?.upvotes || 0}</span>
                  </div>
                  <div className="panel-row">
                    <span>反对</span>
                    <span className="panel-value">{stats.votes?.downvotes || 0}</span>
                  </div>
                  <div className="panel-row">
                    <span>弃权</span>
                    <span className="panel-value">{stats.votes?.abstains || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 图表区域 */}
            <div className="charts-section">
              <div className="chart-container">
                <div className="chart-title">用户角色分布</div>
                {roleList.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleList}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleList.map((entry, index) => {
                          const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state small">暂无数据</div>
                )}
              </div>

              <div className="chart-container">
                <div className="chart-title">提案状态分布</div>
                {statusList.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusList}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusList.map((entry, index) => {
                          const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state small">暂无数据</div>
                )}
              </div>

              <div className="chart-container chart-full">
                <div className="chart-title">投票数据统计</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: '支持', value: stats.votes?.upvotes || 0, color: '#82ca9d' },
                      { name: '反对', value: stats.votes?.downvotes || 0, color: '#ff7300' },
                      { name: '弃权', value: stats.votes?.abstains || 0, color: '#ffc658' }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminStatistics;

