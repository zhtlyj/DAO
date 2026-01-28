import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['create_proposal', 'vote', 'change_vote'],
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  chainAddress: {
    type: String,
    required: true,
    trim: true
  },
  network: {
    type: String,
    default: 'hardhat',
    trim: true
  },
  // 关联的提案ID（数据库中的）
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  },
  // 链上提案ID
  chainProposalId: {
    type: Number,
    default: null
  },
  // 交易详情（根据类型不同，内容不同）
  details: {
    // 创建提案时的详情
    proposalTitle: String,
    proposalDescription: String,
    startTime: Date,
    endTime: Date,
    // 投票时的详情
    voteType: String, // 'upvote', 'downvote', 'abstain'
    chainVoteType: Number, // 0, 1, 2
    isChangeVote: {
      type: Boolean,
      default: false
    }
  },
  // 交易状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  // 区块号
  blockNumber: {
    type: Number,
    default: null
  },
  // Gas 使用量
  gasUsed: {
    type: String,
    default: null
  },
  // Gas 价格
  gasPrice: {
    type: String,
    default: null
  },
  // 交易费用
  transactionFee: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// 索引优化
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ transactionHash: 1 });
transactionSchema.index({ proposal: 1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ chainAddress: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;

