import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import {
  autoCompoundInstance,
  masterChefInstance,
  pairInstance,
  factoryInstance,
} from "./instance";
import {
  MasterChefCakeNative,
  MasterChefCakeNative__factory,
} from "../typechain";

import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";
import { BigNumber } from "ethers";

let owner: SignerWithAddress;
let signers: SignerWithAddress[];
let user: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;

let Factory: string;
let WETH: string;
let Router: string;
let Cake: string;
let Syrup: string;
let MasterChef: string;
let alloactionpoint: string;
let AutoCompound: string;
let Staking: string;
let masterChefcakeNative: MasterChefCakeNative;
let autoCompoundPerBlock: string;
let ops: string;
let treasury: string;

async function main() {
  signers = await ethers.getSigners();
  owner = signers[0];
  user = signers[1];
  user1 = signers[2];
  user2 = signers[3];
  user3 = signers[4];
  Factory = "0x28A37Be2B263D586088F51BF63Bd97304EBC30aB";
  WETH = "0xC108838411e7125E611bDE2dA65E85453ed05a70";
  Router = "0x49C49eD2586A13b72B7DDbf79BA9dd59e8Ff6cB7";
  Cake = "0x83E085D5096BfF3D7879eA3b7ED1237dFB0AD466";
  Syrup = "0x22288236F41d404A930F5d8d4fEA1d25055CB41A";
  MasterChef = "0xfFb2A7498743f8F3ec4e4Bb582066a230C57AB03";
  AutoCompound = "0x37DC6cF6A221b6E511EB9fcdeF6cb467c636847b";
  Staking = "0x6c648d4D584b9c9D2B7C2b6C48c9cfFC1d9A848b";
  autoCompoundPerBlock = "10000000000000000";
  alloactionpoint = "2";
  ops = "0x8c089073A9594a4FB03Fa99feee3effF0e2Bc58a";
  treasury = "0xA4dFeF1DbD75386bE265923B65fBfE36327Fb733";

  try {
    const factory = factoryInstance(Factory, owner);
    const masterChef = masterChefInstance(MasterChef, owner);

    // await tokenAinstance
    //   .connect(owner)
    //   .approve(Router, expandTo18Decimals(20000000));

    // await tokenBinstance
    //   .connect(owner)
    //   .approve(Router, expandTo18Decimals(20000000));

    // await _cake.connect(owner).approve(Router, expandTo18Decimals(20000000));
    // await _autocompound.mint(owner.address, expandTo18Decimals(100));
    // await _autocompound
    //   .connect(owner)
    //   .approve(Router, expandTo18Decimals(20000000));

    // await addLiquidity(
    //   owner,
    //   tokenA,
    //   tokenB,
    //   Router,
    //   expandTo18Decimals(10000),
    //   expandTo18Decimals(1000),
    //   expandTo18Decimals(1),
    //   expandTo18Decimals(1)
    // );

    // console.log(`Add liquidity for ${sym}-${symB}`);

    // await addLiquidity(
    //   owner,
    //   Cake,
    //   tokenA,
    //   Router,
    //   expandTo18Decimals(223),
    //   expandTo18Decimals(1000),
    //   expandTo18Decimals(1),
    //   expandTo18Decimals(1)
    // );

    // console.log(`Add liquidity for Cake - ${sym}`);

    // await addLiquidity(
    //   owner,
    //   Cake,
    //   tokenB,
    //   Router,
    //   expandTo18Decimals(223),
    //   expandTo18Decimals(1000),
    //   expandTo18Decimals(1),
    //   expandTo18Decimals(1)
    // );
    // console.log(`Add liquidity for Cake - ${symB}`);

    // await addLiquidityETH(
    //   owner,
    //   Cake,
    //   Router,
    //   expandTo18Decimals(1606),
    //   "4",
    //   expandTo18Decimals(1),
    //   expandTo18Decimals(1)
    // );

    // console.log(`Add liquidity for Cake - ETH`);

    // await addLiquidityETH(
    //   owner,
    //   AutoCompound,
    //   Router,
    //   expandTo18Decimals(100),
    //   "1",
    //   expandTo18Decimals(1),
    //   expandTo18Decimals(1)
    // );

    // console.log(`Add liquidity for Autocompound - ETH`);

    let PID = (await masterChef.poolLength()).toString();

    let pairAddress = await factory.getPair(WETH, Cake);
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      console.log("Pair not created yet");
      return;
    }
    await masterChef.connect(owner).add(alloactionpoint, pairAddress, true);
    const pair = pairInstance(pairAddress, owner);

    let balance: any = await pair.balanceOf(owner.address);

    balance = BigNumber.from(balance);
    balance = balance.div(2);

    await pair
      .connect(owner)
      .transfer(
        "0x0Cb337ee2499a30Af6bd9E1724bc8023Cb152849",
        balance.toString()
      );
    const autocompound = autoCompoundInstance(AutoCompound, owner);

    let contract = new MasterChefCakeNative__factory(owner);

    masterChefcakeNative = await contract.deploy(
      WETH,
      Staking,
      AutoCompound,
      pairAddress,
      Cake,
      MasterChef,
      Router,
      PID,
      autoCompoundPerBlock,
      ops,
      treasury
    );

    await autocompound
      .connect(owner)
      .setOperator(masterChefcakeNative.address, true);

    console.log(
      `MasterChefCakeNative : ${masterChefcakeNative.address}, PID : ${PID} `
    );
    console.log(`PairAddress (ETH-Cake)  : ${pairAddress} `);

    //Change ownership to timelock
  } catch (error) {
    console.log("MasterChefCakeNative Error", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
