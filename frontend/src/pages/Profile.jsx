import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import Avatar from '../components/Avatar';
import Layout from '../components/Layout';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    studentId: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        studentId: user.studentId || '',
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setMessage({ type: '', text: '' });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: '请选择图片文件' });
        return;
      }

      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: '图片大小不能超过 5MB' });
        return;
      }

      setAvatarFile(file);
      // 创建预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 先上传头像（如果有）
      let avatarUrl = formData.avatar || user?.avatar;
      
      if (avatarFile) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('avatar', avatarFile);
        
        const uploadResponse = await userAPI.uploadAvatar(user._id || user.id, formDataToUpload);
        avatarUrl = uploadResponse.data.avatar;
      }

      // 更新用户信息
      const updateData = {
        ...formData,
        avatar: avatarUrl,
      };

      const response = await userAPI.updateUser(user._id || user.id, updateData);
      updateUser(response.data);
      
      setMessage({ type: 'success', text: '个人信息更新成功！' });
      setAvatarFile(null);
      
      // 2秒后返回首页
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '更新失败，请重试' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-card">
        <h2>个人信息管理</h2>
        
        <div className="profile-avatar-section">
          <Avatar user={{ ...user, avatar: avatarPreview }} size="large" />
          <div className="avatar-upload">
            <label htmlFor="avatar-upload" className="avatar-upload-button">
              更换头像
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            {avatarFile && (
              <span className="avatar-file-name">{avatarFile.name}</span>
            )}
          </div>
        </div>

        {message.text && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">姓名 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="请输入姓名"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">邮箱 *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="请输入邮箱"
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">部门/院系</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="请输入部门或院系"
            />
          </div>

          {(user?.role === 'student' || user?.role === 'student_representative') && (
            <div className="form-group">
              <label htmlFor="studentId">学号/工号</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="请输入学号/工号"
              />
            </div>
          )}

          <button type="submit" className="profile-submit-button" disabled={loading}>
            {loading ? '保存中...' : '保存更改'}
          </button>
        </form>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;

