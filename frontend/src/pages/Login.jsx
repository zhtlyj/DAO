import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    identifier: location.state?.email || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 清除成功消息（当用户开始输入时）
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000); // 5秒后自动清除
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    // 用户开始输入时清除成功消息
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.identifier, formData.password);
    
    setLoading(false);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🎓</div>
          <h2>校园 DAO 治理系统</h2>
          <p className="auth-subtitle">欢迎回来，请登录您的账户</p>
        </div>
        <form onSubmit={handleSubmit}>
          {successMessage && <div className="success-message">{successMessage}</div>}
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="identifier">学号/工号</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              placeholder="请输入学号（学生）或工号（教师/管理员）"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="请输入密码"
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            还没有账号？ <Link to="/register">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

