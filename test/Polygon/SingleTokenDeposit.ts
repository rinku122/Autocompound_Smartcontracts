import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { expect } from "chai";

import {
  StakingRewards,
  StakingRewards__factory,
  IXT,
  IXT__factory,
  WETH9,
  WETH9__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  SingleTokenDeposit,
  SingleTokenDeposit__factory,
  Staking,
  Staking__factory,
  Autocompound,
  Autocompound__factory,
  Quick,
  Quick__factory,
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
  let IXT: any;
  let quick: Quick;
  let factory: UniswapV2Factory;
  let router: UniswapV2Router02;
  let WETH: WETH9;
  //   let pairAddress: string;
  //   let pairInstance: UniswapV2Pair;
  let autocompound: Autocompound;
  let staking: Staking;
  let singleTokenDeposit: SingleTokenDeposit;
  let treasury: SignerWithAddress;

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
    IXT = await new IXT__factory(owner).deploy();
    quick = await new Quick__factory(owner).deploy(owner.address);
    await quick.mint(owner.address, expandTo18Decimals(10000));
    await IXT.mint(owner.address, expandTo18Decimals(10000));

    autocompound = await new Autocompound__factory(owner).deploy();

    await quick.mint(owner.address, expandTo18Decimals(10000));
    await IXT.mint(owner.address, expandTo18Decimals(10000));
    await autocompound.mint(owner.address, expandTo18Decimals(1000));

    staking = await new Staking__factory(owner).deploy(autocompound.address);

    await IXT.approve(router.address, expandTo18Decimals(20000000));
    await quick.approve(router.address, expandTo18Decimals(20000000));
    await autocompound.approve(router.address, expandTo18Decimals(20000000));
    let value: any = ethers.utils.parseEther("1");

    await router
      .connect(owner)
      .addLiquidity(
        IXT.address,
        quick.address,
        expandTo18Decimals(100),
        expandTo18Decimals(2163),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );

    // pairAddress = await factory.getPair(IXT.address, quick.address);

    // pairInstance = new UniswapV2Pair__factory(owner).attach(pairAddress);
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
    value = ethers.utils.parseEther("100");

    await router
      .connect(owner)
      .addLiquidityETH(
        quick.address,
        expandTo18Decimals(100),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );
      value = ethers.utils.parseEther("1");

    await router
      .connect(owner)
      .addLiquidityETH(
        IXT.address,
        expandTo18Decimals(500),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    contract = new StakingRewards__factory(owner);
    stakingRewards = await contract.deploy(
      owner.address,
      IXT.address,
      quick.address
    );
    await IXT.mint(stakingRewards.address, expandTo18Decimals(10000));
    await stakingRewards.notifyRewardAmount(expandTo18Decimals(10000), 500);

    singleTokenDeposit = await new SingleTokenDeposit__factory(owner).deploy(
      autocompound.address,
      staking.address,
      WETH.address,
      quick.address,
      IXT.address,
      stakingRewards.address,
      router.address,
      expandTo18Decimals(1),
      owner.address,
      treasury.address
    );
    await autocompound.setOperator(singleTokenDeposit.address, true);
    await singleTokenDeposit.mintAutocompoundTokens();
  });

  describe("Deposit  Quick", async () => {
    it("Deposit", async () => {
      await quick.approve(singleTokenDeposit.address, expandTo18Decimals(100));
      await singleTokenDeposit.deposit(expandTo18Decimals(100));
      const reciptTokens = await singleTokenDeposit.balanceOf(owner.address);
      expect(reciptTokens).to.be.eq(expandTo18Decimals(100));
      expect(await singleTokenDeposit.totalDeposits()).to.be.eq(
        expandTo18Decimals(100)
      );
      expect(
        (await singleTokenDeposit.userInfo(owner.address)).amount
      ).to.be.eq(expandTo18Decimals(100));
    });
    it("Reinvest and Withdraw", async () => {
      await expect(
        singleTokenDeposit.connect(user1).reinvestOps()
      ).to.be.revertedWith("QuickSwapStrategy::onlyOps: onlyOps");
      for (let i = 1; i <= 3; i++) {
        await quick.transfer(
          signers[i + 1].address,
          expandTo18Decimals(i * 100)
        );
        await quick
          .connect(signers[i + 1])
          .approve(singleTokenDeposit.address, expandTo18Decimals(i * 100));
        await singleTokenDeposit
          .connect(signers[i + 1])
          .deposit(expandTo18Decimals(i * 100));
        await mineBlocks(ethers.provider, 11);
        await singleTokenDeposit.reinvestOps();
      }
      let reciptTokens1: any = await singleTokenDeposit.balanceOf(
        user1.address
      );
      reciptTokens1 = reciptTokens1.toString();
      await expect(
        singleTokenDeposit.connect(user1).withdraw("0")
      ).to.be.revertedWith(
        "SingleTokenDeposit::_withdraw: withdraw amount can,t be zero"
      );
      await expect(
        singleTokenDeposit.connect(user1).withdraw(expandTo18Decimals(101))
      ).to.be.revertedWith(
        "SingleTokenDeposit::_withdraw: Can't withdraw this much amount"
      );
      await singleTokenDeposit.connect(user1).withdraw(reciptTokens1);
      let reciptTokens2: any = await singleTokenDeposit.balanceOf(
        user2.address
      );
      reciptTokens2 = reciptTokens2.toString();
      await singleTokenDeposit.connect(user2).withdraw(reciptTokens2);
      let reciptTokens3: any = await singleTokenDeposit.balanceOf(
        user3.address
      );
      reciptTokens3 = reciptTokens3.toString();
      await singleTokenDeposit.connect(user3).withdraw(reciptTokens3);
      const incresedQuick1 = await quick.balanceOf(user1.address);
      const incresedQuick2 = await quick.balanceOf(user2.address);
      const incresedQuick3 = await quick.balanceOf(user3.address);

      expect(incresedQuick1).to.be.above(expandTo18Decimals(100));
      expect(incresedQuick2).to.be.above(expandTo18Decimals(200));
      expect(incresedQuick3).to.be.above(expandTo18Decimals(300));
    });
    it("Revoke Allownace", async () => {
      let allowance = await quick.allowance(
        singleTokenDeposit.address,
        stakingRewards.address
      );
      expect(allowance).to.be.above("0");
      await singleTokenDeposit.revokeAllowance(
        quick.address,
        stakingRewards.address
      );
      allowance = await quick.allowance(
        singleTokenDeposit.address,
        stakingRewards.address
      );
      expect(allowance).to.be.eq("0");
    });
    it("Set Allownace", async () => {
      await expect(
        singleTokenDeposit
          .connect(user1)
          .revokeAllowance(quick.address, stakingRewards.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      let allowance = await quick.allowance(
        singleTokenDeposit.address,
        stakingRewards.address
      );
      expect(allowance).to.be.above("0");
      await singleTokenDeposit.revokeAllowance(
        quick.address,
        stakingRewards.address
      );
      allowance = await quick.allowance(
        singleTokenDeposit.address,
        stakingRewards.address
      );
      expect(allowance).to.be.eq("0");
      await singleTokenDeposit.setAllowances();
      allowance = await quick.allowance(
        singleTokenDeposit.address,
        stakingRewards.address
      );
      expect(allowance).to.be.above("0");
    });
    it("Udate Admin Fees", async () => {
      await expect(
        singleTokenDeposit.updateAdminFee("9501")
      ).to.be.revertedWith(
        "QuickSwapStrategy::updateAdminFee: admin fee too high"
      );
      await singleTokenDeposit.updateAdminFee(30);
      const updatedFee = await singleTokenDeposit.ADMIN_FEE_BIPS();
      expect(updatedFee).to.be.eq(30);
    });
    it("Update reinvest before deposit", async () => {
      await singleTokenDeposit.updateRequireReinvestBeforeDeposit();
      const param = await singleTokenDeposit.REQUIRE_REINVEST_BEFORE_DEPOSIT();
      expect(param).to.be.eq(true);
    });
    it("Update reinvest reward", async () => {
      await expect(
        singleTokenDeposit.updateReinvestReward("9501")
      ).to.be.revertedWith(
        "QuickSwapStrategy::updateReinvestReward : reinvest reward too high"
      );
      await singleTokenDeposit.updateReinvestReward("501");
      const param = await singleTokenDeposit.REINVEST_REWARD_BIPS();
      expect(param).to.be.eq("501");
    });
    it("Recover ERC20", async () => {
      expect(await quick.balanceOf(singleTokenDeposit.address)).to.be.eq("0");
      await quick.transfer(singleTokenDeposit.address, expandTo18Decimals(100));
      expect(await quick.balanceOf(singleTokenDeposit.address)).to.be.eq(
        expandTo18Decimals(100)
      );
      let prevBalance = await quick.balanceOf(owner.address);
      await singleTokenDeposit.recoverERC20(
        quick.address,
        expandTo18Decimals(10)
      );
      expect(await quick.balanceOf(owner.address)).to.be.above(prevBalance);

      expect(await IXT.balanceOf(singleTokenDeposit.address)).to.be.eq("0");
      await IXT.transfer(singleTokenDeposit.address, expandTo18Decimals(100));
      expect(await IXT.balanceOf(singleTokenDeposit.address)).to.be.eq(
        expandTo18Decimals(100)
      );
      prevBalance = await IXT.balanceOf(owner.address);
      await singleTokenDeposit.recoverERC20(
        IXT.address,
        expandTo18Decimals(10)
      );
      expect(await IXT.balanceOf(owner.address)).to.be.above(prevBalance);
    });
    it("Update Multiplier", async () => {
      await singleTokenDeposit.updateMultiplier(50);
      expect(await singleTokenDeposit.BONUS_MULTIPLIER()).to.be.eq(50);
    });
    it("Update Autocompound per block", async () => {
      await singleTokenDeposit.updateAutoCompoundTokenPerBlock(
        expandTo18Decimals(50)
      );
      expect(await singleTokenDeposit.autoCompoundTokenPerBlock()).to.be.eq(
        expandTo18Decimals(50)
      );
    });
    it("Recover Native asset", async () => {
      expect(
        await ethers.provider.getBalance(singleTokenDeposit.address)
      ).to.be.eq("0");
      let tx = {
        to: singleTokenDeposit.address,
        value: ethers.utils.parseEther("10"),
      };
      await owner.sendTransaction(tx);
      expect(
        await ethers.provider.getBalance(singleTokenDeposit.address)
      ).to.be.eq(expandTo18Decimals(10));
      const prevBalance = await ethers.provider.getBalance(owner.address);
      await singleTokenDeposit.recoverNativeAsset(expandTo18Decimals(10));
      expect(await ethers.provider.getBalance(owner.address)).to.be.above(
        prevBalance
      );
    });
    it("Exit", async () => {
      const balanceBeforeQuick = await quick.balanceOf(
        singleTokenDeposit.address
      );
      const balanceBeforeITX = await IXT.balanceOf(singleTokenDeposit.address);

      expect(balanceBeforeQuick).to.be.eq("0");

      expect(balanceBeforeITX).to.be.eq("0");

      await quick.transfer(user1.address, expandTo18Decimals(200));

      await quick
        .connect(user1)
        .approve(singleTokenDeposit.address, expandTo18Decimals(200));

      await singleTokenDeposit.connect(user1).deposit(expandTo18Decimals(100));

      await mineBlocks(ethers.provider, 100);

      await singleTokenDeposit.emergencyWithdraw();

      expect(await quick.balanceOf(singleTokenDeposit.address)).to.be.above(
        balanceBeforeQuick
      );

      expect(await IXT.balanceOf(singleTokenDeposit.address)).to.be.above(
        balanceBeforeITX
      );

      const ownerQuickBalance = await quick.balanceOf(owner.address);
      const ownerIXTBalance = await IXT.balanceOf(owner.address);

      await singleTokenDeposit.recoverERC20(IXT.address, expandTo18Decimals(1));
      await singleTokenDeposit.recoverERC20(
        quick.address,
        expandTo18Decimals(1)
      );

      const ownerQuickBalanceAfterExit = await quick.balanceOf(owner.address);
      const ownerIXTBalanceAfterExit = await IXT.balanceOf(owner.address);

      expect(ownerQuickBalanceAfterExit).to.be.above(ownerQuickBalance);

      expect(ownerIXTBalanceAfterExit).to.be.above(ownerIXTBalance);
    });
    it("Estimate reinvest rewards", async () => {
      await quick.approve(singleTokenDeposit.address, expandTo18Decimals(100));
      await singleTokenDeposit.deposit(expandTo18Decimals(100));
      const reciptTokens = await singleTokenDeposit.balanceOf(owner.address);
      expect(reciptTokens).to.be.eq(expandTo18Decimals(100));
      expect(await singleTokenDeposit.totalDeposits()).to.be.eq(
        expandTo18Decimals(100)
      );
      expect(
        (await singleTokenDeposit.userInfo(owner.address)).amount
      ).to.be.eq(expandTo18Decimals(100));
      await mineBlocks(ethers.provider, 1000);
      const reinvestRewards = await singleTokenDeposit.estimateReinvestReward();
      expect(await autocompound.balanceOf(staking.address)).to.be.eq("0");
      expect(await IXT.balanceOf(user4.address)).to.be.eq("0");

      await expect(
        singleTokenDeposit.connect(user1).reinvestOps()
      ).to.be.revertedWith("QuickSwapStrategy::onlyOps: onlyOps");

      await singleTokenDeposit.connect(user4).reinvest();
      expect(await autocompound.balanceOf(staking.address)).to.be.above("0");
      expect(await IXT.balanceOf(user4.address)).to.be.eq(reinvestRewards);
    });
  });
});
