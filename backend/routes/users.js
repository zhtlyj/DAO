import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有用户（仅管理员）
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 根据 ID 获取用户
router.get('/:id', async (req, res) => {
  try {
    // 用户只能查看自己的信息，除非是管理员
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: '无权访问该用户信息' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 上传头像
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: '无权修改该用户头像' });
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }

    // 生成头像 URL（相对路径，前端需要配置静态文件服务）
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // 更新用户头像
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({ 
      message: '头像上传成功',
      avatar: avatarUrl,
      user 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 更新用户（只能更新自己的信息，管理员可以更新任何用户）
router.put('/:id', async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: '无权修改该用户信息' });
    }

    const { name, email, department, studentId, avatar } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (studentId !== undefined) updateData.studentId = studentId;
    if (avatar !== undefined) updateData.avatar = avatar;

    // 只有管理员可以修改角色和激活状态
    if (req.user.role === 'admin') {
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    // 不能删除自己
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能删除自己的账户' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

