require('dotenv').config();

const utils = require('./utils.js');
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_HTTPS_ENDPOINT));


const DEFAULT_GAS_PRICE = 1500000000000; // 1,500 gwei

const INELIGIBLE_NO_CUSTOM_CHECKS_MESSAGE = " is ineligible to receive goerli eth.";
const INELIGIBLE_CUSTOM_CHECKS_MESSAGE = " is ineligible to receive goerli eth.  You must pass the custom checks;";

<<<<<<< Updated upstream
// Implement any custom eligibility requirements here
const runCustomEligibilityChecks = async (address) => {
  // implement custom checks here
  return true;
=======
const maxDepositAmount = 1000000000000000 //Maximum amount of GoETH a user can have



// Implement any custom eligibility requirements here
const runCustomEligibilityChecks = async (address) => {
  // implement custom checks here
  const currentBalance = await etherscan.getBalance(address);   //current user balance
  const topUpAmount = maxDepositAmount - (currentBalance);
  console.log('topUpAmount:',topUpAmount);
  console.log('currentBalance:',currentBalance);
  if(topUpAmount <= 0 ){
    return false;                                             //if topUpAmount is less than or equal to 0 reject tx
  }
  console.log('TopUpAmount');  
  const result = await db.confirmTransaction(address, topUpAmount/Math.pow(10,18));
  console.log("Return of confirm transaction: ",result);
  return result; //result
>>>>>>> Stashed changes
}

const receiverIsEligible = async (address, amountRequested, runCustomChecks)  => {
  const walletBalance = await utils.getAddressBalance(address);
  console.log(walletBalance);
  //const needsGoerliEth = walletBalance < amountRequested;
  const needsGoerliEth = true;
  console.log(needsGoerliEth);
  if (runCustomChecks) {
    const passedCustomChecks = await runCustomEligibilityChecks(address);

    return needsGoerliEth && passedCustomChecks;
  } else {
    return needsGoerliEth;
  }
}

const runGoerliFaucet = async (message, address, amount, runCustomChecks) => {
  console.log("address " + address + " is requesting " + amount + " goerli eth.  Custom checks: " + runCustomChecks);

  // Make sure the bot has enough Goerli ETH to send
  const faucetReady = await utils.faucetIsReady(process.env.FAUCET_ADDRESS, amount);
  if (!faucetReady) {
    console.log("Faucet does not have enough ETH.");

    if (message) {
      message.channel.send("The Bot does not have enough Goerli ETH.  Please contact the maintainers.");
    }

    return;
  }

const receiverEligible = await receiverIsEligible(address, amount, runCustomChecks);
  if (!receiverEligible) {
    const m = runCustomChecks ? address + INELIGIBLE_CUSTOM_CHECKS_MESSAGE
      : address + INELIGIBLE_NO_CUSTOM_CHECKS_MESSAGE;

    console.log(m);

    if (message) {
      message.channel.send(m);
    }

    return;
  }

  // Good to go - lets send it
  console.log("Checks passed - sending to " +  address);
  if (message) {
    message.channel.send("Checks passed - sending...");
  }

  const nonce = utils.getCachedNonce();
  utils.sendGoerliEth(message, process.env.FAUCET_ADDRESS, process.env.FAUCET_PRIVATE_KEY, address, amount, nonce, DEFAULT_GAS_PRICE);
  
  utils.incrementCachedNonce();
}

// This runs once when imported (bot starting) to cache the nonce in a local file
utils.initializeCachedNonce();

module.exports = {
  name: 'goerliBot',
  description: 'Sends goerli eth to the user.',
  execute(message, args, amount, runCustomChecks = false) {
    runGoerliFaucet(message, args[1], amount, runCustomChecks);
  }
}

/* Test Zone */

utils.initializeCachedNonce();
<<<<<<< Updated upstream
 runGoerliFaucet(null, "0x066Adead2d82A1C2700b4B48ee82ec952b6b18dA", 0.01, false);
=======
//runGoerliFaucet(null, "0x066Adead2d82A1C2700b4B48ee82ec952b6b18dA", 0.001, true);
//hello
>>>>>>> Stashed changes
//runGoerliFaucet(null, "0x066Adead2d82A1C2700b4B48ee82ec952b6b18dA", 20, false);
