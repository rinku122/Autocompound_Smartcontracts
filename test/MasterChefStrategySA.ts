const { expect } = require("chai");
const { ethers } = require("hardhat");

const users = [
  "0xA1Ab2C87f842F864458464a34f66C76BdD7d4d6a",
  "0x341D32942e483e1E9E7B76b6f8375a3f5efE1BF8",
  "0xB428523cddA53640a62e9f26c2D8613a9159B282",
  "0xD6216fC19DB775Df9774a6E33526131dA7D19a2c",
  "0x668fB01577BC95a8e84E4d5162fAc8B879205D1E",
  "0xCB1A65Bf87C681B6663540Ff289FeCbBaB1bAEfd",
  "0xe5566dee155fDA28C666a03480B5cDf4ece7a6cb",
  "0xde70aaaCE9501eB8a556a95ff2F8eA1D01D582FD",
];

const WETHAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const CakeAddress = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
const ChainTokenAddress = "0x7324c7C0d95CEBC73eEa7E85CbAac0dBdf88a05b";
const smartChefAddress = "0xa79D37ce9DF9443eF4B6DEC2e38a8ecd35303adc";

import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";
import {
  SmartChefInitializable__factory,
  SmartChefInitializable,
  CakeToken,
  CakeToken__factory,
  ERC20,
  ERC20__factory,
  SmartChefInitializableStartegySA,
  SmartChefInitializableStartegySA__factory,
  WETH9,
  WETH9__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

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
  let smartChef: SmartChefInitializable;
  let cake: CakeToken;
  let chain: ERC20;
  let strategy: SmartChefInitializableStartegySA;
  let weth: WETH9;
  let router: UniswapV2Router02;

  let signers: SignerWithAddress[];

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

    contract = new SmartChefInitializable__factory(owner);
    smartChef = await contract.attach(smartChefAddress);
    contract = new CakeToken__factory(owner);
    cake = await contract.attach(CakeAddress);
    contract = new ERC20__factory(owner);
    chain = await contract.attach(ChainTokenAddress);
    contract = new UniswapV2Router02__factory(owner);
    router = await contract.attach(RouterAddress);
    contract = new WETH9__factory(owner);
    weth = contract.attach(WETHAddress);
    contract = new SmartChefInitializableStartegySA__factory(owner);

    strategy = await contract.deploy(
      weth.address,
      cake.address,
      chain.address,
      smartChef.address,
      router.address,
      user5.address,
      user6.address
    );
  });

  it("Deposit", async () => {
    await cake
      .connect(user1)
      .approve(strategy.address, expandTo18Decimals(100));

    let reciptTokens = await strategy.balanceOf(user1.address);
    expect(reciptTokens).to.be.eq("0");
    await strategy.connect(user1).deposit(expandTo18Decimals(10));
    reciptTokens = await strategy.balanceOf(user1.address);

    expect(reciptTokens).to.be.eq(expandTo18Decimals(10));
  });
  it("Reinvest and Withdraw", async () => {
    await expect(strategy.connect(user1).reinvestOps()).to.be.revertedWith(
      "SmartChefInitializableStartegy::onlyOps: onlyOps"
    );
    const beforeQuick1 = await cake.balanceOf(user1.address);
    const beforeQuick2 = await cake.balanceOf(user2.address);
    const beforeQuick3 = await cake.balanceOf(user3.address);
    let user;
    for (let i = 1; i <= 3; i++) {
      user = await ethers.getSigner(users[i]);
      let value = expandTo18Decimals(i * 100);
      await cake.connect(user).approve(strategy.address, value);
      await strategy.connect(user).deposit(value);
      await mineBlocks(ethers.provider, 11);
      const totalDepositBeforeReinvest = await strategy.totalDeposits();
      await strategy.connect(user5).reinvestOps();
      const totalDepositAfterReinvest = await strategy.totalDeposits();
      expect(totalDepositAfterReinvest).to.be.above(totalDepositBeforeReinvest);
    }
    let reciptTokens1: any = await strategy.balanceOf(user1.address);
    reciptTokens1 = reciptTokens1.toString();
    await expect(strategy.connect(user1).withdraw("0")).to.be.revertedWith(
      "SmartChefInitializableStartegy::_withdraw: withdraw amount can,t be zero"
    );

    await expect(
      strategy.connect(user1).withdraw(expandTo18Decimals(101))
    ).to.be.revertedWith(
      "SmartChefInitializableStartegy::_burn: burn amount exceeds from balance"
    );

    await strategy.connect(user1).withdraw(reciptTokens1);
    let reciptTokens2: any = await strategy.balanceOf(user2.address);
    reciptTokens2 = reciptTokens2.toString();
    await strategy.connect(user2).withdraw(reciptTokens2);
    let reciptTokens3: any = await strategy.balanceOf(user3.address);
    reciptTokens3 = reciptTokens3.toString();
    await strategy.connect(user3).withdraw(reciptTokens3);
    const incresedQuick1 = await cake.balanceOf(user1.address);
    const incresedQuick2 = await cake.balanceOf(user2.address);
    const incresedQuick3 = await cake.balanceOf(user3.address);
    expect(incresedQuick1).to.be.above(beforeQuick1);
    expect(incresedQuick2).to.be.above(beforeQuick2);
    expect(incresedQuick3).to.be.above(beforeQuick3);
    const balance = (await chain.balanceOf(user6.address)).toString();
    await chain.connect(user6).transfer(user7.address, balance);
  });
  it("Revoke Allownace", async () => {
    let allowance = await cake.allowance(strategy.address, smartChef.address);
    expect(allowance).to.be.above("0");
    await strategy
      .connect(owner)
      .revokeAllowance(cake.address, smartChef.address);
    allowance = await cake.allowance(strategy.address, smartChef.address);
    expect(allowance).to.be.eq("0");
  });
  it("Set Allownace", async () => {
    await expect(
      strategy.connect(user1).revokeAllowance(cake.address, smartChef.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    let allowance = await cake.allowance(strategy.address, smartChef.address);
    expect(allowance).to.be.above("0");
    await strategy
      .connect(owner)
      .revokeAllowance(cake.address, smartChef.address);
    allowance = await cake.allowance(strategy.address, smartChef.address);
    expect(allowance).to.be.eq("0");
    await strategy.setAllowances();
    allowance = await cake.allowance(strategy.address, smartChef.address);
    expect(allowance).to.be.above("0");
  });
  it("Udate Admin Fees", async () => {
    await expect(
      strategy.connect(owner).updateAdminFee("9701")
    ).to.be.revertedWith(
      "SmartChefInitializableStartegy::updateAdminFee: admin fee too high"
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
      "SmartChefInitializableStartegy::updateReinvestReward: reinvest reward too high"
    );
    await strategy.updateReinvestReward("9500");
    const param = await strategy.REINVEST_REWARD_BIPS();
    expect(param).to.be.eq("9500");
  });
  it("Recover ERC20", async () => {
    expect(await cake.balanceOf(strategy.address)).to.be.eq("0");
    await cake
      .connect(user1)
      .transfer(strategy.address, expandTo18Decimals(100));
    expect(await cake.balanceOf(strategy.address)).to.be.eq(
      expandTo18Decimals(100)
    );
    let prevBalance = await cake.balanceOf(owner.address);
    await strategy
      .connect(owner)
      .recoverERC20(cake.address, expandTo18Decimals(10));
    expect(await cake.balanceOf(owner.address)).to.be.eq(
      expandTo18Decimals(10)
    );

    expect(await chain.balanceOf(strategy.address)).to.be.eq("0");
    await chain
      .connect(user4)
      .transfer(strategy.address, expandTo18Decimals(100));
    expect(await chain.balanceOf(strategy.address)).to.be.eq(
      expandTo18Decimals(100)
    );
    prevBalance = await chain.balanceOf(owner.address);
    await strategy.recoverERC20(chain.address, expandTo18Decimals(10));
    expect(await chain.balanceOf(owner.address)).to.be.eq(
      expandTo18Decimals(10)
    );
    await cake.connect(owner).approve(strategy.address, expandTo18Decimals(10));
    await strategy.connect(owner).deposit(expandTo18Decimals(10));
  });
  it("Recover Native asset", async () => {
    expect(await ethers.provider.getBalance(strategy.address)).to.be.eq("0");
    let tx = {
      to: strategy.address,
      value: "10000000000000000",
    };
    await owner.sendTransaction(tx);
    expect(await ethers.provider.getBalance(strategy.address)).to.be.eq(
      "10000000000000000"
    );
    const prevBalance = await ethers.provider.getBalance(owner.address);
    await strategy.recoverNativeAsset("10000000000000000");
    expect(await ethers.provider.getBalance(owner.address)).to.be.above(
      prevBalance
    );
  });
  it("Exit", async () => {
    const balanceBeforeQuick = await cake.balanceOf(strategy.address);
    const balanceBeforeITX = await chain.balanceOf(strategy.address);

    expect(balanceBeforeQuick).to.be.eq("0");

    expect(balanceBeforeITX).to.be.eq("0");

    await cake.connect(user1).transfer(owner.address, expandTo18Decimals(100));

    await cake
      .connect(owner)
      .approve(strategy.address, expandTo18Decimals(100));

    await strategy.connect(owner).deposit(expandTo18Decimals(100));

    expect(await cake.balanceOf(owner.address)).to.be.eq("0");

    await mineBlocks(ethers.provider, 100);

    await strategy.emergencyWithdraw();

    expect(await cake.balanceOf(strategy.address)).to.be.eq(
      expandTo18Decimals(100)
    );

    const ownerCakeBalance = await cake.balanceOf(owner.address);

    await strategy
      .connect(owner)
      .recoverERC20(cake.address, expandTo18Decimals(100));

    const ownerQuickBalanceAfterExit = await cake.balanceOf(owner.address);

    expect(ownerQuickBalanceAfterExit).to.be.eq(expandTo18Decimals(100));
  });
  it("Estimate reinvest rewards", async () => {
    await cake.connect(user1).transfer(owner.address, expandTo18Decimals(100));
    await cake
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

    expect(await chain.balanceOf(user5.address)).to.be.eq("0");

    await expect(strategy.connect(user1).reinvestOps()).to.be.revertedWith(
      "SmartChefInitializableStartegy::onlyOps: onlyOps"
    );
    blockNumber = await ethers.provider.getBlockNumber();
    const treasuryBalanceBeforeReinvest = await chain.balanceOf(user6.address);
    await strategy.connect(user5).reinvest();

    expect(await chain.balanceOf(user5.address)).to.be.above(reinvestRewards);
    expect(await chain.balanceOf(user6.address)).to.be.above(
      treasuryBalanceBeforeReinvest
    );
  });
});
