import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

const WETHAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const CakeAddress = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
const rewardTokenAddress = "0xa865197A84E780957422237B5D152772654341F3";
const smartChefAddress = "0xda6F750be1331963E5772BEe757062f6bddcEA4C";
const ops = "0x527a819db1eb0e34426297b03bae11F2f8B3A19E";
const treasury = "0xd31bd4a472bb72e1357912027c5923e4f69099ba";

import {
  SmartChefInitializableStartegySA,
  SmartChefInitializableStartegySA__factory,
  ERC20__factory,
} from "../typechain";

let owner: SignerWithAddress;
let signers: SignerWithAddress[];
let contract: any;
let smartChefInitializableStartegySA: SmartChefInitializableStartegySA;

async function main() {
  signers = await ethers.getSigners();
  owner = signers[0];
  console.log("owner", owner.address);

  try {
    contract = new SmartChefInitializableStartegySA__factory(owner);
    smartChefInitializableStartegySA = await contract.deploy(
      WETHAddress,
      CakeAddress,
      rewardTokenAddress,
      smartChefAddress,
      RouterAddress,
      ops,
      treasury
    );
    contract = new ERC20__factory(owner);
    contract = await contract.attach(rewardTokenAddress);
    const sym = await contract.symbol();
    console.log("Reward Token : ", sym);
    console.log(
      "SingleDepositCake ",
      smartChefInitializableStartegySA.address
    );
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
