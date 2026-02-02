import express from 'express';
import Transaction from '../models/Transaction.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取当前用户的交易历史
router.get('/my-transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { user: userId };
    
    // 如果指定了类型，则过滤
    if (type) {
      query.type = type;
    }
    
    // 如果指定了状态，则过滤
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('proposal', 'title chainProposalId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
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

// 获取所有交易历史（管理员）
router.get('/', async (req, res) => {
  try {
    // 检查是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权访问' });
    }

    const { page = 1, limit = 50, type, status, chainAddress } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (chainAddress) {
      query.chainAddress = chainAddress;
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'name email avatar')
      .populate('proposal', 'title chainProposalId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
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

// 根据交易哈希获取交易详情
router.get('/hash/:hash', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transactionHash: req.params.hash })
      .populate('user', 'name email avatar')
      .populate('proposal', 'title description chainProposalId');

    if (!transaction) {
      return res.status(404).json({ message: '交易不存在' });
    }

    // 检查权限：只能查看自己的交易或管理员可以查看所有
    if (transaction.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权查看该交易' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取所有投票记录和提案创建记录（公开，不需要管理员权限）
router.get('/votes', async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 获取投票、修改投票和创建提案的交易
    const query = {
      type: { $in: ['vote', 'change_vote', 'create_proposal'] }
    };

    const transactions = await Transaction.find(query)
      .populate('user', 'name email avatar')
      .populate('proposal', 'title chainProposalId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取交易统计信息
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const query = isAdmin ? {} : { user: userId };

    const [
      total,
      byType,
      byStatus,
      recentCount
    ] = await Promise.all([
      Transaction.countDocuments(query),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Transaction.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 最近7天
      })
    ]);

    res.json({
      total,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

