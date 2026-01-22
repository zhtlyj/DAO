import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '提案标题是必填项'],
    trim: true,
    maxlength: [200, '提案标题不能超过200个字符']
  },
  description: {
    type: String,
    required: [true, '提案描述是必填项'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'active', 'passed', 'rejected', 'closed'],
      message: '状态必须是: draft, pending, active, passed, rejected, closed'
    },
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null
  },
  category: {
    type: String,
    trim: true,
    default: 'general'
  },
  visibility: {
    type: String,
    enum: {
      values: ['student', 'teacher', 'all'],
      message: '可视范围必须是: student, teacher, all'
    },
    default: 'all'
  },
  images: [{
    type: String,
    trim: true
  }],
  startTime: {
    type: Date,
    required: [true, '开始时间是必填项']
  },
  endTime: {
    type: Date,
    required: [true, '结束时间是必填项'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: '结束时间必须晚于开始时间'
    }
  },
  votes: {
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    abstains: {
      type: Number,
      default: 0
    },
    voterRecords: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      voteType: {
        type: String,
        enum: ['upvote', 'downvote', 'abstain'],
        required: true
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }]
}, {
  timestamps: true
});

// 索引优化
proposalSchema.index({ author: 1, createdAt: -1 });
proposalSchema.index({ status: 1, createdAt: -1 });

const Proposal = mongoose.model('Proposal', proposalSchema);

export default Proposal;

