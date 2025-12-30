import { useState } from 'react';
import './Avatar.css';

const Avatar = ({ user, size = 'medium', showName = false, showRole = false }) => {
  const [imageError, setImageError] = useState(false);
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getRoleName = (role) => {
    const roleMap = {
      student: '学生',
      teacher: '教师',
      student_representative: '学生代表',
      teacher_representative: '教师代表',
      admin: '管理员',
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role) => {
    const colorMap = {
      student: '#3b82f6',
      teacher: '#10b981',
      student_representative: '#8b5cf6',
      teacher_representative: '#f59e0b',
      admin: '#ef4444',
    };
    return colorMap[role] || '#6b7280';
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      // 如果是相对路径，添加基础 URL
      if (user.avatar.startsWith('/')) {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';
        return BASE_URL + user.avatar;
      }
      return user.avatar;
    }
    return null;
  };

  const sizeClasses = {
    small: 'avatar-small',
    medium: 'avatar-medium',
    large: 'avatar-large',
  };

  const avatarSize = sizeClasses[size] || sizeClasses.medium;

  const avatarUrl = getAvatarUrl();

  return (
    <div className={`avatar-container ${showName || showRole ? 'avatar-with-info' : ''}`}>
      <div className={`avatar ${avatarSize}`}>
        {avatarUrl && !imageError ? (
          <img 
            src={avatarUrl} 
            alt={user?.name || '用户'} 
            className="avatar-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div 
            className="avatar-default"
            style={{ 
              backgroundColor: getRoleColor(user?.role)
            }}
          >
            {getInitials(user?.name)}
          </div>
        )}
      </div>
      {(showName || showRole) && (
        <div className="avatar-info">
          {showName && <span className="avatar-name">{user?.name}</span>}
          {showRole && (
            <span 
              className="avatar-role"
              style={{ backgroundColor: getRoleColor(user?.role) }}
            >
              {getRoleName(user?.role)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Avatar;

