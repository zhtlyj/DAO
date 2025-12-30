import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import './UserDropdown.css';

const UserDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <div 
        className="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar user={user} size="medium" showName={true} showRole={true} />
        <span className="dropdown-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="dropdown-header">
            <Avatar user={user} size="large" />
            <div className="dropdown-user-info">
              <div className="dropdown-user-name">{user?.name}</div>
              <div className="dropdown-user-email">{user?.email}</div>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <div className="dropdown-items">
            <div className="dropdown-item" onClick={handleProfileClick}>
              <span className="dropdown-item-icon">👤</span>
              <span>个人信息管理</span>
            </div>
            <div className="dropdown-item">
              <span className="dropdown-item-icon">⚙️</span>
              <span>设置</span>
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
              <span className="dropdown-item-icon">🚪</span>
              <span>退出登录</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;

