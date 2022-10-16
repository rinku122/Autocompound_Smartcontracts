// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
// import { ethers } from "hardhat";
// import { expect } from "chai";
// import {
//   StakingDualRewards,
//   StakingDualRewards__factory,
//   StakingRewardsFactory,
//   StakingRewardsFactory__factory,
//   USDT,
//   USDT__factory,
//   BUSD,
//   BUSD__factory,
//   WETH9,
//   WETH9__factory,
//   UniswapV2Factory,
//   UniswapV2Factory__factory,
//   UniswapV2Router02,
//   UniswapV2Router02__factory,
//   UniswapV2Pair,
//   UniswapV2Pair__factory,
//   QuickSwapStrategy,
//   QuickSwapStrategyLP__factory,
//   Staking,
//   Staking__factory,
//   Autocompound,
//   Autocompound__factory,
//   USDC,
//   USDC__factory,
// } from "../../typechain";

// import { expandTo18Decimals, mineBlocks } from "../../utilities/utilities";
// import { BigNumber } from "ethers";

// describe("Quickswap", async () => {
//   let owner: SignerWithAddress;
//   let user: SignerWithAddress;
//   let user1: SignerWithAddress;
//   let user2: SignerWithAddress;
//   let user3: SignerWithAddress;
//   let signers: SignerWithAddress[];
//   let stakingDualRewards: StakingDualRewards;
//   let stakingRewardsFactory: StakingRewardsFactory;
//   let contract: any;
//   let USDT: USDT;
//   let BUSD: BUSD;
//   let factory: UniswapV2Factory;
//   let router: UniswapV2Router02;
//   let WETH: WETH9;
//   let pairAddress: string;
//   let pairInstance: UniswapV2Pair;
//   let autocompound: Autocompound;
//   let staking: Staking;
//   let quickSwapStrategyLP: QuickSwapStrategy;
//   let treasury: SignerWithAddress;
//   let USDC: USDC;

//   beforeEach(async () => {
//     signers = await ethers.getSigners();
//     owner = signers[0];
//     user = signers[1];
//     user1 = signers[2];
//     user2 = signers[3];
//     user3 = signers[4];
//     treasury = signers[5];

//     factory = await new UniswapV2Factory__factory(owner).deploy(owner.address);
//     WETH = await new WETH9__factory(owner).deploy();
//     router = await new UniswapV2Router02__factory(owner).deploy(
//       factory.address,
//       WETH.address
//     );
//     BUSD = await new BUSD__factory(owner).deploy("BUSD", "BUSD");
//     USDT = await new USDT__factory(owner).deploy("USDT", "USDT");
//     USDC = await new USDC__factory(owner).deploy();
//     // await USDC.mint(owner.address, expandTo18Decimals(20000000));
//     // await USDC.approve(router.address, expandTo18Decimals(1000));
//     autocompound = await new Autocompound__factory(owner).deploy();
//     staking = await new Staking__factory(owner).deploy(autocompound.address);

//     await BUSD.approve(router.address, expandTo18Decimals(20000000));
//     await USDT.approve(router.address, expandTo18Decimals(20000000));

//     await router
//       .connect(owner)
//       .addLiquidity(
//         BUSD.address,
//         USDT.address,
//         expandTo18Decimals(20000),
//         expandTo18Decimals(10000),
//         expandTo18Decimals(1),
//         expandTo18Decimals(1),
//         owner.address,
//         1661664320
//       );

//     pairAddress = await factory.getPair(USDT.address, BUSD.address);

//     pairInstance = new UniswapV2Pair__factory(owner).attach(pairAddress);
//     let blockNumber = await ethers.provider.getBlockNumber();
//     let blockDetails = await ethers.provider.getBlock(blockNumber);

//     let time: any = blockDetails.timestamp;
//     time += 100;
//     contract = new StakingRewardsFactory__factory(owner);
//     stakingRewardsFactory = await contract.deploy(time);
//     await BUSD.transfer(
//       stakingRewardsFactory.address,
//       expandTo18Decimals(20000)
//     );
//     await USDT.transfer(
//       stakingRewardsFactory.address,
//       expandTo18Decimals(10000)
//     );
//     await stakingRewardsFactory[
//       "deploy(address,address,address,address,uint256,uint256,uint256)"
//     ](
//       owner.address,
//       pairAddress,
//       BUSD.address,
//       USDT.address,
//       expandTo18Decimals(20000),
//       expandTo18Decimals(10000),
//       500
//     );

