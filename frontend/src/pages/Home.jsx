import Layout from '../components/Layout';
import './Home.css';

const Home = () => {
  return (
    <Layout>
        <div className="dashboard-section">
          <h2>控制台</h2>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-icon">📊</div>
              <h3>数据概览</h3>
              <p>查看系统整体数据统计</p>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon">📝</div>
              <h3>我的提案</h3>
              <p>查看和管理我提交的提案</p>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon">🗳️</div>
              <h3>我的投票</h3>
              <p>查看我参与的投票记录</p>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon">💬</div>
              <h3>我的讨论</h3>
              <p>查看我参与的讨论话题</p>
            </div>
          </div>
        </div>

        <div className="features-section">
          <h2>功能模块</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h4>提案管理</h4>
              <p>提交、查看和管理治理提案</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗳️</div>
              <h4>投票中心</h4>
              <p>参与提案投票，行使治理权利</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h4>讨论区</h4>
              <p>参与提案讨论，发表意见建议</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📜</div>
              <h4>治理规则</h4>
              <p>查看校园 DAO 治理规则和流程</p>
            </div>
          </div>
        </div>
    </Layout>
  );
};

export default Home;

