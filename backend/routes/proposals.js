import express from 'express';
import Proposal from '../models/Proposal.js';
import { authenticate, authorize } from '../middleware/auth.js';
import uploadProposal from '../middleware/uploadProposal.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有提案（所有用户都可以查看）
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    // 如果指定了状态，则过滤
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const proposals = await Proposal.find(query)
      .populate('author', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Proposal.countDocuments(query);

    res.json({
      proposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 根据 ID 获取单个提案
router.get('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('author', 'name email avatar role')
      .populate('votes.voterRecords.user', 'name email avatar')
      .populate('comments.user', 'name email avatar role');

    if (!proposal) {
      return res.status(404).json({ message: '提案不存在' });
    }

    res.json(proposal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 创建提案（所有用户都可以创建，支持图片上传）
router.post('/', uploadProposal.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, startTime, endTime } = req.body;
    const userId = req.user._id;

    if (!title || !description) {
      return res.status(400).json({ message: '提案标题和描述是必填项' });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ message: '开始时间和结束时间是必填项' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (end <= start) {
      return res.status(400).json({ message: '结束时间必须晚于开始时间' });
    }

    if (start < now) {
      return res.status(400).json({ message: '开始时间不能早于当前时间' });
    }

    // 处理上传的图片
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push(`/uploads/proposals/${file.filename}`);
      });
    }

    const proposal = new Proposal({
      title,
      description,
      category: category || 'general',
      images: images,
      startTime: start,
      endTime: end,
      author: userId,
      status: 'pending'
    });

    await proposal.save();
    await proposal.populate('author', 'name email avatar role');

    res.status(201).json(proposal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 更新提案（只能更新自己的提案，管理员可以更新任何提案）
router.put('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ message: '提案不存在' });
    }

    // 检查权限
    const isAuthor = proposal.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权修改该提案' });
    }

    const { title, description, category, status, rejectionReason } = req.body;
    
    if (title) proposal.title = title;
    if (description) proposal.description = description;
    if (category) proposal.category = category;
    
    // 只有管理员可以修改状态和拒绝理由
    if (status && isAdmin) {
      proposal.status = status;
      // 如果状态改为拒绝，必须提供拒绝理由
      if (status === 'rejected') {
        if (!rejectionReason || !rejectionReason.trim()) {
          return res.status(400).json({ message: '拒绝提案时必须提供拒绝理由' });
        }
        proposal.rejectionReason = rejectionReason.trim();
      } else if (status !== 'rejected') {
        // 如果状态不是拒绝，清除拒绝理由
        proposal.rejectionReason = null;
      }
    }

    await proposal.save();
    await proposal.populate('author', 'name email avatar role');

    res.json(proposal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 删除提案（只能删除自己的提案，管理员可以删除任何提案）
router.delete('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ message: '提案不存在' });
    }

    // 检查权限
    const isAuthor = proposal.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '无权删除该提案' });
    }

    await Proposal.findByIdAndDelete(req.params.id);
    res.json({ message: '提案删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 投票接口（支持、反对、弃权）
router.post('/:id/vote', async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote', 'downvote', 'abstain'
    const userId = req.user._id;
    const proposalId = req.params.id;

    if (!['upvote', 'downvote', 'abstain'].includes(voteType)) {
      return res.status(400).json({ message: '投票类型无效，必须是 upvote、downvote 或 abstain' });
    }

    const proposal = await Proposal.findById(proposalId);
    
    if (!proposal) {
      return res.status(404).json({ message: '提案不存在' });
    }

    // 检查提案是否在投票期内
    const now = new Date();
    if (proposal.status !== 'active') {
      return res.status(400).json({ message: '该提案当前不可投票' });
    }

    if (proposal.startTime && now < proposal.startTime) {
      return res.status(400).json({ message: '投票尚未开始' });
    }

    if (proposal.endTime && now > proposal.endTime) {
      return res.status(400).json({ message: '投票已结束' });
    }

    // 检查用户是否已经投票
    const existingVote = proposal.votes.voterRecords.find(
      record => record.user.toString() === userId.toString()
    );

    let updatedProposal;
    
    if (existingVote) {
      // 如果用户已经投票，更新投票记录
      const oldVoteType = existingVote.voteType;
      
      // 减少旧投票类型的计数
      if (oldVoteType === 'upvote') {
        proposal.votes.upvotes = Math.max(0, proposal.votes.upvotes - 1);
      } else if (oldVoteType === 'downvote') {
        proposal.votes.downvotes = Math.max(0, proposal.votes.downvotes - 1);
      } else if (oldVoteType === 'abstain') {
        proposal.votes.abstains = Math.max(0, proposal.votes.abstains - 1);
      }

      // 更新投票类型
      existingVote.voteType = voteType;
      existingVote.votedAt = new Date();

      // 增加新投票类型的计数
      if (voteType === 'upvote') {
        proposal.votes.upvotes += 1;
      } else if (voteType === 'downvote') {
        proposal.votes.downvotes += 1;
      } else if (voteType === 'abstain') {
        proposal.votes.abstains += 1;
      }
    } else {
      // 如果用户还没有投票，添加新的投票记录
      proposal.votes.voterRecords.push({
        user: userId,
        voteType: voteType,
        votedAt: new Date()
      });

      // 增加对应投票类型的计数
      if (voteType === 'upvote') {
        proposal.votes.upvotes += 1;
      } else if (voteType === 'downvote') {
        proposal.votes.downvotes += 1;
      } else if (voteType === 'abstain') {
        proposal.votes.abstains += 1;
      }
    }

    await proposal.save();
    
    // 重新获取提案并填充用户信息
    updatedProposal = await Proposal.findById(proposalId)
      .populate('author', 'name email avatar role')
      .populate('votes.voterRecords.user', 'name email avatar');

    res.json({
      message: '投票成功',
      proposal: updatedProposal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取用户的投票状态
router.get('/:id/my-vote', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposalId = req.params.id;

    const proposal = await Proposal.findById(proposalId);
    
    if (!proposal) {
      return res.status(404).json({ message: '提案不存在' });
    }

    const userVote = proposal.votes.voterRecords.find(
      record => record.user.toString() === userId.toString()
    );

    res.json({
      hasVoted: !!userVote,
      voteType: userVote ? userVote.voteType : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

