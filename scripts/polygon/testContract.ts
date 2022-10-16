import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import {
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  BUSD,
  BUSD__factory,
  USDT,
  USDT__factory,
  WETH9,
  WETH9__factory,
  CalHash,
  CalHash__factory,
  StakingDualRewards,
  StakingDualRewards__factory,
  Quick,
  Quick__factory,
  DragonLair,
  DragonLair__factory,
  StakingRewards__factory,
  IXT,
  IXT__factory,
  StakingRewards,
} from "../../typechain";
import { expandTo18Decimals } from "../../utilities/utilities";

let signers: SignerWithAddress[];
let _BUSD: BUSD;
let _USDT: USDT;
let WETH: WETH9;
let factory: UniswapV2Factory;
let router: UniswapV2Router02;
let quick: Quick;
let stakingDualRewards: StakingDualRewards;
let dragonLiar: DragonLair;
let owner: SignerWithAddress;
let calHash: CalHash;
let pairAddress: string;
let contract: any;
let stakingRewardsLP: StakingRewards;
let stakingRewardsSingle: StakingRewards;
let ixt: IXT;

async function main() {
  signers = await ethers.getSigners();
  owner = signers[0];
  try {
    contract = new CalHash__factory(owner);
    calHash = await contract.deploy();
    let inithash: any = await calHash.getInitHash();
    inithash = inithash.toString();
    console.log("InitHash : ", inithash);

    contract = new UniswapV2Factory__factory(owner);
    factory = await contract.deploy(owner.address);

    console.log("Factory : ", factory.address);
    contract = new WETH9__factory(owner);
    WETH = await contract.deploy();
    console.log("WETH : ", WETH.address);
    contract = new UniswapV2Router02__factory(owner);
    router = await contract.deploy(factory.address, WETH.address);

    console.log("Router : ", router.address);
    contract = new USDT__factory(owner);
    _USDT = await contract.deploy("USDT", "USDT");
    console.log("USDT : ", _USDT.address);

    contract = new BUSD__factory(owner);
    _BUSD = await contract.deploy("BUSD", "BUSD");
    console.log("BUSD : ", _BUSD.address);

    await _BUSD.approve(router.address, expandTo18Decimals(20000000));
    await _USDT.approve(router.address, expandTo18Decimals(20000000));

    await router
      .connect(owner)
      .addLiquidity(
        _BUSD.address,
        _USDT.address,
        expandTo18Decimals(20000),
        expandTo18Decimals(10000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );
    let value = ethers.utils.parseEther("1");

    pairAddress = await factory.getPair(_USDT.address, _BUSD.address);
    console.log("pairAddress", pairAddress);

    contract = new Quick__factory(owner);
    quick = await contract.deploy(owner.address);
    await quick.mint(owner.address, expandTo18Decimals(10000));
    await quick.approve(router.address, expandTo18Decimals(10000));

    console.log("Quick address", quick.address);

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
        _USDT.address,
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
        _BUSD.address,
        expandTo18Decimals(200),
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );

    contract = new DragonLair__factory(owner);
    dragonLiar = await contract.deploy(quick.address);
    console.log("DragonLiar address", dragonLiar.address);

    contract = contract = new StakingDualRewards__factory(owner);
    stakingDualRewards = await contract.deploy(
      owner.address,
      owner.address,
      dragonLiar.address,
      _BUSD.address,
      pairAddress
    );
    console.log("StakingDualrewards address", stakingDualRewards.address);
    value = ethers.utils.parseEther("2");

    await dragonLiar._mint(
      stakingDualRewards.address,
      expandTo18Decimals(10000)
    );
    await _BUSD.transfer(stakingDualRewards.address, expandTo18Decimals(20000));
    await stakingDualRewards.notifyRewardAmount(
      expandTo18Decimals(10000),
      expandTo18Decimals(20000),
      500
    );
    await quick.mint(dragonLiar.address, expandTo18Decimals(1500));

    contract = new StakingRewards__factory(owner);
    stakingRewardsLP = await contract.deploy(
      owner.address,
      dragonLiar.address,
      pairAddress
    );
    await dragonLiar._mint(stakingRewardsLP.address, expandTo18Decimals(10000));
    await stakingRewardsLP.notifyRewardAmount(expandTo18Decimals(10000), 500);
    console.log("StakingRewards address", stakingRewardsLP.address);

    contract = new IXT__factory(owner);
    ixt = await contract.deploy();
    console.log("IXT address", ixt.address);
    await ixt.mint(owner.address, expandTo18Decimals(10000));
    await ixt.approve(router.address, expandTo18Decimals(20000000));
    await quick.approve(router.address, expandTo18Decimals(20000000));
    await router
      .connect(owner)
      .addLiquidity(
        ixt.address,
        quick.address,
        expandTo18Decimals(100),
        expandTo18Decimals(2163),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );
    contract = new StakingRewards__factory(owner);
    stakingRewardsSingle = await contract.deploy(
      owner.address,
      ixt.address,
      quick.address
    );
    console.log("stakingRewardsSingle", stakingRewardsSingle.address);
  } catch (error) {
    console.log("Test contracts Error : ", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
