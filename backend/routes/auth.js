import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 生成 JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// 注册（学号/工号 + 密码）
router.post('/register', async (req, res) => {
  try {
    const { name, identifier, password, role, department } = req.body;

    // 验证必填字段
    if (!name || !identifier || !password || !role) {
      return res.status(400).json({ 
        message: '请提供必填字段: 姓名、学号/工号、密码、角色' 
      });
    }

    // 验证角色
    const validRoles = ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: `无效的角色，必须是: ${validRoles.join(', ')}` 
      });
    }

    // 检查学号/工号是否已存在
    const existingId = await User.findOne({ studentId: identifier });
    if (existingId) {
      return res.status(400).json({ message: '该学号/工号已被使用' });
    }

    // 为满足 schema 的 email 唯一性，用 identifier 生成占位邮箱
    const derivedEmail = `${identifier}@id.local`;

    // 创建新用户
    const user = new User({
      name,
      email: derivedEmail,
      password,
      role,
      studentId: identifier,
      department: department || undefined
    });

    await user.save();

    // 生成 token
    const token = generateToken(user._id);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: '注册失败', error: error.message });
  }
});

// 登录（学号/工号 + 密码）
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier: 学号/工号

    if (!identifier || !password) {
      return res.status(400).json({ message: '请提供学号/工号和密码' });
    }

    // 支持学号/工号匹配（studentId），兼容历史可选邮箱登录
    const user = await User.findOne({
      $or: [{ studentId: identifier }, { email: identifier }]
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: '账号或密码错误' });
    }

    // 检查账户是否激活
    if (!user.isActive) {
      return res.status(403).json({ message: '账户已被禁用，请联系管理员' });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '账号或密码错误' });
    }

    // 生成 token
    const token = generateToken(user._id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        points: user.points || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        isActive: user.isActive,
        createdAt: user.createdAt,
        points: user.points || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
});

// 修改密码
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请提供当前密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码至少需要6个字符' });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    // 验证当前密码
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '修改密码失败', error: error.message });
  }
});

export default router;

