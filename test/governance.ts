import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import {
  CalHash,
  CalHash__factory,
  CakeToken,
  CakeToken__factory,
  MasterChef,
  MasterChef__factory,
  SyrupBar,
  SyrupBar__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  WETH9,
  WETH9__factory,
  USDT,
  USDT__factory,
  BUSD,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  BUSD__factory,
  MasterChefStrategyLP,
  MasterChefStrategyLP__factory,
  Autocompound,
  Autocompound__factory,
  Staking,
  Staking__factory,
  AutocompoundGovernor,
  AutocompoundGovernor__factory,
  Timelock,
  Timelock__factory,
} from "../typechain";

import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";
import { providers } from "ethers";
import { expect } from "chai";
import { splitSignature } from "@ethersproject/bytes";

describe("Governance", async () => {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;
  let user6: SignerWithAddress;
  let user7: SignerWithAddress;
  let user8: SignerWithAddress;
  let user9: SignerWithAddress;
  let user10: SignerWithAddress;
  let user11: SignerWithAddress;
  let user12: SignerWithAddress;
  let signers: SignerWithAddress[];
  let BUSD: BUSD;
  let USDT: USDT;
  let factory: UniswapV2Factory;
  let router: UniswapV2Router02;
  let WETH: WETH9;
  let calHash: CalHash;
  let pairAddress: String;
  let pairInstance: UniswapV2Pair;
  let cake: CakeToken;
  let syrupBar: SyrupBar;
  let MasterChef: MasterChef;
  let MasterChefStrategyLP: MasterChefStrategyLP;
  let autoCoumpound: Autocompound;
  let staking: Staking;
  let governance: AutocompoundGovernor;
  let timelock: Timelock;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];
    user = signers[1];
    user1 = signers[2];
    user2 = signers[3];
    user3 = signers[4];
    user4 = signers[5];
    user5 = signers[6];
    user6 = signers[7];
    user7 = signers[8];
    user8 = signers[9];
    user9 = signers[10];
    user10 = signers[11];
    user11 = signers[12];
    user12 = signers[13];
    factory = await new UniswapV2Factory__factory(owner).deploy(owner.address);
    WETH = await new WETH9__factory(owner).deploy();
    router = await new UniswapV2Router02__factory(owner).deploy(
      factory.address,
      WETH.address
    );

    BUSD = await new BUSD__factory(owner).deploy("BUSD", "BUSD");
    USDT = await new USDT__factory(owner).deploy("USDT", "USDT");
    await BUSD.transfer(user7.address, expandTo18Decimals(2000));
    await USDT.transfer(user7.address, expandTo18Decimals(100));
    cake = await new CakeToken__factory(owner).deploy();
    autoCoumpound = await new Autocompound__factory(owner).deploy();
    syrupBar = await new SyrupBar__factory(owner).deploy(cake.address);
    calHash = await new CalHash__factory(owner).deploy();

    await BUSD.approve(router.address, expandTo18Decimals(20000000));
    await USDT.approve(router.address, expandTo18Decimals(20000000));

    await router
      .connect(owner)
      .addLiquidity(
        BUSD.address,
        USDT.address,
        expandTo18Decimals(20000),
        expandTo18Decimals(10000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );

    pairAddress = await factory.getPair(BUSD.address, USDT.address);

    pairInstance = await new UniswapV2Pair__factory(owner).attach(
      pairAddress.toString()
    );

    pairInstance
      .connect(owner)
      .transfer(user1.address, expandTo18Decimals(5300));
    pairInstance
      .connect(owner)
      .transfer(user2.address, expandTo18Decimals(400));
    pairInstance
      .connect(owner)
      .transfer(user3.address, expandTo18Decimals(800));

    MasterChef = await new MasterChef__factory(owner).deploy(
      cake.address,
      syrupBar.address,
      owner.address,
      "40000000000000000000",
      await ethers.provider.getBlockNumber()
    );

    await MasterChef.add(400, pairAddress.toString(), true);

    let poolInfo = await MasterChef.poolLength();
    staking = await new Staking__factory(owner).deploy(autoCoumpound.address);
    let timeDelay = 1000;

    timelock = await new Timelock__factory(owner).deploy(
      owner.address,
      timeDelay
    );
    governance = await new AutocompoundGovernor__factory(owner).deploy(
      timelock.address,
      staking.address,
      owner.address
    );
    MasterChefStrategyLP = await new MasterChefStrategyLP__factory(
      owner
    ).deploy(
      WETH.address,
      staking.address,
      autoCoumpound.address,
      pairAddress.toString(),
      cake.address,
      MasterChef.address,
      router.address,
      1,
      "10000000000000000"
    );
    await autoCoumpound
      .connect(owner)
      .setOperator(MasterChefStrategyLP.address, true);
    await staking
      .connect(owner)
      .setOperator(MasterChefStrategyLP.address, true);
    await cake.transferOwnership(MasterChef.address);
    await syrupBar.transferOwnership(MasterChef.address);
    await MasterChefStrategyLP.transferOwnership(timelock.address);
    await pairInstance.approve(
      MasterChefStrategyLP.address,
      expandTo18Decimals(6000)
    );

    await pairInstance
      .connect(user1)
      .approve(MasterChefStrategyLP.address, expandTo18Decimals(6000));
    await pairInstance
      .connect(user2)
      .approve(MasterChefStrategyLP.address, expandTo18Decimals(6000));
    await pairInstance
      .connect(user3)
      .approve(MasterChefStrategyLP.address, expandTo18Decimals(6000));

    await MasterChefStrategyLP.connect(user1).deposit(expandTo18Decimals(5200));
    await mineBlocks(ethers.provider, 200);
    await MasterChefStrategyLP.connect(user1).deposit(expandTo18Decimals(100));
    await mineBlocks(ethers.provider, 200);
    await MasterChefStrategyLP.connect(user2).deposit(expandTo18Decimals(400));
    await mineBlocks(ethers.provider, 200);

    await MasterChefStrategyLP.connect(user3).deposit(expandTo18Decimals(800));

    let bal: any = (await cake.balanceOf(owner.address)).toString();
    await cake.connect(owner).approve(router.address, bal);
    let r: any = await router
      .connect(owner)
      .addLiquidity(
        cake.address,
        USDT.address,
        expandTo18Decimals(5),
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );
    r = await router
      .connect(owner)
      .addLiquidity(
        cake.address,
        BUSD.address,
        expandTo18Decimals(5),
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );
    let value: any = ethers.utils.parseEther("1");
    r = await router
      .connect(owner)
      .addLiquidityETH(
        cake.address,
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    await autoCoumpound.mint(owner.address, expandTo18Decimals(10));
    await autoCoumpound.approve(router.address, expandTo18Decimals(10));
    r = await router
      .connect(owner)
      .addLiquidityETH(
        autoCoumpound.address,
        expandTo18Decimals(10),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );
  });

  describe("Governance", async () => {
    it("Changing admin from governor to user", async () => {
      //Making governor ,admin of timelock
      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      let blockNumber: any = await ethers.provider.getBlockNumber();
      let blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      let eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);

      blockNumber = await ethers.provider.getBlockNumber();
      blockDetails = await ethers.provider.getBlock(blockNumber);

      time = blockDetails.timestamp;
      timeLockDelay = await timelock.delay();
      eta = timeLockDelay.toNumber() + time + 600;

      await governance.__queueSetTimelockPendingAdmin(owner.address, eta);
      await mineBlocks(ethers.provider, 1601);
      await governance.__executeSetTimelockPendingAdmin(owner.address, eta);
      expect(await timelock.pendingAdmin()).to.be.eq(owner.address);
    });

    it("Make a Community propsal", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);
      const sig = MasterChefStrategyLP.interface.encodeFunctionData(
        "updateMultiplier",
        ["10"]
      );
      await expect(
        governance
          .connect(user1)
          .communityPropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: proposer votes below proposal threshold"
      );

      await staking.connect(user1).stake(ac, 7);

      await expect(
        governance
          .connect(user1)
          .communityPropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            [],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: proposal function information arity mismatch"
      );

      await expect(
        governance
          .connect(user1)
          .communityPropose(500, [], [], [], [], "change bonus multiplier")
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: must provide actions"
      );

      await expect(
        governance
          .connect(user1)
          .communityPropose(
            200,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: invalid voting period"
      );

      await expect(
        governance
          .connect(user1)
          .communityPropose(
            40000,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: invalid voting period"
      );

      const tx = await governance
        .connect(user1)
        .communityPropose(
          500,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier"],
          [sig],
          "change bonus multiplier"
        );

      expect(await governance.proposalCount()).to.be.eq(1);

      const type = (await governance.proposals(1)).proposalType.toNumber();
      const receipt = await tx.wait();

      const events = receipt.events?.filter((x: any) => {
        return x.event == "ProposalCreated";
      });
      expect(type).to.be.eq(2);
    });

    it("Make a Core propsal", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);
      const sig = MasterChefStrategyLP.interface.encodeFunctionData(
        "updateMultiplier",
        ["10"]
      );

      await expect(
        governance
          .connect(user1)
          .corePropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::proposeAdmin: sender must be core member"
      );
      await governance.whiteListCommunityProposer(user1.address, true);
      await expect(
        governance
          .connect(user1)
          .corePropose(
            99,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: invalid voting period"
      );

      await expect(
        governance
          .connect(user1)
          .corePropose(
            5001,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: invalid voting period"
      );

      await expect(
        governance
          .connect(user1)
          .corePropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: proposer votes below proposal threshold"
      );

      await staking.connect(user1).stake(ac, 7);

      await expect(
        governance
          .connect(user1)
          .corePropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            [],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: proposal function information arity mismatch"
      );
      await expect(
        governance
          .connect(user1)
          .corePropose(500, [], [], [], [], "change bonus multiplier")
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: must provide actions"
      );

      const tx = await governance
        .connect(user1)
        .corePropose(
          500,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier"],
          [sig],
          "change bonus multiplier"
        );

      expect(await governance.proposalCount()).to.be.eq(1);

      const type = (await governance.proposals(1)).proposalType.toNumber();
      const receipt = await tx.wait();

      const events = receipt.events?.filter((x: any) => {
        return x.event == "ProposalCreated";
      });
      expect(type).to.be.eq(1);
    });

    it("Cast a vote", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      const sig = MasterChefStrategyLP.interface.encodeFunctionData(
        "updateMultiplier",
        ["10"]
      );

      await governance
        .connect(user1)
        .communityPropose(
          500,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier"],
          [sig],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();
      await expect(
        governance.connect(user2).castVote(currentPropsalID, true)
      ).to.be.revertedWith("AutocompoundGovernor::_castVote: voting is closed");

      await mineBlocks(ethers.provider, 501);

      await expect(
        governance.connect(user2).castVote(currentPropsalID, true)
      ).to.be.revertedWith(
        "AutocompoundGovernor::_castVote: Not eligible for voting"
      );

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await expect(
        governance.connect(user2).castVote(currentPropsalID, true)
      ).to.be.revertedWith(
        "AutocompoundGovernor::_castVote: voter already voted"
      );
    });

    it("Execute a purposal", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["3"]);
      await governance.whiteListCommunityProposer(user1.address, true);
      await governance
        .connect(user1)
        .corePropose(
          600,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier(uint256)"],
          [_callData],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await governance.connect(user3).castVote(currentPropsalID, true);
      await mineBlocks(ethers.provider, 1500);

      //Making governor ,admin of timelock

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);
      expect(await timelock.pendingAdmin()).to.be.eq(
        ethers.constants.AddressZero
      );

      // Executing proposal
      await expect(governance.connect(user1).execute(1)).to.be.revertedWith(
        "AutocompoundGovernor::__execute: sender must be gov guardian"
      );

      await governance.connect(user1).queue(1);
      await mineBlocks(ethers.provider, 1001);
      await expect(governance.connect(user1).execute(1)).to.be.revertedWith(
        "AutocompoundGovernor::__execute: sender must be gov guardian"
      );
      await governance.connect(owner).execute(1);
      expect(await MasterChefStrategyLP.BONUS_MULTIPLIER()).to.be.eq(3);
      expect((await governance.proposals(1)).executed).to.be.eq(true);
    });

    it("Check voting snapshots ", async () => {
      let yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();

      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      let ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);
      //User 2
      yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user2.address)
      ).toString();
      await MasterChefStrategyLP.connect(user2).withdraw(yrtBalance);
      ac = (await autoCoumpound.balanceOf(user2.address)).toString();
      await autoCoumpound.connect(user2).approve(staking.address, ac);
      await staking.connect(user2).stake(ac, 7);

      // User3
      yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user3.address)
      ).toString();
      await MasterChefStrategyLP.connect(user3).withdraw(yrtBalance);
      ac = (await autoCoumpound.balanceOf(user3.address)).toString();
      await autoCoumpound.connect(user3).approve(staking.address, ac);
      await staking.connect(user3).stake(ac, 7);

      const sig = MasterChefStrategyLP.interface.encodeFunctionData(
        "updateMultiplier",
        ["10"]
      );

      await governance
        .connect(user1)
        .communityPropose(
          500,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier"],
          [sig],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      let xuser1Votes = (
        await staking.getCurrentVotes(user1.address)
      ).toString();
      let xuser2Votes = (
        await staking.getCurrentVotes(user2.address)
      ).toString();
      let xuser3Votes = (
        await staking.getCurrentVotes(user3.address)
      ).toString();
      let xuser1Balance = (await staking.balanceOf(user1.address)).toString();
      let xuser2Balance = (await staking.balanceOf(user2.address)).toString();
      let xuser3Balance = (await staking.balanceOf(user3.address)).toString();

      await staking.connect(user1).transfer(user4.address, xuser1Balance);

      await governance.connect(user4).castVote(1, true);

      await staking.connect(user3).transfer(user6.address, xuser3Balance);
      await expect(
        governance.connect(user6).castVote(1, true)
      ).to.be.revertedWith(
        "AutocompoundGovernor::_castVote: Not eligible for voting"
      );
    });

    it("Check voting numbers ", async () => {
      let yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();

      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      let ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);
      //User 2
      yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user2.address)
      ).toString();
      await MasterChefStrategyLP.connect(user2).withdraw(yrtBalance);
      ac = (await autoCoumpound.balanceOf(user2.address)).toString();
      await autoCoumpound.connect(user2).approve(staking.address, ac);
      await staking.connect(user2).stake(ac, 7);

      // User3
      yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user3.address)
      ).toString();
      await MasterChefStrategyLP.connect(user3).withdraw(yrtBalance);
      ac = (await autoCoumpound.balanceOf(user3.address)).toString();
      await autoCoumpound.connect(user3).approve(staking.address, ac);
      await staking.connect(user3).stake(ac, 7);

      let _callData = MasterChefStrategyLP.interface.encodeFunctionData(
        "updateMultiplier",
        ["10"]
      );

      await governance
        .connect(user1)
        .communityPropose(
          500,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier(uint256)"],
          [_callData],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      let xuser1Votes = (
        await staking.getCurrentVotes(user1.address)
      ).toString();
      let xuser2Votes = (
        await staking.getCurrentVotes(user2.address)
      ).toString();
      let xuser3Votes = (
        await staking.getCurrentVotes(user3.address)
      ).toString();
      let xuser1Balance = (await staking.balanceOf(user1.address)).toString();
      let xuser2Balance = (await staking.balanceOf(user2.address)).toString();
      let xuser3Balance = (await staking.balanceOf(user3.address)).toString();

      await staking.connect(user1).transfer(user4.address, xuser1Balance);
      await staking.connect(user2).transfer(user4.address, xuser2Balance);

      await staking.connect(user3).approve(user8.address, xuser3Balance);
      await staking
        .connect(user8)
        .transferFrom(user3.address, user8.address, xuser3Balance);

      await expect(
        governance.connect(user3).castVote(1, true)
      ).to.be.revertedWith(
        "AutocompoundGovernor::_castVote: Not eligible for voting"
      );

      await staking
        .connect(user4)
        .transfer(user7.address, expandTo18Decimals(1));
      await governance.connect(user4).castVote(1, true);

      expect((await governance.proposals(1)).forVotes).to.be.eq(
        "4429384611000000000"
      );
      await governance.connect(user7).castVote(1, false);

      expect((await governance.proposals(1)).againstVotes).to.be.eq(
        expandTo18Decimals(1)
      );
      await governance.connect(user8).castVote(1, true);
      expect((await governance.proposals(1)).forVotes).to.be.eq(
        "5239999995000000000"
      );
    });

    it("Set timedelay from timelock", async () => {
      let target = timelock.address;
      let value = 0;
      let sig = "setDelay(uint256)";
      let callData = ethers.utils.defaultAbiCoder.encode(["uint256"], [420]);

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.delay()).to.be.eq(420);
    });

    it("Set timedelay from Governance", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["420"]);

      await governance
        .connect(user1)
        .communityPropose(
          500,
          [timelock.address],
          [0],
          ["setDelay(uint256)"],
          [_callData],
          "Change Delay Of timelock"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await governance.connect(user3).castVote(currentPropsalID, true);
      await mineBlocks(ethers.provider, 1500);

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);
      expect(await timelock.pendingAdmin()).to.be.eq(
        ethers.constants.AddressZero
      );

      // Executing proposal
      await expect(governance.connect(user1).execute(1)).to.be.revertedWith(
        "AutocompoundGovernor::__execute: sender must be gov guardian"
      );

      await governance.connect(user1).queue(1);
      await mineBlocks(ethers.provider, 1001);
      await expect(governance.connect(user1).execute(1)).to.be.revertedWith(
        "AutocompoundGovernor::__execute: sender must be gov guardian"
      );
      await governance.connect(owner).execute(1);
      expect(await timelock.delay()).to.be.eq(420);
    });

    it("Proposal cannot be cancelled after execution ", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["3"]);
      await governance.whiteListCommunityProposer(user1.address, true);
      await governance
        .connect(user1)
        .corePropose(
          600,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier(uint256)"],
          [_callData],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await governance.connect(user3).castVote(currentPropsalID, true);
      await mineBlocks(ethers.provider, 1500);

      //Making governor ,admin of timelock

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);
      expect(await timelock.pendingAdmin()).to.be.eq(
        ethers.constants.AddressZero
      );

      await governance.connect(user1).queue(1);
      await mineBlocks(ethers.provider, 1001);

      await governance.connect(owner).execute(1);

      await expect(governance.connect(owner).cancel(1)).to.be.revertedWith(
        "AutocompoundGovernor::cancel: cannot cancel executed proposal"
      );
    });

    it("Cancel a proposal after voting", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["3"]);
      await governance.whiteListCommunityProposer(user1.address, true);
      await governance
        .connect(user1)
        .corePropose(
          600,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier(uint256)"],
          [_callData],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await governance.connect(user3).castVote(currentPropsalID, true);
      await mineBlocks(ethers.provider, 1500);

      //Making governor ,admin of timelock

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);
      expect(await timelock.pendingAdmin()).to.be.eq(
        ethers.constants.AddressZero
      );

      await governance.cancel(1);
    });

    it("Cancel a proposal before voting starts", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      // await governance.connect(user2).castVote(currentPropsalID, true);

      // await governance.connect(user3).castVote(currentPropsalID, true);
      // await mineBlocks(ethers.provider, 1500);

      //Making governor ,admin of timelock

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);
      expect(await timelock.pendingAdmin()).to.be.eq(
        ethers.constants.AddressZero
      );
      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["3"]);
      await governance.whiteListCommunityProposer(user1.address, true);
      await governance
        .connect(user1)
        .corePropose(
          600,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier(uint256)"],
          [_callData],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.cancel(1);
    });

    it("Cancel a proposal from timelock", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["3"]);
      await governance.whiteListCommunityProposer(user1.address, true);
      await governance
        .connect(user1)
        .corePropose(
          600,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier(uint256)"],
          [_callData],
          "change bonus multiplier"
        );
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await governance.connect(user3).castVote(currentPropsalID, true);
      await mineBlocks(ethers.provider, 1500);

      //Making governor ,admin of timelock

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);

      await timelock
        .connect(owner)
        .cancelTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);
    });

    it("Execute a puposal with empty target", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);

      await staking.connect(user1).stake(ac, 7);

      let _callData = ethers.utils.defaultAbiCoder.encode(["uint256"], ["0"]);

      const tx = await governance
        .connect(user1)
        .communityPropose(
          500,
          [ethers.constants.AddressZero],
          [0],
          [""],
          [_callData],
          "Makr UI Changes"
        );

      const receipt = await tx.wait();

      const events = receipt.events?.filter((x: any) => {
        return x.event == "ProposalCreated";
      });
      const currentPropsalID = (await governance.proposalCount()).toString();

      await mineBlocks(ethers.provider, 501);

      await staking
        .connect(user1)
        .transfer(user2.address, expandTo18Decimals(1));
      await staking
        .connect(user1)
        .transfer(user3.address, expandTo18Decimals(1));

      await governance.connect(user2).castVote(currentPropsalID, true);

      await governance.connect(user3).castVote(currentPropsalID, true);
      await mineBlocks(ethers.provider, 1500);

      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      const blockNumber: any = await ethers.provider.getBlockNumber();
      const blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      const eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(
            target,
            value,
            sig,
            callData,
            timeLockDelay.toNumber()
          )
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Estimated execution block must satisfy delay."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't been queued."
      );
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);
      expect(await timelock.pendingAdmin()).to.be.eq(
        ethers.constants.AddressZero
      );

      // Executing proposal
      await expect(governance.connect(user1).execute(1)).to.be.revertedWith(
        "AutocompoundGovernor::__execute: sender must be gov guardian"
      );

      await governance.connect(user1).queue(1);
      await mineBlocks(ethers.provider, 1001);
      await expect(governance.connect(user1).execute(1)).to.be.revertedWith(
        "AutocompoundGovernor::__execute: sender must be gov guardian"
      );
      await governance.connect(owner).execute(1);
    });

    it("Cast vote by signature", async () => {
      const yrtBalance = (
        await MasterChefStrategyLP.balanceOf(user1.address)
      ).toString();
      await MasterChefStrategyLP.connect(user1).withdraw(yrtBalance);
      const ac = (await autoCoumpound.balanceOf(user1.address)).toString();
      await autoCoumpound.connect(user1).approve(staking.address, ac);
      const sig = MasterChefStrategyLP.interface.encodeFunctionData(
        "updateMultiplier",
        ["10"]
      );

      await expect(
        governance
          .connect(user1)
          .corePropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::proposeAdmin: sender must be core member"
      );
      await governance.whiteListCommunityProposer(user1.address, true);
      await expect(
        governance
          .connect(user1)
          .corePropose(
            99,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: invalid voting period"
      );

      await expect(
        governance
          .connect(user1)
          .corePropose(
            5001,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: invalid voting period"
      );

      await expect(
        governance
          .connect(user1)
          .corePropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            ["updateMultiplier"],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: proposer votes below proposal threshold"
      );

      await staking.connect(user1).stake(ac, 7);
      // await staking.connect(user2).stake(ac, 7);

      await expect(
        governance
          .connect(user1)
          .corePropose(
            500,
            [MasterChefStrategyLP.address],
            [0],
            [],
            [sig],
            "change bonus multiplier"
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: proposal function information arity mismatch"
      );
      await expect(
        governance
          .connect(user1)
          .corePropose(500, [], [], [], [], "change bonus multiplier")
      ).to.be.revertedWith(
        "AutocompoundGovernor::propose: must provide actions"
      );

      const tx = await governance
        .connect(user1)
        .corePropose(
          500,
          [MasterChefStrategyLP.address],
          [0],
          ["updateMultiplier"],
          [sig],
          "change bonus multiplier"
        );

      expect(await governance.proposalCount()).to.be.eq(1);

      const type = (await governance.proposals(1)).proposalType.toNumber();
      const receipt = await tx.wait();

      const events = receipt.events?.filter((x: any) => {
        return x.event == "ProposalCreated";
      });
      expect(type).to.be.eq(1);

      await mineBlocks(ethers.provider, 501);
      const EIP712Domain = [
        { name: "name", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ];

      const domain: any = {
        name: "AutocompoundGovernor",
        chainId: 1337,
        verifyingContract: governance.address,
      };
      const types = {
        Ballot: [
          { name: "proposalId", type: "uint256" },
          { name: "support", type: "bool" },
        ],
      };

      // The data to sign
      const value = {
        proposalId: 1,
        support: true,
      };

      let signature = await user1._signTypedData(domain, types, value);
      const { r, s, v } = splitSignature(signature);
      await governance.castVoteBySig(1, true, v, r, s);

      await expect(
        governance.castVoteBySig(1, true, v, r, s)
      ).to.be.revertedWith(
        "AutocompoundGovernor::_castVote: voter already voted"
      );
    });

    it("Recover funds by timelock", async () => {
      await expect(
        timelock.connect(user1).recoverNativeAsset(user.address)
      ).to.be.revertedWith(
        "Timelock::recoverNativeAsset: Call must come from Timelock."
      );

      await owner.sendTransaction({
        to: MasterChefStrategyLP.address,
        value: ethers.utils.parseEther("5.0"), // Sends exactly 1.0 ether
      });
      expect(
        await ethers.provider.getBalance(MasterChefStrategyLP.address)
      ).to.be.eq(expandTo18Decimals(5));

      let target = MasterChefStrategyLP.address;
      let value = 0;
      let sig = "recoverNativeAsset(uint256)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [expandTo18Decimals(2)]
      );
      let blockNumber: any = await ethers.provider.getBlockNumber();
      let blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      let eta = timeLockDelay.toNumber() + time + 600;
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await mineBlocks(ethers.provider, 1600);

      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);
      expect(await ethers.provider.getBalance(user9.address)).to.be.eq(
        expandTo18Decimals(10000)
      );
      target = timelock.address;
      value = 0;
      sig = "recoverNativeAsset(address)";
      callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [user9.address]
      );
      blockNumber = await ethers.provider.getBlockNumber();
      blockDetails = await ethers.provider.getBlock(blockNumber);

      time = blockDetails.timestamp;
      timeLockDelay = await timelock.delay();
      eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await mineBlocks(ethers.provider, 1600);

      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);
      expect(await ethers.provider.getBalance(user9.address)).to.be.eq(
        expandTo18Decimals(10002)
      );
    });

    it("Recover funds by Governor contract", async () => {
      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      let blockNumber: any = await ethers.provider.getBlockNumber();
      let blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      let eta = timeLockDelay.toNumber() + time + 600;

      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).recoverNativeAsset(user.address)
      ).to.be.revertedWith(
        "Timelock::recoverNativeAsset: Call must come from Timelock."
      );

      await owner.sendTransaction({
        to: MasterChefStrategyLP.address,
        value: ethers.utils.parseEther("5.0"), // Sends exactly 1.0 ether
      });

      expect(
        await ethers.provider.getBalance(MasterChefStrategyLP.address)
      ).to.be.eq(expandTo18Decimals(5));

      blockNumber = await ethers.provider.getBlockNumber();
      blockDetails = await ethers.provider.getBlock(blockNumber);

      time = blockDetails.timestamp;
      timeLockDelay = await timelock.delay();
      eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        governance
          .connect(user1)
          .__queRecoverFunds(
            user9.address,
            MasterChefStrategyLP.address,
            eta,
            expandTo18Decimals(2)
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__queRecoverFunds: sender must be gov guardian"
      );
      await expect(
        governance
          .connect(owner)
          .__queRecoverFunds(
            user9.address,
            MasterChefStrategyLP.address,
            eta,
            0
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__queRecoverFunds: amount should be greater then zero"
      );

      await governance
        .connect(owner)
        .__queRecoverFunds(
          user9.address,
          MasterChefStrategyLP.address,
          eta,
          expandTo18Decimals(2)
        );

      await mineBlocks(ethers.provider, 1600);

      await expect(
        governance
          .connect(user1)
          .__executeRecoverFunds(
            user9.address,
            MasterChefStrategyLP.address,
            eta,
            expandTo18Decimals(2)
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__executeRecoverFunds: sender must be gov guardian"
      );
      await expect(
        governance
          .connect(owner)
          .__executeRecoverFunds(
            user9.address,
            MasterChefStrategyLP.address,
            eta,
            0
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__executeRecoverFunds: amount should be greater then zero"
      );

      await governance
        .connect(owner)
        .__executeRecoverFunds(
          user9.address,
          MasterChefStrategyLP.address,
          eta,
          expandTo18Decimals(2)
        );
      expect(
        await ethers.provider.getBalance(MasterChefStrategyLP.address)
      ).to.be.eq(expandTo18Decimals(3));

      expect(await ethers.provider.getBalance(timelock.address)).to.be.eq(0);
    });

    it("Recover Tokens by timelock", async () => {
      await expect(
        timelock.connect(user1).recoverERC20(user.address, BUSD.address)
      ).to.be.revertedWith(
        "Timelock::recoverERC20: Call must come from Timelock"
      );

      await BUSD.transfer(
        MasterChefStrategyLP.address,
        expandTo18Decimals(100)
      );

      expect(await BUSD.balanceOf(MasterChefStrategyLP.address)).to.be.eq(
        expandTo18Decimals(100)
      );

      let target = MasterChefStrategyLP.address;
      let value = 0;
      let sig = "recoverERC20(address,uint256)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [BUSD.address, expandTo18Decimals(60)]
      );
      let blockNumber: any = await ethers.provider.getBlockNumber();
      let blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      let eta = timeLockDelay.toNumber() + time + 600;
      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);
      expect(await BUSD.balanceOf(user9.address)).to.be.eq(0);
      target = timelock.address;
      value = 0;
      sig = "recoverERC20(address,address)";
      callData = ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [user9.address, BUSD.address]
      );
      blockNumber = await ethers.provider.getBlockNumber();
      blockDetails = await ethers.provider.getBlock(blockNumber);

      time = blockDetails.timestamp;
      timeLockDelay = await timelock.delay();
      eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        timelock
          .connect(user1)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);
      await mineBlocks(ethers.provider, 1600);

      await expect(
        timelock.connect(user1).executeTransaction(target, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::executeTransaction: Call must come from admin."
      );

      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);
      expect(await BUSD.balanceOf(user9.address)).to.be.eq(
        expandTo18Decimals(60)
      );
    });

    it("Recover Tokens by Governor contract", async () => {
      let target = timelock.address;
      let value = 0;
      let sig = "setPendingAdmin(address)";
      let callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [governance.address]
      );

      let blockNumber: any = await ethers.provider.getBlockNumber();
      let blockDetails = await ethers.provider.getBlock(blockNumber);

      let time = blockDetails.timestamp;
      let timeLockDelay: any = await timelock.delay();
      let eta = timeLockDelay.toNumber() + time + 600;

      await timelock
        .connect(owner)
        .queueTransaction(target, value, sig, callData, eta);

      await mineBlocks(ethers.provider, 1600);
      await timelock
        .connect(owner)
        .executeTransaction(target, sig, callData, eta);

      expect(await timelock.pendingAdmin()).to.be.eq(governance.address);

      await governance.connect(owner).__acceptAdmin();
      expect(await timelock.admin()).to.be.eq(governance.address);

      await expect(
        timelock
          .connect(owner)
          .queueTransaction(target, value, sig, callData, eta)
      ).to.be.revertedWith(
        "Timelock::queueTransaction: Call must come from admin."
      );

      await expect(
        timelock.connect(owner).recoverERC20(user.address, BUSD.address)
      ).to.be.revertedWith(
        "Timelock::recoverERC20: Call must come from Timelock."
      );

      await BUSD.transfer(
        MasterChefStrategyLP.address,
        expandTo18Decimals(100)
      );

      expect(await BUSD.balanceOf(MasterChefStrategyLP.address)).to.be.eq(
        expandTo18Decimals(100)
      );

      blockNumber = await ethers.provider.getBlockNumber();
      blockDetails = await ethers.provider.getBlock(blockNumber);

      time = blockDetails.timestamp;
      timeLockDelay = await timelock.delay();
      eta = timeLockDelay.toNumber() + time + 600;

      await expect(
        governance
          .connect(user1)
          .__queRecoverTokens(
            user9.address,
            MasterChefStrategyLP.address,
            BUSD.address,
            expandTo18Decimals(30),
            eta
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__queRecoverTokens: sender must be gov guardian"
      );

      await expect(
        governance
          .connect(owner)
          .__queRecoverTokens(
            user9.address,
            MasterChefStrategyLP.address,
            BUSD.address,
            0,
            eta
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__queRecoverTokens: amount should be greater then zero"
      );

      await governance
        .connect(owner)
        .__queRecoverTokens(
          user9.address,
          MasterChefStrategyLP.address,
          BUSD.address,
          expandTo18Decimals(30),
          eta
        );

      await mineBlocks(ethers.provider, 1600);

      await expect(
        governance
          .connect(user1)
          .__executeRecoverTokens(
            user9.address,
            MasterChefStrategyLP.address,
            BUSD.address,
            expandTo18Decimals(30),
            eta
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__executeRecoverTokens: sender must be gov guardian"
      );
      await expect(
        governance
          .connect(owner)
          .__executeRecoverTokens(
            user9.address,
            MasterChefStrategyLP.address,
            BUSD.address,
            0,
            eta
          )
      ).to.be.revertedWith(
        "AutocompoundGovernor::__executeRecoverTokens: amount should be greater then zero"
      );
      expect(await BUSD.balanceOf(user9.address)).to.be.eq(0);
      await governance
        .connect(owner)
        .__executeRecoverTokens(
          user9.address,
          MasterChefStrategyLP.address,
          BUSD.address,
          expandTo18Decimals(30),
          eta
        );

      expect(await BUSD.balanceOf(MasterChefStrategyLP.address)).to.be.eq(
        expandTo18Decimals(70)
      );

      expect(await BUSD.balanceOf(user9.address)).to.be.eq(
        expandTo18Decimals(30)
      );
    });
  });
});
