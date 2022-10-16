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
  MasterChefCakeNative,
  MasterChefCakeNative__factory,
  Autocompound,
  Autocompound__factory,
  Staking,
  Staking__factory,
} from "../typechain";

import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";

describe("autocompoundMinting", async () => {
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
  let pairAddress1: String;
  let pairInstance1: UniswapV2Pair;
  let pairAddress2: String;
  let pairInstance2: UniswapV2Pair;
  let cake: CakeToken;
  let syrupBar: SyrupBar;
  let MasterChef: MasterChef;
  let MasterChefStrategyLP: MasterChefStrategyLP;
  let MasterChefCakeNative: MasterChefCakeNative;
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
    user12 = signers[13];
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

    pairAddress1 = await factory.getPair(BUSD.address, USDT.address);
    pairInstance1 = await new UniswapV2Pair__factory(owner).attach(
      pairAddress1.toString()
    );

    MasterChef = await new MasterChef__factory(owner).deploy(
      cake.address,
      syrupBar.address,
      owner.address,
      "40000000000000000000",
      await ethers.provider.getBlockNumber()
    );

    await MasterChef.add(1, pairAddress1.toString(), true);

    staking = await new Staking__factory(owner).deploy(autoCoumpound.address);
    MasterChefStrategyLP = await new MasterChefStrategyLP__factory(
      owner
    ).deploy(
      WETH.address,
      staking.address,
      autoCoumpound.address,
      pairAddress1.toString(),
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
    await cake["mint(address,uint256)"](owner.address, expandTo18Decimals(200));
    await cake.approve(router.address, expandTo18Decimals(100000));
    await cake.transferOwnership(MasterChef.address);
    await syrupBar.transferOwnership(MasterChef.address);
    let r: any = await router
      .connect(owner)
      .addLiquidity(
        cake.address,
        USDT.address,
        expandTo18Decimals(21),
        expandTo18Decimals(100),
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
        expandTo18Decimals(21),
        expandTo18Decimals(100),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );
    let value: any = ethers.utils.parseEther("2");
    r = await router
      .connect(owner)
      .addLiquidityETH(
        cake.address,
        expandTo18Decimals(132),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    pairAddress2 = await factory.getPair(cake.address, WETH.address);
    pairInstance2 = await new UniswapV2Pair__factory(owner).attach(
      pairAddress2.toString()
    );

    MasterChefCakeNative = await new MasterChefCakeNative__factory(
      owner
    ).deploy(
      WETH.address,
      staking.address,
      autoCoumpound.address,
      pairAddress2.toString(),
      cake.address,
      MasterChef.address,
      router.address,
      2, //Index h poolinfo array ka in Masterchef
      "10000000000000000"
    );

    await MasterChef.add(1, pairAddress2.toString(), true);

    await autoCoumpound
      .connect(owner)
      .setOperator(MasterChefCakeNative.address, true);
    await staking
      .connect(owner)
      .setOperator(MasterChefCakeNative.address, true);

    await autoCoumpound["mint(address,uint256)"](
      owner.address,
      expandTo18Decimals(15)
    );
    await autoCoumpound.approve(router.address, expandTo18Decimals(100000));
    value = ethers.utils.parseEther("1");
    r = await router
      .connect(owner)
      .addLiquidityETH(
        autoCoumpound.address,
        expandTo18Decimals(15),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );
  });

  describe("Invest LP in MasterChefStrategyLP && MasterChefCakeNative", async () => {
    it("Deposit in MasterChef", async () => {
      for (let i = 2; i < 30; i++) {
        if (i % 2 == 0) {
          console.log("MasterChefStrategyLP>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
          pairInstance1
            .connect(owner)
            .transfer(signers[i].address, expandTo18Decimals(100));
          await pairInstance1
            .connect(signers[i])
            .approve(MasterChefStrategyLP.address, expandTo18Decimals(100000));
          await MasterChefStrategyLP.connect(signers[i]).deposit(
            expandTo18Decimals(100)
          );

          await mineBlocks(ethers.provider, 100);
          await MasterChefStrategyLP.reinvest();

          const tokenMintedStrategies = (
            await autoCoumpound.tokenMintedStrategies()
          ).toString();
          const MAX_SUPPLY_STRATEGIES = (
            await autoCoumpound.MAX_SUPPLY_STRATEGIES()
          ).toString();
          console.log(
            tokenMintedStrategies,
            "tokenMintedStrategies",
            MAX_SUPPLY_STRATEGIES,
            "MAX_SUPPLY_STRATEGIES"
          );
          await MasterChefStrategyLP.connect(signers[i]).withdraw(`${i + 5}`);
          console.log(
            await autoCoumpound.balanceOf(signers[i].address),
            "balance AC"
          );
          console.log(await MasterChefStrategyLP.userInfo(signers[i].address));
        } else {
          console.log("MasterChefCakeNative>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
          pairInstance2
            .connect(owner)
            .transfer(signers[i].address, expandTo18Decimals(1));
          await pairInstance2
            .connect(signers[i])
            .approve(MasterChefCakeNative.address, expandTo18Decimals(100000));
          await MasterChefCakeNative.connect(signers[i]).deposit(
            expandTo18Decimals(1)
          );
          await mineBlocks(ethers.provider, 100);
          await MasterChefCakeNative.reinvest();

          const tokenMintedStrategies = (
            await autoCoumpound.tokenMintedStrategies()
          ).toString();
          const MAX_SUPPLY_STRATEGIES = (
            await autoCoumpound.MAX_SUPPLY_STRATEGIES()
          ).toString();
          console.log(
            tokenMintedStrategies,
            "tokenMintedStrategies",
            MAX_SUPPLY_STRATEGIES,
            "MAX_SUPPLY_STRATEGIES"
          );
          await MasterChefCakeNative.connect(signers[i]).withdraw(`${i + 1}`);
          console.log(
            await autoCoumpound.balanceOf(signers[i].address),
            "balance AC"
          );
          console.log(await MasterChefCakeNative.userInfo(signers[i].address));
        }
      }
    });
  });
});
