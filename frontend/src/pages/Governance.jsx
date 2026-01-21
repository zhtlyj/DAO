import Layout from '../components/Layout';
import './Governance.css';

const Governance = () => {
  const sections = [
    {
      title: '提案流程',
      items: [
        '提交：需提供清晰标题、描述、分类及开始/结束时间',
        '审核：管理员审核通过后进入投票期',
        '投票：在开始-结束时间内，成员可支持/反对/弃权',
        '结案：投票结束后根据结果与规则确定通过/拒绝'
      ]
    },
    {
      title: '投票规则',
      items: [
        '同一用户同一提案仅保留最后一次投票',
        '投票需在提案设定的投票窗口内完成',
        '支持/反对/弃权均会记录在个人“我的投票”中',
        '投票结果以系统计数为准，异常请及时反馈管理员'
      ]
    },
    {
      title: '讨论与行为规范',
      items: [
        '讨论需基于事实与建设性意见，禁止人身攻击、违规内容',
        '支持在评论区引用数据、链接或补充材料',
        '管理员可视情况清理违规讨论或封禁账号',
        '请尊重不同角色的意见并保持理性讨论'
      ]
    },
    {
      title: '积分与成就规则',
      items: [
        '基础积分：每个提案 +20；每次投票 +2；每条评论/回复 +1',
        '成就奖励：完成成就可获得额外积分（如首次投票 +5 等）',
        '积分实时累积，并在导航右上角及“成就与积分”页面查看',
        '后续可用于兑换或激励，违规行为导致的封禁将暂停积分获取'
      ]
    },
    {
      title: '角色与权限',
      items: [
        '普通成员：可参与投票、讨论',
        '代表/教师：可提交提案、参与投票与讨论',
        '管理员：审核提案、管理用户与内容、维护系统秩序'
      ]
    },
    {
      title: '透明度与追溯',
      items: [
        '所有提案的投票结果、时间窗口、描述对登录用户公开',
        '个人操作（投票/评论/回复）可在“我的投票/讨论”查看',
        '如发现数据异常，请在讨论区或联系管理员反馈'
      ]
    }
  ];

  const quickLinks = [
    { label: '提交提案', path: '/proposals', icon: '📝' },
    { label: '我的投票', path: '/my-votes', icon: '🗳️' },
    { label: '我的讨论', path: '/discussion', icon: '💬' }
  ];

  return (
    <Layout>
      <div className="governance-page">
        <div className="governance-hero">
          <div>
            <p className="hero-badge">治理规则</p>
            <h1>清晰流程，透明投票，理性讨论</h1>
            <p className="hero-subtitle">
              了解提案、投票、讨论的规范，保障校园 DAO 的公平与高效运转。
            </p>
            <div className="hero-actions">
              {quickLinks.map((link) => (
                <a key={link.path} className="btn-primary" href={link.path}>
                  {link.icon} {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-title">快速要点</div>
            <ul>
              <li>投票仅在时间窗口内有效</li>
              <li>讨论需文明、基于事实</li>
              <li>提案审核通过后才可投票</li>
              <li>个人记录可在“我的”入口查看</li>
            </ul>
          </div>
        </div>

        <div className="governance-grid">
          {sections.map((section) => (
            <div key={section.title} className="gov-card">
              <div className="gov-card-header">
                <div className="gov-card-icon">📜</div>
                <h3>{section.title}</h3>
              </div>
              <ul className="gov-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="gov-footer">
          <div className="gov-footer-card">
            <div className="gov-footer-title">遇到问题？</div>
            <p>可在讨论区反馈，或联系管理员获取支持。</p>
            <div className="gov-footer-actions">
              <a className="btn-secondary" href="/discussion">去讨论区</a>
              <a className="btn-primary" href="/proposals">查看提案</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Governance;

