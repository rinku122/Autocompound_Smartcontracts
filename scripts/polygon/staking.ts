import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import { Staking, Staking__factory } from "../../typechain";

let signers: SignerWithAddress[];
let owner: SignerWithAddress;
let contract: any;
let staking: Staking;

const deployStaking = async (autocompoundAddress: string) => {
  signers = await ethers.getSigners();
  owner = signers[0];
  contract = new Staking__factory(owner);
  staking = await contract.deploy(autocompoundAddress);

  return staking;
};

export default deployStaking;