//     const stakingDetails =
//       await stakingRewardsFactory.stakingRewardsInfoByStakingToken(pairAddress);
//     await mineBlocks(ethers.provider, 600);
//     await stakingRewardsFactory.notifyRewardAmount(pairAddress);
//     stakingDualRewards = await new StakingDualRewards__factory(owner).attach(
//       stakingDetails.stakingRewards
//     );

//     quickSwapStrategyLP = await new QuickSwapStrategyLP__factory(owner).deploy(
//       staking.address,
//       autocompound.address,
//       pairAddress,
//       stakingDualRewards.address,
//       router.address,
//       expandTo18Decimals(1),
//       owner.address,
//       treasury.address
//     );
//     await autocompound.setOperator(quickSwapStrategyLP.address, true);
//   });

//   describe("Deposit LP", async () => {
//     it("Deposit", async () => {
//       await pairInstance.approve(
//         quickSwapStrategyLP.address,
//         expandTo18Decimals(100)
//       );
//       await quickSwapStrategyLP.deposit(expandTo18Decimals(100));
//       const reciptTokens = await quickSwapStrategyLP.balanceOf(owner.address);

//       expect(reciptTokens).to.be.eq(expandTo18Decimals(100));
//       expect(await quickSwapStrategyLP.totalDeposits()).to.be.eq(
//         expandTo18Decimals(100)
//       );
//       expect(
//         (await quickSwapStrategyLP.userInfo(owner.address)).amount
//       ).to.be.eq(expandTo18Decimals(100));
//     });

//     it("Deposit single token", async () => {
//       await USDT.transfer(user1.address, expandTo18Decimals(100));
//       await USDT.connect(user1).approve(
//         quickSwapStrategyLP.address,
//         expandTo18Decimals(100)
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .singleTokenDeposit(expandTo18Decimals(0), USDT.address, 1)
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::singleTokenDeposit: Can not deposit zero amount"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .singleTokenDeposit(expandTo18Decimals(10), USDT.address, 0)
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::singleTokenDeposit: Invalid slippage"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .singleTokenDeposit(expandTo18Decimals(10), USDT.address, 501)
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::singleTokenDeposit: Invalid slippage"
//       );
//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .singleTokenDeposit(expandTo18Decimals(10), WETH.address, 1)
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::singleTokenDeposit: Invalid token address"
//       );

//       const reciptTokensBefore = await quickSwapStrategyLP.balanceOf(
//         user1.address
//       );

//       expect(reciptTokensBefore).to.be.eq("0");

//       await quickSwapStrategyLP
//         .connect(user1)
//         .singleTokenDeposit(expandTo18Decimals(100), USDT.address, 1);

//       const reciptTokensAfter = await quickSwapStrategyLP.balanceOf(
//         user1.address
//       );
//       expect(reciptTokensAfter).to.be.above(reciptTokensBefore);
//     });

//     it("Deposit dual tokens", async () => {
//       await USDT.transfer(user1.address, expandTo18Decimals(100));
//       await USDT.connect(user1).approve(
//         quickSwapStrategyLP.address,
//         expandTo18Decimals(100)
//       );

//       await BUSD.transfer(user1.address, expandTo18Decimals(200));
//       await BUSD.connect(user1).approve(
//         quickSwapStrategyLP.address,
//         expandTo18Decimals(200)
//       );

