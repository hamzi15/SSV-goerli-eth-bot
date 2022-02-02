require('dotenv').config();
require('./db');

const Discord = require('discord.js')
const goerliBot = require('./goerliBot.js');
require('discord-reply');
const bot = new Discord.Client();
const web3 = require('web3');


const adminID = [ 695568381591683162, 636950487089938462, 844110609142513675, 724238721028980756, 135786298844774400,
                  743373378672656445, 419238541009092650 ]
const COMMAND_PREFIX = '+goerlieth';
const EMBEDDED_HELP_MESSAGE = new Discord.MessageEmbed().setTitle('SSV Goerli Deposit Bot').setColor(3447003)
    .setDescription("Welcome to the Deposit Bot for **ssv.network Incentivezed Testnet**.\nThis **BOT** will make a **32 goerli** deposit to your validator.\n\n**BOT rules:**\n**1.**\nOne message can be sent every 6 hours, please make sure to read and understand how the bot works before you continue.\n**2.**\n Each user is entitled to 1 deposit per 24 hours.\n**3.**\nTrying to abuse the bot will result in a **ban**, **disqualification** from the testnet and **block**.\n\n**To generate HEX data for your deposit:**\n**1.**\nGet to the validator deposit stage on: https://prater.launchpad.ethereum.org/en/overview and change `disabled` to `enabled` by `inspecting` the button (on the launchpad page)https://i.imgur.com/izYw5QU.gif\n**2.**\n On the send deposit page - once Metamask is open, open the Data page and copy the Hex Data. https://i.imgur.com/2XGOT9H.gif. Now move to Discord Bot Channel.\n\n**Guide:**")
    .addField("+goerlieth <address> <hex-data>", 'To start you need to register the **wallet address** you used to generate the **hex** and the **hex** itself.')
    .addField("+goerlieth help", 'Help with the bot.')
    .addField("+goerlieth mod", "Ping the admins for help if the **BOT** is malfunctioning (spamming this will result in a **BAN**)")

bot.on('ready', async function() {
  console.log('I am ready!');
});

bot.on('message', async function (message) {
  try {
    if (!message || message.content.length === 0 || message.content.substring(0, COMMAND_PREFIX.length) !== COMMAND_PREFIX) {
      return;
    }

    let embed = new Discord.MessageEmbed()

    const args = (message.content.substring(COMMAND_PREFIX.length).split(/ |\n/)).filter(n=>n)

    if (args[0] && args[1] && args[0].startsWith('0x') && args[1].startsWith('0x')){
      const isAddress = web3.utils.isAddress(args[0]);
      const isHex = web3.utils.isHexStrict(args[1]);
      if (isHex && isAddress){
        if (adminID.includes(Number(message.author.id))){
          await goerliBot.runGoerliFaucet(message, args[0], args[1], false);
        }else{
          await goerliBot.runGoerliFaucet(message, args[0], args[1]);
        }
        return
      } else if(!isAddress){
        embed.setDescription('**Error**\nInvalid `Address`.')
            .setColor(0xff1100).setTimestamp();
        await message.lineReply(embed);
        return;
      } else if (!isHex){
        embed.setDescription('**Error**\nInvalid `Hex`.')
            .setColor(0xff1100).setTimestamp();
        await message.lineReply(embed);
        return
      }else{
        embed.setDescription('**Error**\nUnknown error occurred.')
            .setColor(0xff1100).setTimestamp();
        await message.lineReply(embed);
        return
      }
    } else if (!args[0]){
      embed.setDescription('**Error**\nNo arguments provided. Please check the guide.')
          .setColor(0xff1100).setTimestamp();
      await message.lineReply(embed);
      return
    }else if (!args[1]){
      if (args[0] && web3.utils.isHex(args[0])){
        embed.setDescription('**Error**\nInvalid number of arguments. Please provide your `address` **first** then your `hex`.')
            .setColor(0xff1100).setTimestamp();
        await message.lineReply(embed);
        return
      }else if (args[0] && web3.utils.isAddress(args[0])){
        embed.setDescription('**Error**\nInvalid number of arguments. Please provide your `hex` **after** the `address`.')
            .setColor(0xff1100).setTimestamp();
        await message.lineReply(embed);
        return
      }
    }

    switch(args[0]){
      // Other commands
      case 'help': {
        console.log("help called");
        const attachment = new Discord.MessageAttachment('./src/img.png', 'img.png');
        EMBEDDED_HELP_MESSAGE.attachFiles(attachment).setImage('attachment://img.png');
        await message.lineReply(EMBEDDED_HELP_MESSAGE);
        break;
      }
      case 'mod': {
        // Tag the moderators
        console.log("mod called");
        // Uncomment below and add discord ids if you'd like to be tagged
        embed.setDescription('**Alerting the Administrators**\n <@&723840404159594496> come check this out!')
            .setColor(3447003).setTimestamp();
        await message.lineReply(embed);
        break;
      }
        // For fun :)
      case 'dance': {
        console.log("dance called");
        embed.setImage('https://c.tenor.com/fJh-W38iA3oAAAAM/dance-kid.gif').setColor(3447003).setTimestamp();
        await message.lineReply(embed);
        break;
      }
    }
  } catch (e) {
    console.log(e);
    let embed = new Discord.MessageEmbed().setDescription('**Error**\nSomething went wrong. If this continues,' +
        ' please contact the mods of this bot by using command: `!mod`').setColor(0xff1100).setTimestamp();
    await message.lineReply(embed);
  }
});


bot.login(process.env.DISCORD_BOT_TOKEN);
