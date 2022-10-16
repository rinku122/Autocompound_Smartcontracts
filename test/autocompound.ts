import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Autocompound, Autocompound__factory } from "../typechain";

import { expandTo18Decimals } from "../utilities/utilities";

describe("Autocompound", async () => {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user1: SignerWithAddress;
  let contract: SignerWithAddress;
  let signers: SignerWithAddress[];
  let autocompound: Autocompound;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];
    user = signers[1];
    contract = signers[2];
    user1 = signers[3];
    autocompound = await new Autocompound__factory(owner).deploy();
  });

  describe("Autocompound", async () => {
    it("Autocompound token testing", async () => {
      await autocompound
        .connect(owner)
        .mint(contract.address, expandTo18Decimals(100));
      await autocompound.connect(owner).transferOwnership(user.address);
      await autocompound
        .connect(user)
        .mint(contract.address, expandTo18Decimals(100));
      await autocompound.connect(user).setOperator(contract.address, true);
      await autocompound
        .connect(contract)
        .mint(contract.address, expandTo18Decimals(100));
    });
  });
});