//       await USDT.connect(user1).approve(
//         quickSwapStrategyLP.address,
//         expandTo18Decimals(100)
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(0),
//             USDT.address,
//             expandTo18Decimals(1),
//             BUSD.address,
//             1
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Can not deposit zero amount"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(1),
//             USDT.address,
//             expandTo18Decimals(0),
//             BUSD.address,
//             1
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Can not deposit zero amount"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(0),
//             USDT.address,
//             expandTo18Decimals(0),
//             BUSD.address,
//             1
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Can not deposit zero amount"
//       );
//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(200),
//             WETH.address,
//             expandTo18Decimals(100),
//             BUSD.address,
//             1
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Invalid token address"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(200),
//             USDT.address,
//             expandTo18Decimals(100),
//             WETH.address,
//             1
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Invalid token address"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(200),
//             USDC.address,
//             expandTo18Decimals(100),
//             WETH.address,
//             1
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Invalid token address"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(200),
//             BUSD.address,
//             expandTo18Decimals(100),
//             USDT.address,
//             0
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Invalid slippage"
//       );

//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .dualTokenDeposit(
//             expandTo18Decimals(200),
//             BUSD.address,
//             expandTo18Decimals(100),
//             USDT.address,
//             501
//           )
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::dualTokenDeposit: Invalid slippage"
//       );

//       const reciptTokensBefore = await quickSwapStrategyLP.balanceOf(
//         user1.address
//       );

//       expect(reciptTokensBefore).to.be.eq("0");

//       await quickSwapStrategyLP
//         .connect(user1)
//         .dualTokenDeposit(
//           expandTo18Decimals(200),
//           BUSD.address,
//           expandTo18Decimals(100),
//           USDT.address,
//           1
//         );

//       expect(await quickSwapStrategyLP.balanceOf(user1.address)).to.be.above(
//         reciptTokensBefore
//       );
//     });

//     it("Reinvest and Withdraw", async () => {
//       await expect(
//         quickSwapStrategyLP.connect(user1).reinvestOps()
//       ).to.be.revertedWith("QuickSwapStrategy::onlyOps: onlyOps");

//       for (let i = 1; i <= 3; i++) {
//         await pairInstance.transfer(
//           signers[i + 1].address,
//           expandTo18Decimals(i * 100)
//         );
//         await pairInstance
//           .connect(signers[i + 1])
//           .approve(quickSwapStrategyLP.address, expandTo18Decimals(i * 100));

//         await quickSwapStrategyLP
//           .connect(signers[i + 1])
//           .deposit(expandTo18Decimals(i * 100));
//         await mineBlocks(ethers.provider, 11);
//         await quickSwapStrategyLP.reinvestOps();
//       }

//       let reciptTokens1: any = await quickSwapStrategyLP.balanceOf(
//         user1.address
//       );
//       reciptTokens1 = reciptTokens1.toString();

//       await expect(
//         quickSwapStrategyLP.connect(user1).withdraw("0")
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::_withdraw: withdraw amount can,t be zero"
//       );
//       await expect(
//         quickSwapStrategyLP.connect(user1).withdraw(expandTo18Decimals(101))
//       ).to.be.revertedWith(
//         "QuickSwapStrategyLP::_withdraw: Cant't withdraw this amount"
//       );

//       await quickSwapStrategyLP.connect(user1).withdraw(reciptTokens1);
//       let reciptTokens2: any = await quickSwapStrategyLP.balanceOf(
//         user2.address
//       );

//       reciptTokens2 = reciptTokens2.toString();
//       await quickSwapStrategyLP.connect(user2).withdraw(reciptTokens2);
//       let reciptTokens3: any = await quickSwapStrategyLP.balanceOf(
//         user3.address
//       );

//       reciptTokens3 = reciptTokens3.toString();

//       await quickSwapStrategyLP.connect(user3).withdraw(reciptTokens3);

//       const incresedLP1 = await pairInstance.balanceOf(user1.address);
//       const incresedLP2 = await pairInstance.balanceOf(user2.address);
//       const incresedLP3 = await pairInstance.balanceOf(user3.address);

//       expect(incresedLP1).to.be.above(expandTo18Decimals(100));
//       expect(incresedLP2).to.be.above(expandTo18Decimals(200));
//       expect(incresedLP3).to.be.above(expandTo18Decimals(300));
//     });

//     it("Dual Withdraw", async () => {
//       for (let i = 1; i <= 3; i++) {
//         await USDT.transfer(
//           signers[i + 1].address,
//           expandTo18Decimals(i * 100)
//         );

//         await BUSD.transfer(
//           signers[i + 1].address,
//           expandTo18Decimals(i * 200)
//         );

