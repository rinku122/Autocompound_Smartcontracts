import deloyAutoCompound from "./autocompound";
import deployStaking from "./staking";

async function main() {
  try {
    const autocompound = await deloyAutoCompound();
    const staking = await deployStaking(autocompound.address);
    console.log("Autocompound:", autocompound.address);
    console.log("Staking:", staking.address);
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
