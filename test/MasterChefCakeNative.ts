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
  MasterChefCakeNative,
  MasterChefCakeNative__factory,
} from "../typechain";

import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";
import { providers } from "ethers";
import { expect } from "chai";

describe("MasterChefCakeNative", async () => {
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
  let masterChefCakeNative: MasterChefCakeNative;
  let autoCoumpound: Autocompound;
  let staking: Staking;

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

    factory = await new UniswapV2Factory__factory(owner).deploy(owner.address);
    WETH = await new WETH9__factory(owner).deploy();
    router = await new UniswapV2Router02__factory(owner).deploy(
      factory.address,
      WETH.address
    );

    BUSD = await new BUSD__factory(owner).deploy("BUSD", "BUSD");
    USDT = await new USDT__factory(owner).deploy("USDT", "USDT");
    cake = await new CakeToken__factory(owner).deploy();
    autoCoumpound = await new Autocompound__factory(owner).deploy();
    syrupBar = await new SyrupBar__factory(owner).deploy(cake.address);
    calHash = await new CalHash__factory(owner).deploy();
    console.log(
      "Call Hash Factory: ",
      (await calHash.getInitHash()).toString()
    );
    console.log("--------------------------------");

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
      .transfer(user1.address, expandTo18Decimals(1200));
    pairInstance
      .connect(owner)
      .transfer(user2.address, expandTo18Decimals(1400));
    pairInstance
      .connect(owner)
      .transfer(user3.address, expandTo18Decimals(1800));
    console.log(
      (await pairInstance.balanceOf(owner.address)).toString(),
      "Balance of lp for owner"
    );

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
      1, //Index h poolinfo array ka in Masterchef
      "10000000000000000"
    );

    await autoCoumpound
      .connect(owner)
      .setOperator(MasterChefStrategyLP.address, true);
    await staking
      .connect(owner)
      .setOperator(MasterChefStrategyLP.address, true);
  });

  describe("Invest LP testpairWithACt", async () => {
    it("Deposit in MasterChef", async () => {
      await cake.transferOwnership(MasterChef.address);
      await syrupBar.transferOwnership(MasterChef.address);
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

      await MasterChefStrategyLP.connect(user1).deposit(
        expandTo18Decimals(600)
      );
      await mineBlocks(ethers.provider, 1200);
      await MasterChefStrategyLP.connect(user1).deposit(
        expandTo18Decimals(600)
      );
      await mineBlocks(ethers.provider, 1200);
      await MasterChefStrategyLP.connect(user2).deposit(
        expandTo18Decimals(1400)
      );
      await mineBlocks(ethers.provider, 200);

      await MasterChefStrategyLP.connect(user3).deposit(
        expandTo18Decimals(1800)
      );

      console.log(
        "Autocompound owner Balance : ",
        await autoCoumpound.balanceOf(owner.address),
        "&& Cake owner balance :",
        await cake.balanceOf(owner.address)
      );

      let bal: any = (await cake.balanceOf(owner.address)).toString();
      await cake.connect(owner).approve(router.address, bal);
      let value: any = ethers.utils.parseEther("135");

      let r: any = await router
        .connect(owner)
        .addLiquidityETH(
          cake.address,
          expandTo18Decimals(7000),
          expandTo18Decimals(1),
          expandTo18Decimals(1),
          owner.address,
          1661664320,
          { value }
        );

      pairAddress = await factory.getPair(cake.address, WETH.address);

      pairInstance = await new UniswapV2Pair__factory(owner).attach(
        pairAddress.toString()
      );
      console.log(
        "LP for cake BUSD",
        await pairInstance.balanceOf(owner.address)
      );
      console.log(
        (await pairInstance.balanceOf(owner.address)).toString(),
        "Balance of lp for owner"
      );
      pairInstance
        .connect(owner)
        .transfer(user4.address, expandTo18Decimals(100));
      pairInstance
        .connect(owner)
        .transfer(user5.address, expandTo18Decimals(200));

      r = await router
        .connect(owner)
        .addLiquidityETH(
          cake.address,
          expandTo18Decimals(52),
          expandTo18Decimals(1),
          expandTo18Decimals(1),
          owner.address,
          1661664320,
          { value }
        );
      console.log(
        "&& Cake owner balance :",
        await cake.balanceOf(owner.address)
      );
      console.log(
        await factory.getPair(WETH.address, cake.address),
        "Pair address for eth and cake"
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

      masterChefCakeNative = await new MasterChefCakeNative__factory(
        owner
      ).deploy(
        WETH.address,
        staking.address,
        autoCoumpound.address,
        pairAddress.toString(),
        cake.address,
        MasterChef.address,
        router.address,
        2,
        "10000000000000000"
      );
      await autoCoumpound
        .connect(owner)
        .setOperator(masterChefCakeNative.address, true);
      await staking
        .connect(owner)
        .setOperator(masterChefCakeNative.address, true);

      await MasterChef.add(500, pairAddress.toString(), true);

      await pairInstance
        .connect(user4)
        .approve(masterChefCakeNative.address, expandTo18Decimals(6000));
      await pairInstance
        .connect(user5)
        .approve(masterChefCakeNative.address, expandTo18Decimals(6000));

      await masterChefCakeNative
        .connect(user4)
        .deposit(expandTo18Decimals(100));
      await masterChefCakeNative
        .connect(user5)
        .deposit(expandTo18Decimals(100));

      await mineBlocks(ethers.provider, 100);
      await masterChefCakeNative.connect(user).reinvest();
      await mineBlocks(ethers.provider, 100);
      await masterChefCakeNative
        .connect(user5)
        .deposit(expandTo18Decimals(100));

      console.log(
        "user4 balance before withdraw",
        await pairInstance.balanceOf(user4.address)
      );
      let yrtBalance = (
        await masterChefCakeNative.balanceOf(user4.address)
      ).toString();
      console.log(yrtBalance, "yrtBalance");
      await masterChefCakeNative.connect(user4).withdraw(yrtBalance);
      console.log(
        "user4 balance after withdraw",
        await pairInstance.balanceOf(user4.address)
      );

      //   Single Deposit

      await cake.transfer(user6.address, expandTo18Decimals(50));
      await cake
        .connect(user6)
        .approve(masterChefCakeNative.address, expandTo18Decimals(50));

      await masterChefCakeNative
        .connect(user6)
        .singleTokenDeposit(expandTo18Decimals(0), WETH.address, 1, {
          value: ethers.utils.parseEther("100"),
        });
      yrtBalance = (
        await masterChefCakeNative.balanceOf(user6.address)
      ).toString();
      console.log(
        await pairInstance.balanceOf(user6.address),
        "User 6 LP before withdraw of single token"
      );
      await masterChefCakeNative.connect(user).reinvest();
      await masterChefCakeNative.connect(user6).withdraw(yrtBalance);
      console.log(
        await pairInstance.balanceOf(user6.address),
        "User 6 LP after withdraw of single token"
      );

      console.log("Dual deposit >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

      // Dual Deposit

      await cake.transfer(user7.address, expandTo18Decimals(50));
      await cake
        .connect(user7)
        .approve(masterChefCakeNative.address, expandTo18Decimals(50));

      await masterChefCakeNative
        .connect(user7)
        .dualTokenDeposit(expandTo18Decimals(50), 1, {
          value: ethers.utils.parseEther("100"),
        });
      yrtBalance = (
        await masterChefCakeNative.balanceOf(user7.address)
      ).toString();
      console.log(
        await pairInstance.balanceOf(user7.address),
        "User 7 LP before withdraw of dual token"
      );
      await masterChefCakeNative.connect(user).reinvest();
      await masterChefCakeNative.connect(user7).withdraw(yrtBalance);
      console.log(
        await pairInstance.balanceOf(user7.address),
        "User 7 LP after withdraw of dual token"
      );

      // Dual Withdraw
      console.log("Dual Withdraw >>>>>>>>>>>>>>>>>>>>>>");

      await cake.transfer(user8.address, expandTo18Decimals(50));
      await cake
        .connect(user8)
        .approve(masterChefCakeNative.address, expandTo18Decimals(50));

      // await masterChefCakeNative
      //   .connect(user8)
      //   .singleTokenDeposit(expandTo18Decimals(0), WETH.address, 1, {
      //     value: ethers.utils.parseEther("100"),
      //   });
      await masterChefCakeNative
        .connect(user8)
        .singleTokenDeposit(expandTo18Decimals(50), cake.address, 1);

      yrtBalance = (
        await masterChefCakeNative.balanceOf(user8.address)
      ).toString();
      await mineBlocks(ethers.provider, 200);
      await masterChefCakeNative.connect(user).reinvest();
      console.log(
        await ethers.provider.getBalance(user8.address),
        "User 8 ETH Balance before"
      );
      console.log(
        await cake.balanceOf(user8.address),
        "User 8 Cake Balance before"
      );
      await masterChefCakeNative.connect(user8).dualWithdraw(yrtBalance);
      console.log(
        await ethers.provider.getBalance(user8.address),
        "User 8 ETH Balance after"
      );
      console.log(
        await cake.balanceOf(user8.address),
        "User 8 Cake Balance after"
      );

      // Single Withdraw
      console.log("Single Withdraw >>>>>>>>>>>>>>>>>>>>>>");

      await cake.transfer(user9.address, expandTo18Decimals(50));
      await cake
        .connect(user9)
        .approve(masterChefCakeNative.address, expandTo18Decimals(50));

      await masterChefCakeNative
        .connect(user9)
        .dualTokenDeposit(expandTo18Decimals(50), 1, {
          value: ethers.utils.parseEther("100"),
        });

      await user9.sendTransaction({
        to: user11.address,
        value: ethers.utils.parseEther("9899"), // Sends exactly 1.0 ether
      });
      yrtBalance = (
        await masterChefCakeNative.balanceOf(user9.address)
      ).toString();
      await mineBlocks(ethers.provider, 200);
      await masterChefCakeNative.connect(user).reinvest();
      console.log(
        await ethers.provider.getBalance(user9.address),
        "User 8 ETH Balance before"
      );
      console.log(
        await cake.balanceOf(user9.address),
        "User 8 Cake Balance before"
      );
      await masterChefCakeNative
        .connect(user9)
        .singleWithdraw(yrtBalance, WETH.address);
      console.log(
        await ethers.provider.getBalance(user9.address),
        "User 8 ETH Balance after"
      );
      console.log(
        await cake.balanceOf(user9.address),
        "User 8 Cake Balance after"
      );
    });
  });
});
