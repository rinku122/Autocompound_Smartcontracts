import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  CakeToken__factory,
  MasterChef__factory,
  SyrupBar__factory,
  UniswapV2Factory__factory,
  UniswapV2Router02__factory,
  UniswapV2Pair__factory,
  BUSD__factory,
  Autocompound__factory,
} from "../typechain";
import { expandTo18Decimals } from "../utilities/utilities";

let contract: any;

export const tokenInstance = (token: string, owner: SignerWithAddress) => {
  contract = new BUSD__factory(owner).attach(token);
  return contract;
};

export const routerInstance = (router: string, owner: SignerWithAddress) => {
  contract = new UniswapV2Router02__factory(owner).attach(router);
  return contract;
};

export const factoryInstance = (factory: string, owner: SignerWithAddress) => {
  contract = new UniswapV2Factory__factory(owner).attach(factory);
  return contract;
};

export const pairInstance = (pair: string, owner: SignerWithAddress) => {
  contract = new UniswapV2Pair__factory(owner).attach(pair);
  return contract;
};

export const masterChefInstance = (
  masterChef: string,
  owner: SignerWithAddress
) => {
  contract = new MasterChef__factory(owner).attach(masterChef);
  return contract;
};

export const autoCompoundInstance = (
  autocompound: string,
  owner: SignerWithAddress
) => {
  contract = new Autocompound__factory(owner).attach(autocompound);
  return contract;
};

export const syrupbarInstance = (
  syrupBar: string,
  owner: SignerWithAddress
) => {
  contract = new SyrupBar__factory(owner).attach(syrupBar);
  return contract;
};

export const cakeInstance = (cake: string, owner: SignerWithAddress) => {
  contract = new CakeToken__factory(owner).attach(cake);
  return contract;
};

export const addLiquidity = async (
  owner: SignerWithAddress,
  tokenA: string,
  tokenB: string,
  _router: string,
  amountA: BigNumber,
  amountB: BigNumber,
  amountAslippage: BigNumber,
  amountBslippage: BigNumber
) => {
  const router = routerInstance(_router, owner);

  let r: any = await router
    .connect(owner)
    .addLiquidity(
      tokenA,
      tokenB,
      amountA,
      amountB,
      amountAslippage,
      amountBslippage,
      owner.address,
      1661664320
    );
};

export const addLiquidityETH = async (
  owner: SignerWithAddress,
  token: string,
  _router: string,
  tokenAmount: BigNumber,
  ETHAmount: string,
  tokenlippage: BigNumber,
  Ethslippage: BigNumber
) => {
  const router = routerInstance(_router, owner);
  let value: any = ethers.utils.parseEther(ETHAmount);
  let r = await router
    .connect(owner)
    .addLiquidityETH(
      token,
      tokenAmount,
      tokenlippage,
      Ethslippage,
      owner.address,
      1661664320,
      { value }
    );
};
