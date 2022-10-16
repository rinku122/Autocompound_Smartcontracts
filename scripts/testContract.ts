import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import {
  CakeToken,
  CakeToken__factory,
  SyrupBar,
  SyrupBar__factory,
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
  MasterChef,
  MasterChef__factory,
  CalHash,
  CalHash__factory,
} from "../typechain";
import { expandTo18Decimals } from "../utilities/utilities";

let signers: SignerWithAddress[];
let _BUSD: BUSD;
let _USDT: USDT;
let WETH: WETH9;
let factory: UniswapV2Factory;
let router: UniswapV2Router02;
let cake: CakeToken;
let syrupBar: SyrupBar;
let _MasterChef: MasterChef;
let owner: SignerWithAddress;
let calHash: CalHash;
let contract: any;

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
    contract = new CakeToken__factory(owner);
    cake = await contract.deploy();
    await cake["mint(address,uint256)"](
      owner.address,
      expandTo18Decimals(5000)
    );
    console.log("Cake : ", cake.address);
    contract = new SyrupBar__factory(owner);
    syrupBar = await contract.deploy(cake.address);
    console.log("Syrup : ", syrupBar.address);
    contract = new MasterChef__factory(owner);

    const blocknumber = await ethers.provider.getBlockNumber();

    _MasterChef = await contract.deploy(
      cake.address,
      syrupBar.address,
      owner.address,
      "40000000000000000000",
      blocknumber
    );
    await cake.connect(owner).transferOwnership(_MasterChef.address);
    await syrupBar.connect(owner).transferOwnership(_MasterChef.address);

    console.log("MasterChef : ", _MasterChef.address);
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
