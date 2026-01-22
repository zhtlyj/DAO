import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // 积分规则
  points: {
    proposal: { type: Number, default: 20 }, // 每个提案的积分
    vote: { type: Number, default: 2 }, // 每次投票的积分
    comment: { type: Number, default: 1 } // 每条评论/回复的积分
  },
  // 提案规则
  proposal: {
    titleMaxLength: { type: Number, default: 200 }, // 标题最大长度
    minDescriptionLength: { type: Number, default: 10 }, // 描述最小长度
    maxImages: { type: Number, default: 5 }, // 最多图片数
    maxImageSize: { type: Number, default: 5 * 1024 * 1024 } // 图片最大大小（字节）
  },
  // 投票规则
  voting: {
    defaultDurationDays: { type: Number, default: 7 }, // 默认投票持续天数
    allowVoteChange: { type: Boolean, default: true }, // 是否允许修改投票
    minVotersRequired: { type: Number, default: 0 }, // 最小投票人数要求（0表示无要求）
    resultCalculation: { type: String, default: 'simple', enum: ['simple', 'absolute'] } // 结果计算方式：simple=简单多数，absolute=绝对多数
  }
}, {
  timestamps: true
});

// 确保只有一个配置文档
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;

