import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { expect } from "chai";

import {
  StakingRewards,
  StakingRewards__factory,
  USDT,
  USDT__factory,
  BUSD,
  BUSD__factory,
  WETH9,
  WETH9__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  SingleTokenRewardLPMining,
  SingleTokenRewardLPMining__factory,
  Staking,
  Staking__factory,
  Autocompound,
  Autocompound__factory,
  Quick,
  Quick__factory,
  USDC,
  USDC__factory,
  DragonLair,
  DragonLair__factory,
} from "../../typechain";

import { expandTo18Decimals, mineBlocks } from "../../utilities/utilities";

describe("Quickswap", async () => {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let signers: SignerWithAddress[];
  let stakingRewards: StakingRewards;
  let contract: any;
  let USDT: USDT;
  let BUSD: BUSD;
  let quick: Quick;
  let factory: UniswapV2Factory;
  let router: UniswapV2Router02;
  let WETH: WETH9;
  let pairAddress: string;
  let pairInstance: UniswapV2Pair;
  let autocompound: Autocompound;
  let staking: Staking;
  let singleTokenRewardLPMining: SingleTokenRewardLPMining;
  let treasury: SignerWithAddress;
  let USDC: USDC;
  let dragonLiar: DragonLair;
  let token0: any;
  let token1: any;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];
    user1 = signers[2];
    user2 = signers[3];
    user3 = signers[4];
    treasury = signers[5];
    user4 = signers[10];

    factory = await new UniswapV2Factory__factory(owner).deploy(owner.address);
    WETH = await new WETH9__factory(owner).deploy();
    router = await new UniswapV2Router02__factory(owner).deploy(
      factory.address,
      WETH.address
    );
    USDT = await new USDT__factory(owner).deploy("USDT", "USDT");
    BUSD = await new BUSD__factory(owner).deploy("BUSD", "BUSD");
    quick = await new Quick__factory(owner).deploy(owner.address);
    dragonLiar = await new DragonLair__factory(owner).deploy(quick.address);
    await quick.mint(owner.address, expandTo18Decimals(1000));
    USDC = await new USDC__factory(owner).deploy();

    autocompound = await new Autocompound__factory(owner).deploy();
    await autocompound.mint(owner.address, expandTo18Decimals(1000));
    staking = await new Staking__factory(owner).deploy(autocompound.address);

    await BUSD.approve(router.address, expandTo18Decimals(20000000));
    await USDT.approve(router.address, expandTo18Decimals(20000000));
    await autocompound.approve(router.address, expandTo18Decimals(20000000));
    await quick.approve(router.address, expandTo18Decimals(20000000));
    let value: any = ethers.utils.parseEther("100");
    await router
      .connect(owner)
      .addLiquidityETH(
        BUSD.address,
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    await router
      .connect(owner)
      .addLiquidityETH(
        USDT.address,
        expandTo18Decimals(2000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );
    value = ethers.utils.parseEther("1");

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

    pairAddress = await factory.getPair(USDT.address, BUSD.address);

    pairInstance = new UniswapV2Pair__factory(owner).attach(pairAddress);
    await router
      .connect(owner)
      .addLiquidityETH(
        autocompound.address,
        expandTo18Decimals(10),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    await router
      .connect(owner)
      .addLiquidityETH(
        quick.address,
        expandTo18Decimals(345),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    await router
      .connect(owner)
      .addLiquidity(
        quick.address,
        USDT.address,
        expandTo18Decimals(311),
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );

    await router
      .connect(owner)
      .addLiquidity(
        quick.address,
        BUSD.address,
        expandTo18Decimals(311),
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );

    contract = new StakingRewards__factory(owner);
    stakingRewards = await contract.deploy(
      owner.address,
      dragonLiar.address,
      pairAddress
    );
    await dragonLiar._mint(stakingRewards.address, expandTo18Decimals(10000));
    await stakingRewards.notifyRewardAmount(expandTo18Decimals(10000), 500);

    singleTokenRewardLPMining = await new SingleTokenRewardLPMining__factory(
      owner
    ).deploy(
      autocompound.address,
      staking.address,
      WETH.address,
      dragonLiar.address,
      pairAddress,
      quick.address,
      stakingRewards.address,
      router.address,
      expandTo18Decimals(1),
      owner.address,
      treasury.address
    );
    for (let i = 6; i <= 9; i++) {
      await quick.mint(signers[i].address, expandTo18Decimals((i - 5) * 100));
      await quick
        .connect(signers[i])
        .approve(dragonLiar.address, expandTo18Decimals((i - 5) * 100));

      await dragonLiar
        .connect(signers[i])
        .enter(expandTo18Decimals((i - 5) * 100));
    }
    await quick.mint(dragonLiar.address, expandTo18Decimals(1500));
    await autocompound.setOperator(singleTokenRewardLPMining.address, true);
    token0 = await pairInstance.token0();
    token1 = await pairInstance.token1();
    token0 = new UniswapV2Pair__factory(owner).attach(token0);
    token1 = new UniswapV2Pair__factory(owner).attach(token1);
    await singleTokenRewardLPMining.mintAutocompoundTokens();
  });

  describe("Deposit LP", async () => {
    it("Deposit", async () => {
      await pairInstance.approve(
        singleTokenRewardLPMining.address,
        expandTo18Decimals(100)
      );
      await singleTokenRewardLPMining.deposit(expandTo18Decimals(100));
      const reciptTokens = await singleTokenRewardLPMining.balanceOf(
        owner.address
      );
      expect(reciptTokens).to.be.eq(expandTo18Decimals(100));
      expect(await singleTokenRewardLPMining.totalDeposits()).to.be.eq(
        expandTo18Decimals(100)
      );
      expect(
        (await singleTokenRewardLPMining.userInfo(owner.address)).amount
      ).to.be.eq(expandTo18Decimals(100));
    });
    it("Deposit single token", async () => {
      await token0.transfer(user1.address, expandTo18Decimals(100));
      await token0
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(100));
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .singleTokenDeposit(expandTo18Decimals(0), token0.address, 1)
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::singleTokenDeposit: Can not deposit zero amount"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .singleTokenDeposit(expandTo18Decimals(10), token0.address, 0)
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::singleTokenDeposit: Invalid slippage"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .singleTokenDeposit(expandTo18Decimals(10), token0.address, 501)
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::singleTokenDeposit: Invalid slippage"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .singleTokenDeposit(expandTo18Decimals(10), WETH.address, 1)
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::singleTokenDeposit: Invalid token address"
      );
      const reciptTokensBefore = await singleTokenRewardLPMining.balanceOf(
        user1.address
      );
      expect(reciptTokensBefore).to.be.eq("0");
      await singleTokenRewardLPMining
        .connect(user1)
        .singleTokenDeposit(expandTo18Decimals(100), token0.address, 1);
      const reciptTokensAfter = await singleTokenRewardLPMining.balanceOf(
        user1.address
      );
      expect(reciptTokensAfter).to.be.above(reciptTokensBefore);
    });
    it("Deposit dual tokens", async () => {
      await token0.transfer(user1.address, expandTo18Decimals(200));
      await token0
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(100));
      await token1.transfer(user1.address, expandTo18Decimals(100));
      await token1
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(100));
      await token0
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(200));
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(0),
            token0.address,
            expandTo18Decimals(1),
            token1.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Can not deposit zero amount"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(1),
            token0.address,
            expandTo18Decimals(0),
            token1.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Can not deposit zero amount"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(0),
            token0.address,
            expandTo18Decimals(0),
            token1.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Can not deposit zero amount"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(200),
            WETH.address,
            expandTo18Decimals(100),
            token1.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Invalid token address"
      );

      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(200),
            token0.address,
            expandTo18Decimals(100),
            WETH.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Invalid token address"
      );

      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(200),
            USDC.address,
            expandTo18Decimals(100),
            WETH.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Invalid token address"
      );

      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(200),
            token1.address,
            expandTo18Decimals(100),
            token0.address,
            1
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Invalid token address"
      );

      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(200),
            token0.address,
            expandTo18Decimals(100),
            token1.address,
            0
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Invalid slippage"
      );

      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .dualTokenDeposit(
            expandTo18Decimals(200),
            token0.address,
            expandTo18Decimals(100),
            token1.address,
            501
          )
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::dualTokenDeposit: Invalid slippage"
      );

      const reciptTokensBefore = await singleTokenRewardLPMining.balanceOf(
        user1.address
      );
      expect(reciptTokensBefore).to.be.eq("0");
      await singleTokenRewardLPMining
        .connect(user1)
        .dualTokenDeposit(
          expandTo18Decimals(200),
          token0.address,
          expandTo18Decimals(100),
          token1.address,
          1
        );
      expect(
        await singleTokenRewardLPMining.balanceOf(user1.address)
      ).to.be.above(reciptTokensBefore);
    });
    it("Reinvest and Withdraw", async () => {
      await expect(
        singleTokenRewardLPMining.connect(user1).reinvestOps()
      ).to.be.revertedWith("QuickSwapStrategy::onlyOps: onlyOps");
      for (let i = 1; i <= 3; i++) {
        await pairInstance.transfer(
          signers[i + 1].address,
          expandTo18Decimals(i * 100)
        );
        await pairInstance
          .connect(signers[i + 1])
          .approve(
            singleTokenRewardLPMining.address,
            expandTo18Decimals(i * 100)
          );
        await singleTokenRewardLPMining
          .connect(signers[i + 1])
          .deposit(expandTo18Decimals(i * 100));
        await mineBlocks(ethers.provider, 11);
        await singleTokenRewardLPMining.reinvestOps();
      }
      let reciptTokens1: any = await singleTokenRewardLPMining.balanceOf(
        user1.address
      );
      reciptTokens1 = reciptTokens1.toString();
      await expect(
        singleTokenRewardLPMining.connect(user1).withdraw("0")
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::_withdraw: withdraw amount can,t be zero"
      );
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .withdraw(expandTo18Decimals(101))
      ).to.be.revertedWith(
        "SingleTokenRewardLPMining::_withdraw: Can't withdraw this much amount"
      );
      await singleTokenRewardLPMining.connect(user1).withdraw(reciptTokens1);
      let reciptTokens2: any = await singleTokenRewardLPMining.balanceOf(
        user2.address
      );
      reciptTokens2 = reciptTokens2.toString();
      await singleTokenRewardLPMining.connect(user2).withdraw(reciptTokens2);
      let reciptTokens3: any = await singleTokenRewardLPMining.balanceOf(
        user3.address
      );
      reciptTokens3 = reciptTokens3.toString();
      await singleTokenRewardLPMining.connect(user3).withdraw(reciptTokens3);
      const incresedLP1 = await pairInstance.balanceOf(user1.address);
      const incresedLP2 = await pairInstance.balanceOf(user2.address);
      const incresedLP3 = await pairInstance.balanceOf(user3.address);
      expect(incresedLP1).to.be.above(expandTo18Decimals(100));
      expect(incresedLP2).to.be.above(expandTo18Decimals(200));
      expect(incresedLP3).to.be.above(expandTo18Decimals(300));
    });
    it("Dual Withdraw", async () => {
      for (let i = 1; i <= 3; i++) {
        await token0.transfer(
          signers[i + 1].address,
          expandTo18Decimals(i * 100)
        );
        await token1.transfer(
          signers[i + 1].address,
          expandTo18Decimals(i * 200)
        );
        await token1
          .connect(signers[i + 1])
          .approve(
            singleTokenRewardLPMining.address,
            expandTo18Decimals(i * 200)
          );
        await token0
          .connect(signers[i + 1])
          .approve(
            singleTokenRewardLPMining.address,
            expandTo18Decimals(i * 100)
          );
        await singleTokenRewardLPMining
          .connect(signers[i + 1])
          .dualTokenDeposit(
            expandTo18Decimals(i * 100),
            token0.address,
            expandTo18Decimals(i * 200),
            token1.address,
            1
          );
        await mineBlocks(ethers.provider, 150);
        await singleTokenRewardLPMining.reinvestOps();
        const reciptTokens = await singleTokenRewardLPMining.balanceOf(
          signers[i + 1].address
        );
        await singleTokenRewardLPMining
          .connect(signers[i + 1])
          .dualWithdraw(reciptTokens);
      }
      const user1token0AfterWithdraw = await token0.balanceOf(user1.address);
      const user1token1AfterWithdraw = await token1.balanceOf(user1.address);
      const user2token0AfterWithdraw = await token0.balanceOf(user2.address);
      const user2token1AfterWithdraw = await token1.balanceOf(user2.address);
      const user3token0AfterWithdraw = await token0.balanceOf(user3.address);
      const user3token1AfterWithdraw = await token1.balanceOf(user3.address);
      expect(user1token0AfterWithdraw).to.be.above(expandTo18Decimals(100));
      expect(user1token1AfterWithdraw).to.be.above(expandTo18Decimals(200));
      expect(user2token0AfterWithdraw).to.be.above(expandTo18Decimals(200));
      expect(user2token1AfterWithdraw).to.be.above(expandTo18Decimals(400));
      expect(user3token0AfterWithdraw).to.be.above(expandTo18Decimals(300));
      expect(user3token1AfterWithdraw).to.be.above(expandTo18Decimals(600));
    });
    it("Revoke Allownace", async () => {
      let allowance = await pairInstance.allowance(
        singleTokenRewardLPMining.address,
        stakingRewards.address
      );
      expect(allowance).to.be.above("0");
      await singleTokenRewardLPMining.revokeAllowance(
        pairAddress,
        stakingRewards.address
      );
      allowance = await pairInstance.allowance(
        singleTokenRewardLPMining.address,
        stakingRewards.address
      );
      expect(allowance).to.be.eq("0");
    });
    it("Set Allownace", async () => {
      await expect(
        singleTokenRewardLPMining
          .connect(user1)
          .revokeAllowance(pairAddress, stakingRewards.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      let allowance = await pairInstance.allowance(
        singleTokenRewardLPMining.address,
        stakingRewards.address
      );
      expect(allowance).to.be.above("0");
      await singleTokenRewardLPMining.revokeAllowance(
        pairAddress,
        stakingRewards.address
      );
      allowance = await pairInstance.allowance(
        singleTokenRewardLPMining.address,
        stakingRewards.address
      );
      expect(allowance).to.be.eq("0");
      await singleTokenRewardLPMining.setAllowances();
      allowance = await pairInstance.allowance(
        singleTokenRewardLPMining.address,
        stakingRewards.address
      );
      expect(allowance).to.be.above("0");
    });
    it("Udate Admin Fees", async () => {
      await expect(
        singleTokenRewardLPMining.updateAdminFee("9501")
      ).to.be.revertedWith(
        "QuickSwapStrategy::updateAdminFee: admin fee too high"
      );
      await singleTokenRewardLPMining.updateAdminFee(30);
      const updatedFee = await singleTokenRewardLPMining.ADMIN_FEE_BIPS();
      expect(updatedFee).to.be.eq(30);
    });
    it("Update reinvest before deposit", async () => {
      await singleTokenRewardLPMining.updateRequireReinvestBeforeDeposit();
      const param =
        await singleTokenRewardLPMining.REQUIRE_REINVEST_BEFORE_DEPOSIT();
      expect(param).to.be.eq(true);
    });
    it("Update reinvest reward", async () => {
      await expect(
        singleTokenRewardLPMining.updateReinvestReward("9501")
      ).to.be.revertedWith(
        "QuickSwapStrategy::updateReinvestReward : reinvest reward too high"
      );
      await singleTokenRewardLPMining.updateReinvestReward("501");
      const param = await singleTokenRewardLPMining.REINVEST_REWARD_BIPS();
      expect(param).to.be.eq("501");
    });
    it("Recover ERC20", async () => {
      expect(
        await token0.balanceOf(singleTokenRewardLPMining.address)
      ).to.be.eq("0");
      await token0.transfer(
        singleTokenRewardLPMining.address,
        expandTo18Decimals(100)
      );
      expect(
        await token0.balanceOf(singleTokenRewardLPMining.address)
      ).to.be.eq(expandTo18Decimals(100));
      const prevBalance = await token0.balanceOf(owner.address);
      await singleTokenRewardLPMining.recoverERC20(
        token0.address,
        expandTo18Decimals(10)
      );
      expect(await token0.balanceOf(owner.address)).to.be.above(prevBalance);
    });
    it("Update Multiplier", async () => {
      await singleTokenRewardLPMining.updateMultiplier(50);
      expect(await singleTokenRewardLPMining.BONUS_MULTIPLIER()).to.be.eq(50);
    });
    it("Update Autocompound per block", async () => {
      await singleTokenRewardLPMining.updateAutoCompoundTokenPerBlock(
        expandTo18Decimals(50)
      );
      expect(
        await singleTokenRewardLPMining.autoCompoundTokenPerBlock()
      ).to.be.eq(expandTo18Decimals(50));
    });
    it("Recover Native asset", async () => {
      expect(
        await ethers.provider.getBalance(singleTokenRewardLPMining.address)
      ).to.be.eq("0");
      let tx = {
        to: singleTokenRewardLPMining.address,
        value: ethers.utils.parseEther("10"),
      };
      await owner.sendTransaction(tx);
      expect(
        await ethers.provider.getBalance(singleTokenRewardLPMining.address)
      ).to.be.eq(expandTo18Decimals(10));
      const prevBalance = await ethers.provider.getBalance(owner.address);
      await singleTokenRewardLPMining.recoverNativeAsset(
        expandTo18Decimals(10)
      );
      expect(await ethers.provider.getBalance(owner.address)).to.be.above(
        prevBalance
      );
    });
    it("Exit", async () => {
      const balanceBeforedQuick = await dragonLiar.balanceOf(
        singleTokenRewardLPMining.address
      );
      const balanceBeforeLP = await pairInstance.balanceOf(
        singleTokenRewardLPMining.address
      );
      await token0.transfer(user1.address, expandTo18Decimals(200));
      await token0
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(100));
      await token1.transfer(user1.address, expandTo18Decimals(100));
      await token1
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(100));
      await token0
        .connect(user1)
        .approve(singleTokenRewardLPMining.address, expandTo18Decimals(200));

      await singleTokenRewardLPMining
        .connect(user1)
        .dualTokenDeposit(
          expandTo18Decimals(200),
          token0.address,
          expandTo18Decimals(100),
          token1.address,
          1
        );

      await singleTokenRewardLPMining.emergencyWithdraw();

      expect(
        await dragonLiar.balanceOf(singleTokenRewardLPMining.address)
      ).to.be.above(balanceBeforedQuick);

      expect(
        await pairInstance.balanceOf(singleTokenRewardLPMining.address)
      ).to.be.above(balanceBeforeLP);

      const ownerdQuickBalance = await dragonLiar.balanceOf(owner.address);
      const ownerLPBalance = await pairInstance.balanceOf(owner.address);

      await singleTokenRewardLPMining.recoverERC20(
        pairAddress,
        expandTo18Decimals(1)
      );
      await singleTokenRewardLPMining.recoverERC20(
        dragonLiar.address,
        expandTo18Decimals(1)
      );

      const ownerdQuickBalanceAfterExit = await quick.balanceOf(owner.address);
      const ownerLPBalanceAfterExit = await pairInstance.balanceOf(
        owner.address
      );

      expect(ownerdQuickBalanceAfterExit).to.be.above(ownerdQuickBalance);

      expect(ownerLPBalanceAfterExit).to.be.above(ownerLPBalance);
    });
    it("Estimate reinvest rewards", async () => {
      await pairInstance.approve(
        singleTokenRewardLPMining.address,
        expandTo18Decimals(100)
      );
      await singleTokenRewardLPMining.deposit(expandTo18Decimals(100));
      const reciptTokens = await singleTokenRewardLPMining.balanceOf(
        owner.address
      );
      expect(reciptTokens).to.be.eq(expandTo18Decimals(100));
      expect(await singleTokenRewardLPMining.totalDeposits()).to.be.eq(
        expandTo18Decimals(100)
      );
      expect(
        (await singleTokenRewardLPMining.userInfo(owner.address)).amount
      ).to.be.eq(expandTo18Decimals(100));
      await mineBlocks(ethers.provider, 1000);
      const reinvestRewards =
        await singleTokenRewardLPMining.estimateReinvestReward();
      expect(await autocompound.balanceOf(staking.address)).to.be.eq("0");
      expect(await quick.balanceOf(user4.address)).to.be.eq("0");

      await expect(
        singleTokenRewardLPMining.connect(user1).reinvestOps()
      ).to.be.revertedWith("QuickSwapStrategy::onlyOps: onlyOps");

      await singleTokenRewardLPMining.connect(user4).reinvest();
      expect(await autocompound.balanceOf(staking.address)).to.be.above("0");
      expect(await quick.balanceOf(user4.address)).to.be.eq(reinvestRewards);
    });
  });
});
