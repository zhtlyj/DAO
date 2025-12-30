import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 验证 JWT token
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌，请先登录' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: '账户已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '无效的认证令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '认证令牌已过期，请重新登录' });
    }
    res.status(500).json({ message: '认证过程出错', error: error.message });
  }
};

// 角色验证中间件
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '请先登录' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `权限不足，需要以下角色之一: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

