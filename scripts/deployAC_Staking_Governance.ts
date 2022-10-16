import deloyAutoCompound from "./autocompound";
import deployStaking from "./staking";
import deployGovernance from "./governance";

async function main() {
  try {
    const autocompound = await deloyAutoCompound();
    const staking = await deployStaking(autocompound.address);
    const governanceDetails = await deployGovernance(staking.address);
    const { governance, timelock } = governanceDetails;
    console.log("Autocompound:", autocompound.address);
    console.log("Staking:", staking.address);
    console.log("Governance:", governance.address);
    console.log("Timelock:", timelock.address);
  } catch (error) {
    console.log("AC_Staking_Governance Error : ", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
