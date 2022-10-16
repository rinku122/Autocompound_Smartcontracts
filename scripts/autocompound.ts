import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import { Autocompound, Autocompound__factory } from "../typechain";

let signers: SignerWithAddress[];
let owner: SignerWithAddress;
let contract: any;
let autoCoumpound: Autocompound;

const deployAutoCompound = async () => {
  signers = await ethers.getSigners();
  owner = signers[0];
  contract = new Autocompound__factory(owner);
  autoCoumpound = await contract.deploy();

  return autoCoumpound;
};

export default deployAutoCompound;
