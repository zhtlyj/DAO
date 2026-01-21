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

// 获取当前角色可管理的用户
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;

    // 系统管理员可管理全部
    let query = {};

    if (role === 'student_representative') {
      query = { role: 'student' };
    } else if (role === 'teacher_representative') {
      query = { role: 'teacher' };
    } else if (role === 'admin') {
      // 管理员默认查看所有，但至少包含代表与教师/学生
      query = {};
    } else {
      return res.status(403).json({ message: '无权查看用户列表' });
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 根据 ID 获取用户
router.get('/:id', async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('-password');
    if (!targetUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const requester = req.user;

    const canAccess = () => {
      if (requester._id.toString() === targetUser._id.toString()) return true;
      if (requester.role === 'admin') return true;
      if (requester.role === 'student_representative' && targetUser.role === 'student') return true;
      if (requester.role === 'teacher_representative' && targetUser.role === 'teacher') return true;
      return false;
    };

    if (!canAccess()) {
      return res.status(403).json({ message: '无权访问该用户信息' });
    }

    res.json(targetUser);
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

// 更新用户（只能更新自己的信息；管理员可更新任意；代表可更新其管辖成员）
router.put('/:id', async (req, res) => {
  try {
    const requester = req.user;
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isSelf = requester._id.toString() === target._id.toString();
    const canManage =
      requester.role === 'admin' ||
      (requester.role === 'student_representative' && target.role === 'student') ||
      (requester.role === 'teacher_representative' && target.role === 'teacher');

    if (!isSelf && !canManage) {
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
    if (requester.role === 'admin') {
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updated);
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

