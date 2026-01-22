const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Contract", function () {
  let dao;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // 获取签名者
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // 部署合约
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();
    await dao.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确设置所有者", async function () {
      expect(await dao.owner()).to.equal(owner.address);
    });

    it("初始提案数量应该为 0", async function () {
      expect(await dao.proposalCount()).to.equal(0);
    });
  });

  describe("创建提案", function () {
    it("应该能够创建提案", async function () {
      // 获取当前区块时间
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTime = currentBlock.timestamp;
      
      const startTime = currentTime + 3600; // 1小时后
      const endTime = startTime + 86400; // 24小时后

      const tx = await dao.connect(addr1).createProposal(
        "测试提案",
        "这是一个测试提案描述",
        startTime,
        endTime
      );

      await expect(tx)
        .to.emit(dao, "ProposalCreated")
        .withArgs(1, addr1.address, "测试提案", startTime, endTime);

      expect(await dao.proposalCount()).to.equal(1);
    });

    it("不应该允许创建空标题的提案", async function () {
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTime = currentBlock.timestamp;
      
      const startTime = currentTime + 3600;
      const endTime = startTime + 86400;

      await expect(
        dao.connect(addr1).createProposal("", "描述", startTime, endTime)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("不应该允许结束时间早于开始时间", async function () {
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTime = currentBlock.timestamp;
      
      const startTime = currentTime + 3600;
      const endTime = startTime - 3600;

      await expect(
        dao.connect(addr1).createProposal("标题", "描述", startTime, endTime)
      ).to.be.revertedWith("End time must be after start time");
    });
  });

  describe("投票", function () {
    let proposalId;
    let startTime;
    let endTime;

    beforeEach(async function () {
      // 获取当前区块时间
      const currentBlock = await ethers.provider.getBlock("latest");
      let currentTime = currentBlock.timestamp;
      
      // 设置开始时间为当前时间 + 1秒（合约要求必须未来时间）
      startTime = currentTime + 1;
      endTime = startTime + 86400; // 24小时后

      const tx = await dao.connect(addr1).createProposal(
        "投票测试提案",
        "用于测试投票的提案",
        startTime,
        endTime
      );

      const receipt = await tx.wait();
      proposalId = 1;

      // 将提案状态更新为 Active（只有所有者可以）
      // ProposalStatus: Pending=0, Active=1, Passed=2, Rejected=3, Closed=4
      await dao.connect(owner).updateProposalStatus(proposalId, 1); // 1 = Active

      // 获取创建提案后的时间（交易已经推进了时间）
      const afterBlock = await ethers.provider.getBlock("latest");
      let afterTime = afterBlock.timestamp;
      
      // 如果当前时间还没到 startTime，增加时间
      if (afterTime < startTime) {
        const timeNeeded = startTime - afterTime + 1; // +1 确保超过
        await ethers.provider.send("evm_increaseTime", [timeNeeded]);
        await ethers.provider.send("evm_mine", []);
      }
    });

    it("应该能够投票支持", async function () {
      const tx = await dao.connect(addr2).vote(proposalId, 0); // 0 = Upvote

      await expect(tx)
        .to.emit(dao, "VoteCast")
        .withArgs(proposalId, addr2.address, 0);

      const proposal = await dao.getProposal(proposalId);
      expect(proposal.upvotes).to.equal(1);
    });

    it("应该能够投票反对", async function () {
      await dao.connect(addr2).vote(proposalId, 1); // 1 = Downvote

      const proposal = await dao.getProposal(proposalId);
      expect(proposal.downvotes).to.equal(1);
    });

    it("应该能够弃权", async function () {
      await dao.connect(addr2).vote(proposalId, 2); // 2 = Abstain

      const proposal = await dao.getProposal(proposalId);
      expect(proposal.abstains).to.equal(1);
    });

    it("不应该允许重复投票", async function () {
      await dao.connect(addr2).vote(proposalId, 0);

      await expect(
        dao.connect(addr2).vote(proposalId, 1)
      ).to.be.revertedWith("Already voted");
    });

    it("应该能够修改投票", async function () {
      await dao.connect(addr2).vote(proposalId, 0); // 先投支持
      
      // 修改为反对
      await dao.connect(addr2).changeVote(proposalId, 1);

      const proposal = await dao.getProposal(proposalId);
      expect(proposal.upvotes).to.equal(0);
      expect(proposal.downvotes).to.equal(1);
    });
  });

  describe("提案状态管理", function () {
    it("所有者应该能够更新提案状态", async function () {
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTime = currentBlock.timestamp;
      
      const startTime = currentTime + 3600;
      const endTime = startTime + 86400;

      await dao.connect(addr1).createProposal(
        "状态测试提案",
        "描述",
        startTime,
        endTime
      );

      // ProposalStatus: Pending=0, Active=1, Passed=2, Rejected=3, Closed=4
      const tx = await dao.connect(owner).updateProposalStatus(1, 1); // 1 = Active

      await expect(tx)
        .to.emit(dao, "ProposalStatusChanged")
        .withArgs(1, 1);

      const proposal = await dao.getProposal(1);
      expect(proposal.status).to.equal(1); // 1 = Active
    });

    it("非所有者不应该能够更新提案状态", async function () {
      // ProposalStatus: Pending=0, Active=1, Passed=2, Rejected=3, Closed=4
      await expect(
        dao.connect(addr1).updateProposalStatus(1, 1) // 1 = Active
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("查询功能", function () {
    it("应该能够获取提案信息", async function () {
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTime = currentBlock.timestamp;
      
      const startTime = currentTime + 3600;
      const endTime = startTime + 86400;

      await dao.connect(addr1).createProposal(
        "查询测试提案",
        "用于测试查询的提案",
        startTime,
        endTime
      );

      const proposal = await dao.getProposal(1);
      expect(proposal.title).to.equal("查询测试提案");
      expect(proposal.description).to.equal("用于测试查询的提案");
      expect(proposal.proposer).to.equal(addr1.address);
    });

    it("应该能够获取用户投票信息", async function () {
      // 获取当前区块时间
      const currentBlock = await ethers.provider.getBlock("latest");
      let currentTime = currentBlock.timestamp;
      
      const startTime = currentTime + 1;
      const endTime = startTime + 86400;

      await dao.connect(addr1).createProposal(
        "投票查询测试",
        "描述",
        startTime,
        endTime
      );

      // 将提案状态更新为 Active
      // ProposalStatus: Pending=0, Active=1, Passed=2, Rejected=3, Closed=4
      await dao.connect(owner).updateProposalStatus(1, 1); // 1 = Active

      // 获取更新状态后的时间
      const afterBlock = await ethers.provider.getBlock("latest");
      let afterTime = afterBlock.timestamp;
      
      // 如果当前时间还没到 startTime，增加时间
      if (afterTime < startTime) {
        const timeNeeded = startTime - afterTime + 1; // +1 确保超过
        await ethers.provider.send("evm_increaseTime", [timeNeeded]);
        await ethers.provider.send("evm_mine", []);
      }

      await dao.connect(addr2).vote(1, 0);

      const [voteType, voted] = await dao.getUserVote(1, addr2.address);
      expect(voted).to.be.true;
      expect(voteType).to.equal(0);
    });
  });
});

