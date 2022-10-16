import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import yesno from "yesno";

const abi = require("ethereumjs-abi");
const AbiCoder = ethers.utils.AbiCoder;
const ADDRESS_PREFIX_REGEX = /^(41)/;

export async function mineBlocks(
  provider: typeof ethers.provider,
  count: number
): Promise<void> {
  for (let i = 1; i < count; i++) {
    await provider.send("evm_mine", []);
  }
}

export function expandTo30Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(30));
}

export function expandTo17Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(17));
}

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

export function expandTo6Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(6));
}

export type FunctionParams = { type: string; value: any };
