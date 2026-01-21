import express from 'express';
import Proposal from '../models/Proposal.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// 成就定义
const achievementsConfig = [
  { code: 'first_vote', title: '初次出手', desc: '完成首次投票', condition: (ctx) => ctx.voteCount >= 1, reward: 5 },
  { code: 'active_voter', title: '活跃投票者', desc: '累计完成10次投票', condition: (ctx) => ctx.voteCount >= 10, reward: 15 },
  { code: 'super_voter', title: '投票达人', desc: '累计完成50次投票', condition: (ctx) => ctx.voteCount >= 50, reward: 40 },
  { code: 'first_proposal', title: '提案新秀', desc: '提交1个提案', condition: (ctx) => ctx.proposalCount >= 1, reward: 20 },
  { code: 'proposal_creator', title: '提案创作者', desc: '提交3个提案', condition: (ctx) => ctx.proposalCount >= 3, reward: 40 },
  { code: 'proposal_leader', title: '提案领袖', desc: '提交10个提案', condition: (ctx) => ctx.proposalCount >= 10, reward: 100 },
  { code: 'commenter', title: '讨论参与者', desc: '发表3条讨论/回复', condition: (ctx) => ctx.commentCount >= 3, reward: 5 },
  { code: 'discuss_pro', title: '讨论达人', desc: '发表20条讨论/回复', condition: (ctx) => ctx.commentCount >= 20, reward: 25 },
  { code: 'hundred_points', title: '积分达人', desc: '积分达到100', condition: (ctx) => ctx.points >= 100, reward: 0 },
];

// 计算个人成就与积分
router.get('/me', async (req, res) => {
  try {
    const userId = req.user._id;

    // 投票次数
    const voteAgg = await Proposal.aggregate([
      { $unwind: '$votes.voterRecords' },
      { $match: { 'votes.voterRecords.user': userId } },
      { $count: 'count' }
    ]);
    const voteCount = voteAgg[0]?.count || 0;

    // 提案数量
    const proposalCount = await Proposal.countDocuments({ author: userId });

    // 评论 + 回复数量
    const commentAgg = await Proposal.aggregate([
      {
        $project: {
          comments: {
            $filter: {
              input: '$comments',
              as: 'c',
              cond: { $eq: ['$$c.user', userId] }
            }
          },
          replies: {
            $map: {
              input: '$comments',
              as: 'c',
              in: {
                $filter: {
                  input: '$$c.replies',
                  as: 'r',
                  cond: { $eq: ['$$r.user', userId] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          commentCount: { $size: '$comments' },
          replyCount: {
            $reduce: {
              input: '$replies',
              initialValue: 0,
              in: { $add: ['$$value', { $size: '$$this' }] }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          comments: { $sum: '$commentCount' },
          replies: { $sum: '$replyCount' }
        }
      }
    ]);
    const commentCount = (commentAgg[0]?.comments || 0) + (commentAgg[0]?.replies || 0);

    // 基础积分规则：每个提案20分、每次投票2分、每条评论/回复1分
    const basePoints = proposalCount * 20 + voteCount * 2 + commentCount * 1;

    // 成就完成情况
    const ctx = { voteCount, proposalCount, commentCount, points: basePoints };
    const earnedAchievements = achievementsConfig
      .filter((a) => a.condition(ctx))
      .map((a) => ({ code: a.code, title: a.title, description: a.desc, reward: a.reward }));

    // 成就奖励积分
    const achievementBonus = earnedAchievements.reduce((sum, a) => sum + a.reward, 0);
    const totalPoints = basePoints + achievementBonus;

    // 更新用户积分（不阻塞返回）
    await User.findByIdAndUpdate(userId, { points: totalPoints }).catch(() => {});

    res.json({
      voteCount,
      proposalCount,
      commentCount,
      points: totalPoints,
      achievements: achievementsConfig.map((a) => ({
        code: a.code,
        title: a.title,
        description: a.desc,
        reward: a.reward,
        earned: earnedAchievements.some((e) => e.code === a.code),
      }))
    });
  } catch (error) {
    res.status(500).json({ message: '获取成就失败', error: error.message });
  }
});

export default router;

