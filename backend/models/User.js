import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '姓名是必填项'],
    trim: true
  },
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少需要6个字符'],
    select: false // 默认查询时不返回密码字段
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'teacher', 'student_representative', 'teacher_representative', 'admin'],
      message: '角色必须是: student, teacher, student_representative, teacher_representative, admin'
    },
    required: [true, '角色是必填项'],
    default: 'student'
  },
  studentId: {
    type: String,
    sparse: true, // 允许为空，但如果有值则必须唯一
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null // 头像 URL，如果为空则使用默认头像
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 保存前加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 比较密码的方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 转换为JSON时移除密码字段
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;