//         await BUSD.connect(signers[i + 1]).approve(
//           quickSwapStrategyLP.address,
//           expandTo18Decimals(i * 200)
//         );

//         await USDT.connect(signers[i + 1]).approve(
//           quickSwapStrategyLP.address,
//           expandTo18Decimals(i * 100)
//         );

//         await quickSwapStrategyLP
//           .connect(signers[i + 1])
//           .dualTokenDeposit(
//             expandTo18Decimals(i * 200),
//             BUSD.address,
//             expandTo18Decimals(i * 100),
//             USDT.address,
//             1
//           );
//         await mineBlocks(ethers.provider, 50);
//         await quickSwapStrategyLP.reinvestOps();

//         const reciptTokens = await quickSwapStrategyLP.balanceOf(
//           signers[i + 1].address
//         );

//         await quickSwapStrategyLP
//           .connect(signers[i + 1])
//           .dualWithdraw(reciptTokens);
//       }

//       const user1USDTAfterWithdraw = await USDT.balanceOf(user1.address);
//       const user1BUSDAfterWithdraw = await BUSD.balanceOf(user1.address);

//       const user2USDTAfterWithdraw = await USDT.balanceOf(user2.address);
//       const user2BUSDAfterWithdraw = await BUSD.balanceOf(user2.address);

//       const user3USDTAfterWithdraw = await USDT.balanceOf(user3.address);
//       const user3BUSDAfterWithdraw = await BUSD.balanceOf(user3.address);

//       expect(user1USDTAfterWithdraw).to.be.above(expandTo18Decimals(100));
//       expect(user1BUSDAfterWithdraw).to.be.above(expandTo18Decimals(200));

//       expect(user2USDTAfterWithdraw).to.be.above(expandTo18Decimals(200));
//       expect(user2BUSDAfterWithdraw).to.be.above(expandTo18Decimals(400));

//       expect(user3USDTAfterWithdraw).to.be.above(expandTo18Decimals(300));
//       expect(user3BUSDAfterWithdraw).to.be.above(expandTo18Decimals(600));
//     });

//     it("Single Withdraw", async () => {
//       for (let i = 1; i <= 3; i++) {
//         await USDT.transfer(
//           signers[i + 1].address,
//           expandTo18Decimals(i * 100)
//         );

//         await BUSD.transfer(
//           signers[i + 1].address,
//           expandTo18Decimals(i * 200)
//         );

//         await BUSD.connect(signers[i + 1]).approve(
//           quickSwapStrategyLP.address,
//           expandTo18Decimals(i * 200)
//         );

//         await USDT.connect(signers[i + 1]).approve(
//           quickSwapStrategyLP.address,
//           expandTo18Decimals(i * 100)
//         );

//         await quickSwapStrategyLP
//           .connect(signers[i + 1])
//           .dualTokenDeposit(
//             expandTo18Decimals(i * 200),
//             BUSD.address,
//             expandTo18Decimals(i * 100),
//             USDT.address,
//             1
//           );

//         await mineBlocks(ethers.provider, 50);
//         await quickSwapStrategyLP.reinvestOps();

//         const reciptTokens = await quickSwapStrategyLP.balanceOf(
//           signers[i + 1].address
//         );

//         await quickSwapStrategyLP
//           .connect(signers[i + 1])
//           .singleWithdraw(reciptTokens, BUSD.address);
//       }

//       const BUSDAfterWithdraw1 = await BUSD.balanceOf(user1.address);
//       const BUSDAfterWithdraw2 = await BUSD.balanceOf(user2.address);
//       const BUSDAfterWithdraw3 = await BUSD.balanceOf(user3.address);

//       expect(BUSDAfterWithdraw1).to.be.above(expandTo18Decimals(200));
//       expect(BUSDAfterWithdraw2).to.be.above(expandTo18Decimals(400));
//       expect(BUSDAfterWithdraw3).to.be.above(expandTo18Decimals(600));
//     });

