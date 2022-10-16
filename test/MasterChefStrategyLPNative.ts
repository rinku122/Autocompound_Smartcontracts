const { expect } = require("chai");
const { ethers } = require("hardhat");
import {
  MasterChefStrategyLPNative,
  MasterChefStrategyLPNative__factory,
  CakeToken,
  CakeToken__factory,
  ERC20,
  ERC20__factory,
  MasterChef,
  MasterChef__factory,
  WETH9,
  WETH9__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  UniswapV2Pair__factory,
  UniswapV2Pair,
  UniswapV2Factory__factory,
  UniswapV2Factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const users = [
  "0xA1Ab2C87f842F864458464a34f66C76BdD7d4d6a",
  "0xF977814e90dA44bFA03b6295A0616a897441aceC", //USDT holder and BNB Holder
  "0xde70aaaCE9501eB8a556a95ff2F8eA1D01D582FD",
  "0x8fbeacAC7951810CFb55Fe6c67763F6eE433fd2f",
  "0xF04914aab2e50D4cB9e943819fae25b9527C7b2D",
  "0x9Feb35F16F757e2d6f7156e7Cb7d3858987B48c3", //5 Reinvest
  "0x2C8171183F8D9B3291876093d1535cf4a10f984D", //6 Treasury
];

const WETHAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const CakeAddress = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
const USDTAddress = "0x55d398326f99059ff775485246999027b3197955";
const MasterChefAddress = "0xa5f8c5dbd5f286960b9d90548680ae5ebff07652";
const pairAddress = "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE";
const factoryAddress = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const PID = "13";
import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";

describe("Deposit cake", () => {
  let user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;
  let user6: SignerWithAddress;
  let user7: SignerWithAddress;
  let owner: SignerWithAddress;
  let contract: any;
  let masterChef: MasterChef;
  let cake: CakeToken;
  let strategy: MasterChefStrategyLPNative;
  let weth: WETH9;
  let router: UniswapV2Router02;
  let USDT: ERC20;
  let pairInstance: UniswapV2Pair;
  let signers: SignerWithAddress[];
  let factory: UniswapV2Factory;
  let token0: any;
  let token1: any;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    for (let i = 0; i < users.length; i++) {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [users[i]],
      });
    }
    owner = await ethers.getSigner(users[0]);
    user1 = await ethers.getSigner(users[1]);
    user2 = await ethers.getSigner(users[2]);
    user3 = await ethers.getSigner(users[3]);
    user4 = await ethers.getSigner(users[4]);
    user5 = await ethers.getSigner(users[5]);
    user6 = await ethers.getSigner(users[6]);
    user7 = await ethers.getSigner(users[7]);

    contract = new MasterChef__factory(owner);
    masterChef = await contract.attach(MasterChefAddress);
    contract = new CakeToken__factory(owner);
    cake = await contract.attach(CakeAddress);
    contract = new UniswapV2Router02__factory(owner);
    router = await contract.attach(RouterAddress);
    contract = new WETH9__factory(owner);
    weth = await contract.attach(WETHAddress);
    contract = new ERC20__factory(owner);
    USDT = await contract.attach(USDTAddress);
    contract = new UniswapV2Factory__factory(owner);
    factory = await contract.attach(factoryAddress);
    contract = new MasterChefStrategyLPNative__factory(owner);

    strategy = await contract.deploy(
      weth.address,
      pairAddress,
      cake.address,
      masterChef.address,
      router.address,
      PID,
      user5.address,
      user6.address
    );
    contract = new UniswapV2Pair__factory(owner);
    pairInstance = await contract.attach(pairAddress);
    await USDT.connect(user1).transfer(
      owner.address,
      expandTo18Decimals(50000)
    );
    let tx = {
      to: owner.address,
      value: expandTo18Decimals(1000),
    };

    await user1.sendTransaction(tx);

    expect(await USDT.balanceOf(owner.address)).to.be.eq(
      expandTo18Decimals(50000)
    );
    expect(await ethers.provider.getBalance(owner.address)).to.be.above(
      expandTo18Decimals(1000)
    );
    //20000 USDT and BNB 600 left with owner
    await USDT.approve(router.address, expandTo18Decimals(30000));
    let value: any = ethers.utils.parseEther("400");

    await router.addLiquidityETH(
      USDT.address,
      expandTo18Decimals(30000),
      expandTo18Decimals(1),
      expandTo18Decimals(1),
      owner.address,
      1671095109,
      { value }
    );
    for (let i = 2; i <= 5; i++) {
      let tx = {
        to: users[i],
        value: expandTo18Decimals(5),
      };
      await owner.sendTransaction(tx);
    }
    token0 = await pairInstance.token0();
    token1 = await pairInstance.token1();
    token0 = new UniswapV2Pair__factory(owner).attach(token0);
    token1 = new UniswapV2Pair__factory(owner).attach(token1);
  });

  it("Deposit", async () => {
    await pairInstance
      .connect(owner)
      .approve(strategy.address, expandTo18Decimals(10));

    let reciptTokens = await strategy.balanceOf(owner.address);
    expect(reciptTokens).to.be.eq("0");
    await strategy.connect(owner).deposit(expandTo18Decimals(10));
    reciptTokens = await strategy.balanceOf(owner.address);

    expect(reciptTokens).to.be.eq(expandTo18Decimals(10));
  });
  it("Reinvest and Withdraw", async () => {
    await expect(strategy.connect(user1).reinvestOps()).to.be.revertedWith(
      "MasterChefStrategy::onlyOps: onlyOps"
    );
    const beforeQuick1 = await pairInstance.balanceOf(user2.address);
    const beforeQuick2 = await pairInstance.balanceOf(user3.address);
    const beforeQuick3 = await pairInstance.balanceOf(user4.address);
    let user;
    for (let i = 2; i <= 4; i++) {
      user = await ethers.getSigner(users[i]);
      let value = expandTo18Decimals(i * 100);
      await pairInstance.transfer(user.address, value);
      await pairInstance.connect(user).approve(strategy.address, value);
      await strategy.connect(user).deposit(value);
      await mineBlocks(ethers.provider, 11);
      const totalDepositBeforeReinvest = await strategy.totalDeposits();
      await strategy.connect(user5).reinvestOps();
      const totalDepositAfterReinvest = await strategy.totalDeposits();
      expect(totalDepositAfterReinvest).to.be.above(totalDepositBeforeReinvest);
    }
    let reciptTokens2: any = await strategy.balanceOf(user2.address);
    reciptTokens2 = reciptTokens2.toString();
    await expect(strategy.connect(user2).withdraw("0")).to.be.revertedWith(
      "MasterChefStrategyLPNative::_withdraw: withdraw amount can,t be zero"
    );

    await expect(
      strategy.connect(user2).withdraw(expandTo18Decimals(201))
    ).to.be.revertedWith(
      "MasterChefStrategy::_burn: burn amount exceeds from balance"
    );

    await strategy.connect(user2).withdraw(reciptTokens2);
    let reciptTokens3: any = await strategy.balanceOf(user3.address);
    reciptTokens3 = reciptTokens3.toString();
    await strategy.connect(user3).withdraw(reciptTokens3);
    let reciptTokens4: any = await strategy.balanceOf(user4.address);
    reciptTokens4 = reciptTokens4.toString();
    await strategy.connect(user4).withdraw(reciptTokens4);
    const incresedQuick1 = await pairInstance.balanceOf(user2.address);
    const incresedQuick2 = await pairInstance.balanceOf(user3.address);
    const incresedQuick3 = await pairInstance.balanceOf(user4.address);
    expect(incresedQuick1).to.be.above(beforeQuick1);
    expect(incresedQuick2).to.be.above(beforeQuick2);
    expect(incresedQuick3).to.be.above(beforeQuick3);
  });
  it("Deposit single token", async () => {
    await token0.transfer(user2.address, expandTo18Decimals(100));
    await token0
      .connect(user2)
      .approve(strategy.address, expandTo18Decimals(100));
    await expect(
      strategy
        .connect(user2)
        .singleTokenDeposit(expandTo18Decimals(0), token0.address, 1)
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::singleTokenDeposit: Insufficient tokens to deposit"
    );
    await expect(
      strategy
        .connect(user2)
        .singleTokenDeposit(expandTo18Decimals(10), token0.address, 0)
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::singleTokenDeposit: Invalid slippage"
    );
    await expect(
      strategy
        .connect(user2)
        .singleTokenDeposit(expandTo18Decimals(10), token0.address, 501)
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::singleTokenDeposit: Invalid slippage"
    );
    await expect(
      strategy
        .connect(user2)
        .singleTokenDeposit(
          expandTo18Decimals(10),
          "0x2C8171183F8D9B3291876093d1535cf4a10f984D",
          1
        )
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::singleTokenDeposit: Invalid token address"
    );
    const reciptTokensBefore = await strategy.balanceOf(user2.address);
    expect(reciptTokensBefore).to.be.eq("0");
    await strategy
      .connect(user2)
      .singleTokenDeposit(expandTo18Decimals(100), token0.address, 1);
    const reciptTokensAfter = await strategy.balanceOf(user2.address);
    expect(reciptTokensAfter).to.be.above(reciptTokensBefore);

    await expect(
      strategy
        .connect(user2)
        .singleTokenDeposit(expandTo18Decimals(0), token1.address, 1)
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::singleTokenDeposit: Insufficient investment"
    );
  });
  it("Deposit dual tokens", async () => {
    await token0.transfer(user2.address, expandTo18Decimals(200));
    await token0
      .connect(user2)
      .approve(strategy.address, expandTo18Decimals(200));

    await expect(
      strategy.connect(user2).dualTokenDeposit(expandTo18Decimals(0), 1)
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::dualTokenDeposit: Can not deposit zero amount"
    );
    await expect(
      strategy.connect(user2).dualTokenDeposit(expandTo18Decimals(1), 1)
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::dualTokenDeposit: Can not deposit zero amount"
    );
    await expect(
      strategy.connect(user2).dualTokenDeposit(expandTo18Decimals(0), 1, {
        value: expandTo18Decimals(1),
      })
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::dualTokenDeposit: Can not deposit zero amount"
    );

    await expect(
      strategy.connect(user2).dualTokenDeposit(expandTo18Decimals(200), 0, {
        value: expandTo18Decimals(1),
      })
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::dualTokenDeposit: Invalid slippage"
    );

    await expect(
      strategy.connect(user2).dualTokenDeposit(expandTo18Decimals(200), 501, {
        value: expandTo18Decimals(1),
      })
    ).to.be.revertedWith(
      "MasterChefStrategyLPNative::dualTokenDeposit: Invalid slippage"
    );

    const reciptTokensBefore = await strategy.balanceOf(user2.address);
    expect(reciptTokensBefore).to.be.eq("0");
    await strategy.connect(user2).dualTokenDeposit(expandTo18Decimals(200), 1, {
      value: expandTo18Decimals(1),
    });
    expect(await strategy.balanceOf(user2.address)).to.be.above(
      reciptTokensBefore
    );
  });
  it("Single Withdraw", async () => {
    let user;
    for (let i = 2; i <= 4; i++) {
      user = await ethers.getSigner(users[i]);
      await token0.transfer(user.address, expandTo18Decimals(i * 100));
      await token0
        .connect(user)
        .approve(strategy.address, expandTo18Decimals(i * 100));
      await strategy
        .connect(user)
        .dualTokenDeposit(expandTo18Decimals(i * 100), 1, {
          value: expandTo18Decimals(1),
        });
      await mineBlocks(ethers.provider, 150);
      await strategy.connect(user5).reinvestOps();
      const reciptTokens = await strategy.balanceOf(user.address);
      await strategy.connect(user).singleWithdraw(reciptTokens, token0.address);
    }
    const user1token0AfterWithdraw = await token0.balanceOf(user2.address);

    const user2token0AfterWithdraw = await token0.balanceOf(user3.address);

    const user3token0AfterWithdraw = await token0.balanceOf(user4.address);

    expect(user1token0AfterWithdraw).to.be.above(expandTo18Decimals(200));
    expect(user2token0AfterWithdraw).to.be.above(expandTo18Decimals(300));
    expect(user3token0AfterWithdraw).to.be.above(expandTo18Decimals(400));
  });
  it("Revoke Allownace", async () => {
    let allowance = await pairInstance.allowance(
      strategy.address,
      masterChef.address
    );
    expect(allowance).to.be.above("0");
    await strategy
      .connect(owner)
      .revokeAllowance(pairInstance.address, masterChef.address);
    allowance = await pairInstance.allowance(
      strategy.address,
      masterChef.address
    );
    expect(allowance).to.be.eq("0");
  });
  it("Set Allownace", async () => {
    await expect(
      strategy.connect(user1).revokeAllowance(cake.address, masterChef.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    let allowance = await pairInstance.allowance(
      strategy.address,
      masterChef.address
    );
    expect(allowance).to.be.above("0");
    await strategy
      .connect(owner)
      .revokeAllowance(pairInstance.address, masterChef.address);
    allowance = await pairInstance.allowance(
      strategy.address,
      masterChef.address
    );
    expect(allowance).to.be.eq("0");
    await strategy.setAllowances();
    allowance = await pairInstance.allowance(
      strategy.address,
      masterChef.address
    );
    expect(allowance).to.be.above("0");
  });
  it("Udate Admin Fees", async () => {
    await expect(
      strategy.connect(owner).updateAdminFee("9701")
    ).to.be.revertedWith(
      "MasterChefStrategy::updateAdminFee: admin fee too high"
    );
    await strategy.connect(owner).updateAdminFee(9700);
    const updatedFee = await strategy.ADMIN_FEE_BIPS();
    expect(updatedFee).to.be.eq(9700);
  });
  it("Update reinvest before deposit", async () => {
    await strategy.updateRequireReinvestBeforeDeposit();
    const param = await strategy.REQUIRE_REINVEST_BEFORE_DEPOSIT();
    expect(param).to.be.eq(true);
  });
  it("Update reinvest reward", async () => {
    await expect(strategy.updateReinvestReward("9501")).to.be.revertedWith(
      "MasterChefStrategy::updateReinvestReward: reinvest reward too high"
    );
    await strategy.updateReinvestReward("9500");
    const param = await strategy.REINVEST_REWARD_BIPS();
    expect(param).to.be.eq("9500");
  });
  it("Recover ERC20", async () => {
    const balance = await pairInstance.balanceOf(owner.address);
    expect(await pairInstance.balanceOf(strategy.address)).to.be.eq("0");
    await pairInstance
      .connect(owner)
      .transfer(strategy.address, expandTo18Decimals(100));
    expect(await pairInstance.balanceOf(strategy.address)).to.be.eq(
      expandTo18Decimals(100)
    );
    await strategy
      .connect(owner)
      .recoverERC20(pairInstance.address, expandTo18Decimals(100));
    expect(await pairInstance.balanceOf(owner.address)).to.be.eq(balance);
    expect(await token0.balanceOf(strategy.address)).to.be.eq("0");
    let prevBalance = await token0.balanceOf(owner.address);

    await token0
      .connect(owner)
      .transfer(strategy.address, expandTo18Decimals(100));
    expect(await token0.balanceOf(strategy.address)).to.be.eq(
      expandTo18Decimals(100)
    );
    await strategy.recoverERC20(token0.address, expandTo18Decimals(100));
    expect(await token0.balanceOf(owner.address)).to.be.eq(prevBalance);
  });
  it("Recover Native asset", async () => {
    const prevBalance = await ethers.provider.getBalance(owner.address);
    expect(await ethers.provider.getBalance(strategy.address)).to.be.eq("0");
    let tx = {
      to: strategy.address,
      value: expandTo18Decimals(2),
    };

    await user1.sendTransaction(tx);

    expect(await ethers.provider.getBalance(strategy.address)).to.be.eq(
      expandTo18Decimals(2)
    );

    await strategy.recoverNativeAsset(expandTo18Decimals(2));
    expect(await ethers.provider.getBalance(owner.address)).to.be.above(
      prevBalance
    );
  });
  it("Exit", async () => {
    const balanceBeforeQuick = await pairInstance.balanceOf(strategy.address);

    expect(balanceBeforeQuick).to.be.eq("0");

    await pairInstance
      .connect(owner)
      .approve(strategy.address, expandTo18Decimals(100));

    await strategy.connect(owner).deposit(expandTo18Decimals(100));

    await mineBlocks(ethers.provider, 100);

    await strategy.emergencyWithdraw();

    expect(await pairInstance.balanceOf(strategy.address)).to.be.eq(
      expandTo18Decimals(100)
    );

    const balance = await pairInstance.balanceOf(owner.address);
    await strategy
      .connect(owner)
      .recoverERC20(pairAddress, expandTo18Decimals(100));

    expect(await pairInstance.balanceOf(owner.address)).to.be.above(balance);
  });
  it("Estimate reinvest rewards", async () => {
    await pairInstance
      .connect(owner)
      .approve(strategy.address, expandTo18Decimals(100));
    await strategy.connect(owner).deposit(expandTo18Decimals(100));
    const reciptTokens = await strategy.balanceOf(owner.address);
    expect(reciptTokens).to.be.eq(expandTo18Decimals(100));
    expect(await strategy.totalDeposits()).to.be.eq(expandTo18Decimals(100));
    let blockNumber = await ethers.provider.getBlockNumber();
    await mineBlocks(ethers.provider, 1);
    blockNumber = await ethers.provider.getBlockNumber();
    const reinvestRewards = await strategy.estimateReinvestReward();

    expect(await cake.balanceOf(user5.address)).to.be.eq("0");

    await expect(strategy.connect(user1).reinvestOps()).to.be.revertedWith(
      "MasterChefStrategy::onlyOps: onlyOps"
    );
    blockNumber = await ethers.provider.getBlockNumber();
    const treasuryBalanceBeforeReinvest = await cake.balanceOf(user6.address);
    await strategy.connect(user5).reinvest();

    expect(await cake.balanceOf(user5.address)).to.be.above(reinvestRewards);
    expect(await cake.balanceOf(user6.address)).to.be.above(
      treasuryBalanceBeforeReinvest
    );
  });
});
