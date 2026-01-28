import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 根据角色获取菜单项
  const getMenuItems = () => {
    // 根据角色决定提案菜单的标签和路径
    const proposalMenu = user?.role === 'admin' 
      ? { path: '/admin/proposals', label: '提案管理', icon: '📝', roles: ['admin'] }
      : { path: '/proposals', label: '我的提案', icon: '📝', roles: ['student', 'teacher', 'student_representative', 'teacher_representative'] };

    const baseItems = [
      { path: '/', label: '首页', icon: '🏠', roles: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'] },
      proposalMenu,
      { path: '/my-votes', label: '我的投票', icon: '🗳️', roles: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'] },
      { path: '/transactions', label: '交易历史', icon: '📋', roles: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'] },
      { path: '/discussion', label: '讨论区', icon: '💬', roles: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'] },
      { path: '/governance', label: '治理规则', icon: '📜', roles: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'] },
      { path: '/achievements', label: '成就与积分', icon: '🏅', roles: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'] },
    ];

    // 提交提案入口（仅学生/教师）
    const representativeItems = [
      { path: '/proposals/create', label: '提交提案', icon: '✍️', roles: ['student', 'teacher'] },
    ];

    // 管理员专属菜单
    const adminItems = [
      { path: '/admin/users', label: '用户管理', icon: '👥', roles: ['admin', 'student_representative', 'teacher_representative'] },
      { path: '/admin/statistics', label: '数据统计', icon: '📊', roles: ['admin'] },
      { path: '/admin/settings', label: '系统设置', icon: '⚙️', roles: ['admin'] },
    ];

    // 合并所有菜单项
    const allItems = [...baseItems, ...representativeItems, ...adminItems];

    // 根据用户角色过滤菜单项
    return allItems.filter(item => item.roles.includes(user?.role));
  };

  const menuItems = getMenuItems();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">🏛️</span>
            <span className="logo-text">校园 DAO</span>
          </Link>
        </div>

        {/* 桌面端导航菜单 */}
        <ul className="navbar-menu">
          {menuItems.map((item) => (
            <li key={item.path} className="navbar-item">
              <Link
                to={item.path}
                className={`navbar-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="navbar-icon">{item.icon}</span>
                <span className="navbar-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="navbar-right">
          {user && (
            <div className="navbar-points">
              <span className="points-icon">🏅</span>
              <span className="points-value">{user.points || 0} 分</span>
            </div>
          )}
          {/* 移动端菜单按钮 */}
          <button
            className="navbar-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="切换菜单"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <ul className="navbar-mobile-list">
            {menuItems.map((item) => (
              <li key={item.path} className="navbar-mobile-item">
                <Link
                  to={item.path}
                  className={`navbar-mobile-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="navbar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