//     it("Revoke Allownace", async () => {
//       let allowance = await pairInstance.allowance(
//         quickSwapStrategyLP.address,
//         stakingDualRewards.address
//       );
//       expect(allowance).to.be.above("0");
//       await quickSwapStrategyLP.revokeAllowance(
//         pairAddress,
//         stakingDualRewards.address
//       );
//       allowance = await pairInstance.allowance(
//         quickSwapStrategyLP.address,
//         stakingDualRewards.address
//       );
//       expect(allowance).to.be.eq("0");
//     });

//     it("Set Allownace", async () => {
//       await expect(
//         quickSwapStrategyLP
//           .connect(user1)
//           .revokeAllowance(pairAddress, stakingDualRewards.address)
//       ).to.be.revertedWith("Ownable: caller is not the owner");

//       let allowance = await pairInstance.allowance(
//         quickSwapStrategyLP.address,
//         stakingDualRewards.address
//       );
//       expect(allowance).to.be.above("0");
//       await quickSwapStrategyLP.revokeAllowance(
//         pairAddress,
//         stakingDualRewards.address
//       );
//       allowance = await pairInstance.allowance(
//         quickSwapStrategyLP.address,
//         stakingDualRewards.address
//       );
//       expect(allowance).to.be.eq("0");

//       await quickSwapStrategyLP.setAllowances();
//       allowance = await pairInstance.allowance(
//         quickSwapStrategyLP.address,
//         stakingDualRewards.address
//       );
//       expect(allowance).to.be.above("0");
//     });

//     it("Udate Admin Fees", async () => {
//       await expect(quickSwapStrategyLP.updateAdminFee("81")).to.be.revertedWith(
//         "QuickSwapStrategy::updateAdminFee: admin fee too high"
//       );
//       await quickSwapStrategyLP.updateAdminFee(30);
//       const updatedFee = await quickSwapStrategyLP.ADMIN_FEE_BIPS();
//       expect(updatedFee).to.be.eq(30);
//     });

//     it("Update reinvest before deposit", async () => {
//       await quickSwapStrategyLP.updateRequireReinvestBeforeDeposit();
//       const param = await quickSwapStrategyLP.REQUIRE_REINVEST_BEFORE_DEPOSIT();
//       expect(param).to.be.eq(true);
//     });

//     it("Recover ERC20", async () => {
//       expect(await USDT.balanceOf(quickSwapStrategyLP.address)).to.be.eq("0");
//       await USDT.transfer(quickSwapStrategyLP.address, expandTo18Decimals(100));

//       expect(await USDT.balanceOf(quickSwapStrategyLP.address)).to.be.eq(
//         expandTo18Decimals(100)
//       );
//       const prevBalance = await USDT.balanceOf(owner.address);
//       await quickSwapStrategyLP.recoverERC20(
//         USDT.address,
//         expandTo18Decimals(10)
//       );
//       expect(await USDT.balanceOf(owner.address)).to.be.above(prevBalance);
//     });

//     it("Update Multiplier", async () => {
//       await quickSwapStrategyLP.updateMultiplier(50);
//       expect(await quickSwapStrategyLP.BONUS_MULTIPLIER()).to.be.eq(50);
//     });

//     it("Update Autocompound per block", async () => {
//       await quickSwapStrategyLP.updateAutoCompoundTokenPerBlock(
//         expandTo18Decimals(50)
//       );
//       expect(await quickSwapStrategyLP.autoCompoundTokenPerBlock()).to.be.eq(
//         expandTo18Decimals(50)
//       );
//     });

//     it  ("Recover Native asset", async () => {
//       expect(
//         await ethers.provider.getBalance(quickSwapStrategyLP.address)
//       ).to.be.eq("0");

//       let tx = {
//         to: quickSwapStrategyLP.address,
//         value: ethers.utils.parseEther("10"),
//       };
//       await owner.sendTransaction(tx);

//       expect(
//         await ethers.provider.getBalance(quickSwapStrategyLP.address)
//       ).to.be.eq(expandTo18Decimals(10));
//       const prevBalance = await ethers.provider.getBalance(owner.address);
//       await quickSwapStrategyLP.recoverNativeAsset(expandTo18Decimals(10));
//       expect(await ethers.provider.getBalance(owner.address)).to.be.above(
//         prevBalance
//       );
//     });
//   });
// });
