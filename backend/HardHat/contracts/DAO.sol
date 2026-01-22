// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DAO Governance Contract
 * @dev 校园 DAO 治理系统的智能合约
 */
contract DAO {
    // 提案结构
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 upvotes;
        uint256 downvotes;
        uint256 abstains;
        bool executed;
        ProposalStatus status;
    }

    // 提案状态枚举
    enum ProposalStatus {
        Pending,    // 待审核
        Active,     // 进行中
        Passed,     // 已通过
        Rejected,   // 已拒绝
        Closed      // 已关闭
    }

    // 投票类型枚举
    enum VoteType {
        Upvote,     // 支持
        Downvote,   // 反对
        Abstain     // 弃权
    }

    // 提案映射
    mapping(uint256 => Proposal) public proposals;
    
    // 用户投票记录：proposalId => user => VoteType
    mapping(uint256 => mapping(address => VoteType)) public votes;
    
    // 用户是否已投票：proposalId => user => bool
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // 提案计数器
    uint256 public proposalCount;
    
    // 合约所有者
    address public owner;
    
    // 事件
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteType voteType
    );
    
    event ProposalStatusChanged(
        uint256 indexed proposalId,
        ProposalStatus newStatus
    );

    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validProposal(uint256 _proposalId) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        _;
    }

    modifier proposalActive(uint256 _proposalId) {
        Proposal memory proposal = proposals[_proposalId];
        require(
            proposal.status == ProposalStatus.Active,
            "Proposal is not active"
        );
        require(
            block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime,
            "Proposal voting period is not active"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        proposalCount = 0;
    }

    /**
     * @dev 创建提案
     * @param _title 提案标题
     * @param _description 提案描述
     * @param _startTime 开始时间（Unix 时间戳）
     * @param _endTime 结束时间（Unix 时间戳）
     */
    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime >= block.timestamp, "Start time must be in the future");

        proposalCount++;
        uint256 proposalId = proposalCount;

        proposals[proposalId] = Proposal({
            id: proposalId,
            title: _title,
            description: _description,
            proposer: msg.sender,
            startTime: _startTime,
            endTime: _endTime,
            upvotes: 0,
            downvotes: 0,
            abstains: 0,
            executed: false,
            status: ProposalStatus.Pending
        });

        emit ProposalCreated(proposalId, msg.sender, _title, _startTime, _endTime);
        return proposalId;
    }

    /**
     * @dev 投票
     * @param _proposalId 提案 ID
     * @param _voteType 投票类型（0=支持, 1=反对, 2=弃权）
     */
    function vote(uint256 _proposalId, VoteType _voteType) 
        external 
        validProposal(_proposalId) 
        proposalActive(_proposalId) 
    {
        require(!hasVoted[_proposalId][msg.sender], "Already voted");
        
        Proposal storage proposal = proposals[_proposalId];
        
        // 记录投票
        votes[_proposalId][msg.sender] = _voteType;
        hasVoted[_proposalId][msg.sender] = true;
        
        // 更新投票计数
        if (_voteType == VoteType.Upvote) {
            proposal.upvotes++;
        } else if (_voteType == VoteType.Downvote) {
            proposal.downvotes++;
        } else if (_voteType == VoteType.Abstain) {
            proposal.abstains++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _voteType);
    }

    /**
     * @dev 修改投票（如果允许）
     * @param _proposalId 提案 ID
     * @param _voteType 新的投票类型
     */
    function changeVote(uint256 _proposalId, VoteType _voteType)
        external
        validProposal(_proposalId)
        proposalActive(_proposalId)
    {
        require(hasVoted[_proposalId][msg.sender], "Must vote first");
        
        Proposal storage proposal = proposals[_proposalId];
        VoteType oldVote = votes[_proposalId][msg.sender];
        
        // 移除旧投票
        if (oldVote == VoteType.Upvote) {
            proposal.upvotes--;
        } else if (oldVote == VoteType.Downvote) {
            proposal.downvotes--;
        } else if (oldVote == VoteType.Abstain) {
            proposal.abstains--;
        }
        
        // 添加新投票
        votes[_proposalId][msg.sender] = _voteType;
        if (_voteType == VoteType.Upvote) {
            proposal.upvotes++;
        } else if (_voteType == VoteType.Downvote) {
            proposal.downvotes++;
        } else if (_voteType == VoteType.Abstain) {
            proposal.abstains++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _voteType);
    }

    /**
     * @dev 更新提案状态（仅所有者）
     * @param _proposalId 提案 ID
     * @param _status 新状态
     */
    function updateProposalStatus(uint256 _proposalId, ProposalStatus _status)
        external
        onlyOwner
        validProposal(_proposalId)
    {
        Proposal storage proposal = proposals[_proposalId];
        proposal.status = _status;
        
        emit ProposalStatusChanged(_proposalId, _status);
    }

    /**
     * @dev 获取提案信息
     * @param _proposalId 提案 ID
     */
    function getProposal(uint256 _proposalId)
        external
        view
        validProposal(_proposalId)
        returns (
            uint256 id,
            string memory title,
            string memory description,
            address proposer,
            uint256 startTime,
            uint256 endTime,
            uint256 upvotes,
            uint256 downvotes,
            uint256 abstains,
            ProposalStatus status
        )
    {
        Proposal memory proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.upvotes,
            proposal.downvotes,
            proposal.abstains,
            proposal.status
        );
    }

    /**
     * @dev 获取用户对提案的投票
     * @param _proposalId 提案 ID
     * @param _voter 投票者地址
     */
    function getUserVote(uint256 _proposalId, address _voter)
        external
        view
        validProposal(_proposalId)
        returns (VoteType voteType, bool voted)
    {
        voted = hasVoted[_proposalId][_voter];
        voteType = votes[_proposalId][_voter];
    }

    /**
     * @dev 获取提案总数
     */
    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
}

