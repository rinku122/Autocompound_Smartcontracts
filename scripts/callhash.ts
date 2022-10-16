import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { CalHash, CalHash__factory } from "../typechain";

let signers: SignerWithAddress[];
let owner: SignerWithAddress;
let contract: any;
let calHash: CalHash;

const getInithash = async () => {
  signers = await ethers.getSigners();
  owner = signers[0];
  contract = new CalHash__factory(owner);
  calHash = await contract.deploy();
  let inithash = (await calHash.getInitHash()).toString();

  return inithash;
};

export default getInithash;
