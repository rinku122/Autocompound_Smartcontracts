import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import {
  AutocompoundGovernor,
  AutocompoundGovernor__factory,
  Timelock,
  Timelock__factory,
} from "../typechain";
const { getContractAddress } = require("@ethersproject/address");

let signers: SignerWithAddress[];
let owner: SignerWithAddress;
let contract: any;
let timelock: Timelock;
let predictedGovernanceAddress: any;
let governance: AutocompoundGovernor;

const deployGovernance = async (stakingAddress: string) => {
  let timeDelay = 1000;
  signers = await ethers.getSigners();
  owner = signers[0];
  let transactionCount = await owner.getTransactionCount();
  transactionCount = transactionCount + 1;

  predictedGovernanceAddress = getContractAddress({
    from: owner.address,
    nonce: transactionCount,
  });
  contract = new Timelock__factory(owner);
  timelock = await contract.deploy(predictedGovernanceAddress, timeDelay);
  contract = new AutocompoundGovernor__factory(owner);
  governance = await contract.deploy(
    timelock.address,
    stakingAddress,
    owner.address
  );

  return { governance, timelock };
};

export default deployGovernance;
