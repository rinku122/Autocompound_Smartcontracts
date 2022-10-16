import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

const WETHAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const CakeAddress = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
const masterChef = "0xa5f8c5dbd5f286960b9d90548680ae5ebff07652";

const PID = "44";
const pairAddress = "0xEa26B78255Df2bBC31C1eBf60010D78670185bD0";

const ops = "0x527a819db1eb0e34426297b03bae11F2f8B3A19E";
const treasury = "0xd31bd4a472bb72e1357912027c5923e4f69099ba";

import {
  MasterChefStrategyLP,
  MasterChefStrategyLP__factory,
  UniswapV2Pair__factory,
  ERC20__factory,
} from "../typechain";

let owner: SignerWithAddress;
let signers: SignerWithAddress[];
let contract: any;
let MasterChefLP: MasterChefStrategyLP;

async function main() {
  signers = await ethers.getSigners();
  owner = signers[0];
  console.log("owner", owner.address);

  try {
    contract = new MasterChefStrategyLP__factory(owner);
    MasterChefLP = await contract.deploy(
      WETHAddress,
      pairAddress,
      CakeAddress,
      masterChef,
      RouterAddress,
      PID,
      ops,
      treasury
    );
    contract = new UniswapV2Pair__factory(owner);
    contract = await contract.attach(pairAddress);

    let token0 = await contract.token0();
    let token1 = await contract.token1();

    contract = new ERC20__factory(owner);

    contract = await contract.attach(token0);
    const sym0 = await contract.symbol();

    contract = new ERC20__factory(owner);
    contract = await contract.attach(token1);

    const sym1 = await contract.symbol();

    console.log(`PairAddress (PID - ${PID}) (${sym0}-${sym1}) : `, pairAddress);
    console.log("MasterChefLP ", MasterChefLP.address);
  } catch (error) {
    console.log(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
