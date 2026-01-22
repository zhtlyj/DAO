import express from 'express';
import Settings from '../models/Settings.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取系统设置（所有用户可查看）
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新系统设置（仅管理员）
router.put('/', authorize('admin'), async (req, res) => {
  try {
    const { points, proposal, voting } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    // 更新积分规则
    if (points) {
      if (points.proposal !== undefined) settings.points.proposal = points.proposal;
      if (points.vote !== undefined) settings.points.vote = points.vote;
      if (points.comment !== undefined) settings.points.comment = points.comment;
    }

    // 更新提案规则
    if (proposal) {
      if (proposal.titleMaxLength !== undefined) settings.proposal.titleMaxLength = proposal.titleMaxLength;
      if (proposal.minDescriptionLength !== undefined) settings.proposal.minDescriptionLength = proposal.minDescriptionLength;
      if (proposal.maxImages !== undefined) settings.proposal.maxImages = proposal.maxImages;
      if (proposal.maxImageSize !== undefined) settings.proposal.maxImageSize = proposal.maxImageSize;
    }

    // 更新投票规则
    if (voting) {
      if (voting.defaultDurationDays !== undefined) settings.voting.defaultDurationDays = voting.defaultDurationDays;
      if (voting.allowVoteChange !== undefined) settings.voting.allowVoteChange = voting.allowVoteChange;
      if (voting.minVotersRequired !== undefined) settings.voting.minVotersRequired = voting.minVotersRequired;
      if (voting.resultCalculation !== undefined) settings.voting.resultCalculation = voting.resultCalculation;
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;

