import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-typechain";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";

import dotenv from "dotenv";
dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

export default {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [`${process.env.PRIVATE_KEY_POLYGON}`],
    },

    MumbaiTestnet: {
      url: "https://rpc-mumbai.maticvigil.com/",
      chainId: 80001,
      accounts: [`${process.env.PRIVATE_KEY_MUMBAI_TESTNET}`],
    },

    SmartChain: {
      url: process.env.BINANCE_DEPLOY_RPC,
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [`${process.env.PRIVATE_KEY_POLYGON}`],
    },

    Polygon: {
      url: process.env.ALCHEMY_URL_POLYGON,
      accounts: [`${process.env.PRIVATE_KEY_POLYGON}`],
    },

    hardhat: {
      // accounts: {
      //   mnemonic: process.env.TESTNET_MNEMONIC,
      //   count: 1500,
      // },
      forking: {
        url: process.env.BINANCE_RPC,
        // blockNumber: 19649729,
      },
      // chainId: 1337,
      // gas: 10000000,
      // blockGasLimit: 10000000,
      // allowUnlimitedContractSize: true,
    },
  },
  etherscan: {
    apiKey: process.env.BINANCE_API,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  gasReporter: {
    enabled: false,
  },
  mocha: {
    timeout: 2000000,
  },
};
