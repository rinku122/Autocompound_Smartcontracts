const hre = require("hardhat");

async function main() {
  await hre.run("verify:verify", {
    //Deployed contract address
    address: "0x42cfAE50112158F11E47cc412dF76e6A1eA92685",
    //Pass arguments as string and comma seprated values
    constructorArguments: [
      "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      "0xEa26B78255Df2bBC31C1eBf60010D78670185bD0",
      "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      "0xa5f8c5dbd5f286960b9d90548680ae5ebff07652",
      "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      "44",
      "0x527a819db1eb0e34426297b03bae11F2f8B3A19E",
      "0xd31bd4a472bb72e1357912027c5923e4f69099ba",
    ],
    //Path of your main contract.
    contract:
      "contracts/Strategies/MasterChefStrategyLP.sol:MasterChefStrategyLP",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
//npx hardhat run --network rinkeby  scripts/verify.ts
//"contracts/upgradeability/OwnedUpgradeabilityProxy.sol:OwnedUpgradeabilityProxy",
//"contracts/OZV0.sol:OZV0",
