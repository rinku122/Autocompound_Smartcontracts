import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  CalHash,
  CalHash__factory,
  CakeToken,
  CakeToken__factory,
  MasterChef,
  MasterChef__factory,
  SyrupBar,
  SyrupBar__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  WETH9,
  WETH9__factory,
  USDT,
  USDT__factory,
  BUSD,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  BUSD__factory,
  MasterChefStrategyLP,
  MasterChefStrategyLP__factory,
  Autocompound,
  Autocompound__factory,
  Staking,
  Staking__factory,
  AutocompoundGovernor,
  AutocompoundGovernor__factory,
  Timelock,
  Timelock__factory,
} from "../typechain";

const { getContractAddress } = require("@ethersproject/address");

describe("Governance", async () => {
  let owner: SignerWithAddress;

  let signers: SignerWithAddress[];

  let staking: Staking;
  let governance: AutocompoundGovernor;
  let timelock: Timelock;
  let autoCoumpound: Autocompound;
  let predictedGovernanceAddress: any;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];

    let timeDelay = 1000;

    autoCoumpound = await new Autocompound__factory(owner).deploy();
    staking = await new Staking__factory(owner).deploy(autoCoumpound.address);
    let transactionCount = await owner.getTransactionCount();
    transactionCount = transactionCount + 1;
    predictedGovernanceAddress = getContractAddress({
      from: owner.address,
      nonce: transactionCount,
    });
    timelock = await new Timelock__factory(owner).deploy(
      predictedGovernanceAddress,
      timeDelay
    );
    governance = await new AutocompoundGovernor__factory(owner).deploy(
      timelock.address,
      staking.address,
      owner.address
    );
  });

  describe("Governance", async () => {
    it("Get governance address before deloying governance", async () => {
      expect(governance.address).to.be.eq(predictedGovernanceAddress);
    });
  });
});
