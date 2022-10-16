const { expect } = require("chai");
const { ethers } = require("hardhat");

// const strategy = "0x04BF7bd56eCD2E586E29e5A71faF2B475b418d84";
const userAddress = "0x4b3af3723d8b944f60eb6ec3f8505f60c290076d";
// const abi = [
//   "function reinvest()",
//   "function execute(address _to, uint _value, bytes _data) external",
// ];

const blockNumber = 30595249;
import { expandTo18Decimals, mineBlocks } from "../../utilities/utilities";

import {
  ERC20__factory,
  SingleTokenRewardLPMining__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

describe("Reinvest", () => {
  let user: any;
  let contract: any;
  let usdcObject: any;

  let signers: SignerWithAddress[];

  beforeEach(async () => {
    // impersonating the user's account.
    signers = await ethers.getSigners();
    let WETH = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      dragonLiar = "0xf28164A485B0B2C90639E47b0f377b4a438a16B1",
      pairAddress = "0x853Ee4b2A13f8a742d64C8F088bE7bA2131f670d",
      quick = "0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
      stakingRewards = "0xbB703E95348424FF9e94fbE4FB524f6d280331B8",
      router = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      ops = "0x527a819db1eb0e34426297b03bae11F2f8B3A19E",
      treasury = "0xd31bd4a472bb72e1357912027c5923e4f69099ba",
      autocomoundAddress = "0x12e9a9dcDc8f276c71524Ddd102343525ddAbB26",
      autocompoundPerBlock = "5000000000000000";
    let USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

    // await ethers.provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [userAddress],
    // });

    user = await ethers.getSigner(userAddress);
    // user = signers[0];

    usdcObject = new ERC20__factory(user).attach(USDC);

    contract = new SingleTokenRewardLPMining__factory(user);

    contract = await contract.deploy(
      WETH,
      dragonLiar,
      pairAddress,
      quick,
      stakingRewards,
      router,
      autocompoundPerBlock,
      ops,
      treasury
    );
    // contract = await contract.attach(
    //   "0x94764fbaeF3804474C583640447e2C2a824d31a6"
    // );
  });

  it(`should be block number`, async () => {
    let _blockNumber = await ethers.provider.getBlockNumber();
    console.log(_blockNumber, "before", contract.address, user.address);

    await usdcObject
      .connect(user)
      .approve(contract.address, "300000000000000000");
    const balance = await usdcObject.balanceOf(user.address);
    console.log(balance.toNumber(), "balance before");

    let r = await contract
      .connect(user)
      .singleTokenDeposit("602458", usdcObject.address, 1);

    console.log("transacction: ", r.hash);
    await mineBlocks(ethers.provider, 100);
    _blockNumber = await ethers.provider.getBlockNumber();

    console.log(_blockNumber, "after");

    await contract.connect(user).reinvest();
  });
});
