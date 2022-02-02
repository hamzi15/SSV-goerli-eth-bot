require('dotenv').config({path: '../.env'})
const abiDecoder = require('abi-decoder');
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_HTTPS_ENDPOINT));
const Discord = require('discord.js');
const db = require('./db');
const contractABI = require('../contract-abi.json');
const { getGasPrice } = require('./api');

abiDecoder.addABI(contractABI);
const maxTries = 1;
var count = 0;

// Eth
exports.getAddressTransactionCount = async (address) => {
  const nonce = await web3.eth.getTransactionCount(address);
  console.log('Intialized nonce:', nonce);
  return nonce;
}

exports.getAddressBalance = async (address) => {
  const balanceWei = await web3.eth.getBalance(address);
  return web3.utils.fromWei(balanceWei);
}


// Math
exports.incrementHexNumber = (hex) => {
  var intNonce = parseInt(hex, 16) + 1;
  var intIncrementedNonce = parseInt(intNonce, 10);
  var hexIncrementedNonce = '0x'+ intIncrementedNonce.toString(16);

  return hexIncrementedNonce;
}


// Nonce caching
exports.getCachedNonce = () => {
  return fs.readFileSync(process.env.NONCE_FILE, 'utf8');
}

exports.incrementCachedNonce = async () => {
  const currentNonce = this.getCachedNonce();
  const incrementedNonce = this.incrementHexNumber(currentNonce);
  console.log("Increment count",count++);
  this.setCachedNonce(incrementedNonce);
}

exports.initializeCachedNonce = async () => {
  const intNextNonceToUse = await this.getAddressTransactionCount(process.env.FAUCET_ADDRESS);
  const hexNextNonceToUse = '0x'+ intNextNonceToUse.toString(16);

  this.setCachedNonce(hexNextNonceToUse);
}

exports.setCachedNonce = (nonce) => {
  fs.writeFile(process.env.NONCE_FILE, nonce, function (err){
    if (err) throw err;
  })
}

exports.getNonce = async () => {
    return await web3.eth.getTransactionCount(process.env.FAUCET_ADDRESS, 'pending'); // nonce starts counting from 0
}

// Sending the goerli ETH
exports.sendGoerliEth = (prevMsg, message, methodAbi, amount, nonce, latestGasPrice) => {
  console.log("Inside sendGoerliETH sending tx...")
  console.log('gasPrice:', latestGasPrice)
  console.log('Nonce', nonce)

  const transaction = {
    from: process.env.FAUCET_ADDRESS,
    to: process.env.CONTRACT_ADDRESS,
    gas: 300000,
    value: web3.utils.numberToHex(web3.utils.toWei(amount.toString(), 'ether')),
    data: methodAbi,
    gasPrice: latestGasPrice,
    chainID: 5,
    nonce,
  }

  let embed = new Discord.MessageEmbed()

  return web3.eth.accounts.signTransaction(transaction, process.env.FAUCET_PRIVATE_KEY)
          .then(signedTx => web3.eth.sendSignedTransaction(signedTx.rawTransaction))
          .then(receipt => {
              console.log("Sent to " + message.author.id + "nonce:" + nonce + " transaction receipt: ", receipt)

              if (message) {
                embed.setDescription(`**Operation Successful**\nSent **${32} goerli ETH** to <@!${message.author.id}> - please wait a few minutes for it to arrive. To check the details at **etherscan.io**, click [here](https://goerli.etherscan.io/tx/${receipt.transactionHash})`)
                    .setTimestamp().setColor(3447003);   //.setURL("https://goerli.etherscan.io/tx/" + receipt.transactionHash)
                prevMsg.edit(embed);
              }
              count = 0;
          })
          .catch(err => {
            console.log(typeof err);
            console.error(err);
            if (count !== maxTries ) {
              this.getNonce()
                .then( nonce => this.sendGoerliEth(prevMsg, message, methodAbi, amount, nonce, latestGasPrice))
              count += 1
            } else {
              if (message) {
                embed.setDescription(`**Transaction failed**\nPlease try again.`)
                    .setTimestamp().setColor(3447003);   //.setURL("https://goerli.etherscan.io/tx/" + receipt.transactionHash)
                prevMsg.edit(embed);
              }
            }

          });
}


// Validate faucet
exports.faucetIsReady = async (faucetAddress, amountRequested) => {
  const faucetBalance = await this.getAddressBalance(faucetAddress);
  console.log("Faucet Balance:",faucetBalance);
  const faucetBalanceNumber = Number(faucetBalance);
  const amountRequestedNumber = Number(amountRequested);
  return faucetBalanceNumber > amountRequestedNumber;
}

/*
try {
  const decodedHexData = abiDecoder.decodeMethod(methodAbi);
  const pubKey = decodedHexData.params[0].value;
  db.addLog(message.author.id, message.author.username, pubKey,`https://goerli.etherscan.io/tx/${receipt.transactionHash}`, JSON.stringify(decodedHexData))
      .then(result => {
        if (result === true) console.log("Tx Logged");
        else  console.error('Tx log failed');
      })
} catch (e) {
  console.log("Counld not log transaction.");
}*/