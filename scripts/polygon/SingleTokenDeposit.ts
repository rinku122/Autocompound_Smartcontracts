import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import {
  SingleTokenDeposit,
  SingleTokenDeposit__factory,
  Autocompound__factory,
} from "../../typechain";
import { expandTo18Decimals } from "../../utilities/utilities";

let owner: SignerWithAddress;
let signers: SignerWithAddress[];
let contract: any;
let singletokenDeposit: SingleTokenDeposit;
let treasury: string;
let ops: string;
let WETH: string;
let quick: string;
let stakingRewards: string;
let router: string;
let autocompoundPerBlock: any;
let collectible: string;
let autocomoundAddress;

async function main() {
  signers = await ethers.getSigners();
  owner = signers[0];
  console.log("owner", owner.address);
  WETH = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  quick = "0xB5C064F955D8e7F38fE0460C556a72987494eE17";
  collectible = "0x8063037ea50E4a066bF1430EA1E3e609CD5cEf6B";
  stakingRewards = "0x7b9B6F2bf9A0472761A65BACFDA97Ef3B87B170b";
  router = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
  ops = "0x527a819db1eb0e34426297b03bae11F2f8B3A19E";
  treasury = "0xd31bd4a472bb72e1357912027c5923e4f69099ba";
  autocomoundAddress = "0x12e9a9dcDc8f276c71524Ddd102343525ddAbB26";
  autocompoundPerBlock = "5000000000000000";

  try {
    contract = new SingleTokenDeposit__factory(owner);
    singletokenDeposit = await contract.deploy(
      WETH,
      quick,
      collectible,
      stakingRewards,
      router,
      autocompoundPerBlock,
      ops,
      treasury
    );
    console.log("SingleTokenDeposit address", singletokenDeposit.address);
    contract = new Autocompound__factory(owner).attach(autocomoundAddress);
    await contract.setOperator(singletokenDeposit.address, true);
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
