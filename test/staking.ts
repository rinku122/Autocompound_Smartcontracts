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
  MasterChefStrategySA__factory,
  USDC,
  USDC__factory,
  Autocompound__factory,
  Autocompound,
  MasterChefStrategySA,
  Staking,
  Staking__factory,
} from "../typechain";

import { expandTo18Decimals, mineBlocks } from "../utilities/utilities";

describe("Staking", async () => {
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;
  let user6: SignerWithAddress;
  let user7: SignerWithAddress;
  let user8: SignerWithAddress;
  let user9: SignerWithAddress;
  let user10: SignerWithAddress;
  let signers: SignerWithAddress[];
  let factory: UniswapV2Factory;
  let router: UniswapV2Router02;
  let WETH: WETH9;
  let calHash: CalHash;
  let cake: CakeToken;
  let syrupBar: SyrupBar;
  let MasterChef: MasterChef;
  let MasterChefStrategySA: MasterChefStrategySA;
  let USDC: USDC;
  let autocompound: Autocompound;
  let staking: Staking;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];
    user = signers[1];
    user1 = signers[2];
    user2 = signers[3];
    user3 = signers[4];
    user4 = signers[5];
    user5 = signers[6];
    user6 = signers[7];
    user7 = signers[8];
    user8 = signers[9];
    user9 = signers[10];
    user10 = signers[11];

    factory = await new UniswapV2Factory__factory(owner).deploy(owner.address);

    WETH = await new WETH9__factory(owner).deploy();
    router = await new UniswapV2Router02__factory(owner).deploy(
      factory.address,
      WETH.address
    );

    USDC = await new USDC__factory(owner).deploy();
    cake = await new CakeToken__factory(owner).deploy();
    autocompound = await new Autocompound__factory(owner).deploy();

    await USDC.connect(owner).mint(owner.address, expandTo18Decimals(10000));
    await cake["mint(address,uint256)"](
      owner.address,
      expandTo18Decimals(1000)
    );
    await autocompound
      .connect(owner)
      .mint(owner.address, expandTo18Decimals(30));

    await cake
      .connect(owner)
      .approve(router.address, expandTo18Decimals(20000000));

    await USDC.connect(owner).approve(
      router.address,
      expandTo18Decimals(20000000)
    );

    await autocompound
      .connect(owner)
      .approve(router.address, expandTo18Decimals(20000000));

    await USDC.connect(owner).transfer(user1.address, expandTo18Decimals(600));
    await USDC.connect(owner).transfer(user2.address, expandTo18Decimals(400));
    await USDC.connect(owner).transfer(user3.address, expandTo18Decimals(1000));
    await USDC.connect(owner).transfer(user4.address, expandTo18Decimals(2000));
    await USDC.connect(owner).transfer(user5.address, expandTo18Decimals(4000));

    syrupBar = await new SyrupBar__factory(owner).deploy(cake.address);
    calHash = await new CalHash__factory(owner).deploy();
    console.log(
      "Call Hash Factory: ",
      (await calHash.getInitHash()).toString()
    );
    console.log("--------------------------------");

    MasterChef = await new MasterChef__factory(owner).deploy(
      cake.address,
      syrupBar.address,
      owner.address,
      "40000000000000000000",
      await ethers.provider.getBlockNumber()
    );

    staking = await new Staking__factory(owner).deploy(autocompound.address);
    MasterChefStrategySA = await new MasterChefStrategySA__factory(
      owner
    ).deploy(
      WETH.address,
      staking.address,
      autocompound.address,
      USDC.address.toString(),
      cake.address,
      MasterChef.address,
      router.address,
      1,
      "10000000000000000000"
    );

    await MasterChef.add(2, USDC.address.toString(), true);

    let r: any = await router
      .connect(owner)
      .addLiquidity(
        cake.address,
        USDC.address,
        expandTo18Decimals(232),
        expandTo18Decimals(1000),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320
      );

    let value: any = ethers.utils.parseEther("1");
    r = await router
      .connect(owner)
      .addLiquidityETH(
        cake.address,
        expandTo18Decimals(418),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );

    r = await router
      .connect(owner)
      .addLiquidityETH(
        autocompound.address,
        expandTo18Decimals(30),
        expandTo18Decimals(1),
        expandTo18Decimals(1),
        owner.address,
        1661664320,
        { value }
      );
    await autocompound.setOperator(MasterChefStrategySA.address, true);

    await cake.transferOwnership(MasterChef.address);
    await syrupBar.transferOwnership(MasterChef.address);

    for (let i = 2; i <= 6; i++) {
      await USDC.connect(signers[i]).approve(
        MasterChefStrategySA.address,
        expandTo18Decimals(100000)
      );
    }
  });

  describe("Staking ", async () => {
    it("Staking", async () => {
      expect(await staking.autocompound()).to.be.eq(autocompound.address);
      expect(await autocompound.balanceOf(user1.address)).to.be.eq("0");
      await expect(
        staking.connect(user1).stake(expandTo18Decimals(100))
      ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");

      await MasterChefStrategySA.connect(user1).deposit(
        expandTo18Decimals(600)
      );

      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();

      let acs: any = await MasterChefStrategySA.balanceOf(user1.address);
      acs = acs.toString();

      await MasterChefStrategySA.connect(user1).withdraw(acs);

      const user1AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user1.address
      );

      await expect(
        staking.connect(user1).stake(user1AutocompoundAfterWithdraw.toString())
      ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");

      await autocompound
        .connect(user1)
        .approve(staking.address, user1AutocompoundAfterWithdraw.toString());
      expect(await staking.balanceOf(user1.address)).to.be.eq("0");
      await staking
        .connect(user1)
        .stake(user1AutocompoundAfterWithdraw.toString());

      expect(await staking.balanceOf(user1.address)).to.be.above("0");
    });

    it("Unstaking", async () => {
      await MasterChefStrategySA.connect(user1).deposit(
        expandTo18Decimals(600)
      );

      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();

      let acs: any = await MasterChefStrategySA.balanceOf(user1.address);
      acs = acs.toString();

      await MasterChefStrategySA.connect(user1).withdraw(acs);

      const user1AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user1.address
      );

      await autocompound
        .connect(user1)
        .approve(staking.address, user1AutocompoundAfterWithdraw.toString());
      expect(await staking.balanceOf(user1.address)).to.be.eq("0");
      await staking
        .connect(user1)
        .stake(user1AutocompoundAfterWithdraw.toString());

      await MasterChefStrategySA.connect(user2).deposit(
        expandTo18Decimals(400)
      );

      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();
      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();

      acs = await MasterChefStrategySA.balanceOf(user2.address);
      acs = acs.toString();

      await MasterChefStrategySA.connect(user2).withdraw(acs);

      await expect(
        staking.connect(user2).unstake(expandTo18Decimals(100))
      ).to.be.revertedWith("XAC: burn amount exceeds balance");

      const user2AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user2.address
      );

      await autocompound
        .connect(user2)
        .approve(staking.address, user2AutocompoundAfterWithdraw);

      await staking.connect(user2).stake(user2AutocompoundAfterWithdraw);

      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();
      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();

      let xac: any = await staking.balanceOf(user2.address);
      xac = xac.toString();

      await staking.connect(user2).unstake(xac);

      const user2AutocompoundAfterunstake = await autocompound.balanceOf(
        user2.address
      );

      expect(user2AutocompoundAfterunstake).to.be.above(
        user2AutocompoundAfterWithdraw
      );
    });

    it("Users Unstaking autocompound to get boosted autocompounds", async () => {
      let user1USDCBeforeWithdraw = await USDC.balanceOf(user1.address);
      let user2USDCBeforeWithdraw = await USDC.balanceOf(user2.address);
      let user3USDCBeforeWithdraw = await USDC.balanceOf(user3.address);
      let user4USDCBeforeWithdraw = await USDC.balanceOf(user4.address);
      let user5USDCBeforeWithdraw = await USDC.balanceOf(user5.address);

      await MasterChefStrategySA.connect(user1).deposit(
        expandTo18Decimals(600)
      );

      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();
      await MasterChefStrategySA.connect(user2).deposit(
        expandTo18Decimals(400)
      );
      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();
      await MasterChefStrategySA.connect(user3).deposit(
        expandTo18Decimals(1000)
      );
      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();
      await MasterChefStrategySA.connect(user4).deposit(
        expandTo18Decimals(2000)
      );
      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();
      await MasterChefStrategySA.connect(user5).deposit(
        expandTo18Decimals(4000)
      );
      await mineBlocks(ethers.provider, 1000);
      await MasterChefStrategySA.connect(user).reinvest();

      let user1AutocompoundBeforeWithdraw = await autocompound.balanceOf(
        user1.address
      );

      let user2AutocompoundBeforeWithdraw = await autocompound.balanceOf(
        user2.address
      );

      let user3AutocompoundBeforeWithdraw = await autocompound.balanceOf(
        user3.address
      );

      let user4AutocompoundBeforeWithdraw = await autocompound.balanceOf(
        user4.address
      );

      let user5AutocompoundBeforeWithdraw = await autocompound.balanceOf(
        user5.address
      );

      expect(user1AutocompoundBeforeWithdraw).to.be.eq("0");
      expect(user2AutocompoundBeforeWithdraw).to.be.eq("0");
      expect(user3AutocompoundBeforeWithdraw).to.be.eq("0");
      expect(user4AutocompoundBeforeWithdraw).to.be.eq("0");
      expect(user5AutocompoundBeforeWithdraw).to.be.eq("0");

      for (let i = 2; i <= 6; i++) {
        let acs: any = await MasterChefStrategySA.balanceOf(signers[i].address);
        acs = acs.toString();

        await MasterChefStrategySA.connect(signers[i]).withdraw(acs);
      }

      expect(await USDC.balanceOf(user1.address)).to.be.above(
        user1USDCBeforeWithdraw
      );
      expect(await USDC.balanceOf(user2.address)).to.be.above(
        user2USDCBeforeWithdraw
      );
      expect(await USDC.balanceOf(user3.address)).to.be.above(
        user3USDCBeforeWithdraw
      );
      expect(await USDC.balanceOf(user4.address)).to.be.above(
        user4USDCBeforeWithdraw
      );
      expect(await USDC.balanceOf(user5.address)).to.be.above(
        user5USDCBeforeWithdraw
      );

      const user1AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user1.address
      );

      const user2AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user2.address
      );

      const user3AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user3.address
      );

      const user4AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user4.address
      );

      const user5AutocompoundAfterWithdraw = await autocompound.balanceOf(
        user5.address
      );

      expect(user1AutocompoundAfterWithdraw).to.be.above("0");
      expect(user2AutocompoundAfterWithdraw).to.be.above("0");
      expect(user3AutocompoundAfterWithdraw).to.be.above("0");
      expect(user4AutocompoundAfterWithdraw).to.be.above("0");
      expect(user5AutocompoundAfterWithdraw).to.be.above("0");

      for (let i = 2; i <= 6; i++) {
        await autocompound
          .connect(signers[i])
          .approve(staking.address, expandTo18Decimals(10000000));
      }
      await staking
        .connect(user1)
        .stake(user1AutocompoundAfterWithdraw.toString());
      await mineBlocks(ethers.provider, 1000);
      await staking
        .connect(user2)
        .stake(user2AutocompoundAfterWithdraw.toString());
      await mineBlocks(ethers.provider, 1000);
      await staking
        .connect(user3)
        .stake(user3AutocompoundAfterWithdraw.toString());
      await mineBlocks(ethers.provider, 1000);
      await staking
        .connect(user4)
        .stake(user4AutocompoundAfterWithdraw.toString());
      await mineBlocks(ethers.provider, 1000);
      await staking
        .connect(user5)
        .stake(user5AutocompoundAfterWithdraw.toString());
      await mineBlocks(ethers.provider, 1000);

      for (let i = 1; i <= 8; i++) {
        await mineBlocks(ethers.provider, 1000);
        await MasterChefStrategySA.reinvest();
      }

      for (let i = 2; i <= 6; i++) {
        let XAutocompounds: any = await staking.balanceOf(signers[i].address);
        XAutocompounds = XAutocompounds.toString();
        await staking.connect(signers[i]).unstake(XAutocompounds);
      }

      let user1AutocompoundAfterUnstake = await autocompound.balanceOf(
        user1.address
      );

      let user2AutocompoundAfterUnstake = await autocompound.balanceOf(
        user2.address
      );

      let user3AutocompoundAfterUnstake = await autocompound.balanceOf(
        user3.address
      );

      let user4AutocompoundAfterUnstake = await autocompound.balanceOf(
        user4.address
      );

      let user5AutocompoundAfterUnstake = await autocompound.balanceOf(
        user5.address
      );

      expect(user1AutocompoundAfterUnstake).to.be.above(
        user1AutocompoundAfterWithdraw
      );

      expect(user2AutocompoundAfterUnstake).to.be.above(
        user2AutocompoundAfterWithdraw
      );

      expect(user3AutocompoundAfterUnstake).to.be.above(
        user3AutocompoundAfterWithdraw
      );

      expect(user4AutocompoundAfterUnstake).to.be.above(
        user4AutocompoundAfterWithdraw
      );
      expect(user5AutocompoundAfterUnstake).to.be.above(
        user5AutocompoundAfterWithdraw
      );
    });
  });
});
