import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import {
  DualTokenRewardLPMinning,
  DualTokenRewardLPMinning__factory,
  Autocompound__factory,
} from "../../typechain";
import { expandTo18Decimals } from "../../utilities/utilities";

let owner: SignerWithAddress;
let signers: SignerWithAddress[];
let contract: any;
let pairAddress: string;
let dualTokenRewardLPMining: DualTokenRewardLPMinning;
let treasury: string;
let ops: string;
let WETH: string;
let dragonLiar: string;
let quick: string;
let stakingDualRewards: string;
let router: string;
let collectible: string;
let autocompoundPerBlock: any;
let autocomoundAddress;

async function main() {
  signers = await ethers.getSigners();
  owner = signers[0];
  console.log("owner", owner.address);
  WETH = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  dragonLiar = "0xf28164A485B0B2C90639E47b0f377b4a438a16B1";
  pairAddress = "0xa5cABfC725DFa129f618D527E93702d10412f039";
  quick = "0x831753DD7087CaC61aB5644b308642cc1c33Dc13";
  stakingDualRewards = "0x84B3c86D660D680847258Fd20aAA1274Cc35EAcd";
  router = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
  ops = "0x527a819db1eb0e34426297b03bae11F2f8B3A19E";
  treasury = "0xd31bd4a472bb72e1357912027c5923e4f69099ba";
  autocomoundAddress = "0x12e9a9dcDc8f276c71524Ddd102343525ddAbB26";
  collectible = "0xdF7837DE1F2Fa4631D716CF2502f8b230F1dcc32";
  autocompoundPerBlock = "5000000000000000";

  try {
    contract = new DualTokenRewardLPMinning__factory(owner);
    dualTokenRewardLPMining = await contract.deploy(
      WETH,
      collectible,
      dragonLiar,
      pairAddress,
      quick,
      stakingDualRewards,
      router,
      autocompoundPerBlock,
      ops,
      treasury
    );
    console.log(
      "DualTokenRewardLPMining address",
      dualTokenRewardLPMining.address
    );
    console.log("PairAddress", pairAddress);
    contract = new Autocompound__factory(owner).attach(autocomoundAddress);
    await contract.setOperator(dualTokenRewardLPMining.address, true);
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
