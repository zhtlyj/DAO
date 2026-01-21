import express from 'express';
import User from '../models/User.js';
import Proposal from '../models/Proposal.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// 数据统计
router.get('/', async (req, res) => {
  try {
    // 用户统计
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const usersTotal = usersByRole.reduce((sum, r) => sum + r.count, 0);

    // 提案按状态
    const proposalsByStatus = await Proposal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const proposalsTotal = proposalsByStatus.reduce((sum, r) => sum + r.count, 0);

    // 进行中的提案
    const now = new Date();
    const activeProposals = await Proposal.countDocuments({
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    // 投票统计
    const voteAgg = await Proposal.aggregate([
      {
        $group: {
          _id: null,
          upvotes: { $sum: { $ifNull: ['$votes.upvotes', 0] } },
          downvotes: { $sum: { $ifNull: ['$votes.downvotes', 0] } },
          abstains: { $sum: { $ifNull: ['$votes.abstains', 0] } }
        }
      }
    ]);
    const votes = voteAgg[0] || { upvotes: 0, downvotes: 0, abstains: 0 };

    // 讨论总数
    const commentsAgg = await Proposal.aggregate([
      {
        $project: {
          commentsCount: { $size: { $ifNull: ['$comments', []] } },
          repliesCount: {
            $sum: {
              $map: {
                input: { $ifNull: ['$comments', []] },
                as: 'c',
                in: { $size: { $ifNull: ['$$c.replies', []] } }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          comments: { $sum: '$commentsCount' },
          replies: { $sum: '$repliesCount' }
        }
      }
    ]);
    const comments = commentsAgg[0] || { comments: 0, replies: 0 };

    res.json({
      users: {
        total: usersTotal,
        byRole: usersByRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {})
      },
      proposals: {
        total: proposalsTotal,
        byStatus: proposalsByStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        active: activeProposals
      },
      votes,
      discussions: {
        comments: comments.comments,
        replies: comments.replies
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

export default router;

