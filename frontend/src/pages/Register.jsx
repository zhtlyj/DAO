import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    identifier: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 验证密码确认
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    setLoading(true);

    // 准备注册数据
    const registerData = {
      name: formData.name,
      identifier: formData.identifier,
      password: formData.password,
      role: formData.role,
      department: formData.department || undefined,
    };

    const result = await register(registerData);
    
    setLoading(false);
    
    if (result.success) {
      // 注册成功后跳转到登录页
      navigate('/login', { 
        state: { 
          message: '注册成功！请使用学号/工号和密码登录。',
          email: formData.identifier 
        } 
      });
    } else {
      setError(result.message);
    }
  };

  const roleOptions = [
    { value: 'student', label: '学生' },
    { value: 'teacher', label: '教师' },
    { value: 'student_representative', label: '学生代表' },
    { value: 'teacher_representative', label: '教师代表' },
    { value: 'admin', label: '管理员' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🏛️</div>
          <h2>加入校园 DAO</h2>
          <p className="auth-subtitle">创建账户，参与校园治理</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
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
            <label htmlFor="identifier">学号/工号 *</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              placeholder="学生填学号，教师/管理员填工号"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">角色 *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="department">部门/院系</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="请输入部门或院系（可选）"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码 *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="至少6个字符"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码 *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="请再次输入密码"
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            已有账号？ <Link to="/login">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

