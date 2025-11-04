const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

module.exports = {
  name: 'dice',
  description: 'Roll dice and bet on the outcome',
  async execute(msg, args) {
    if (args.length < 2) {
      const helpEmbed = embeds.info(
        'Dice Help',
        '**Usage:** `dice <amount> <prediction>`\n\n**Predictions:**\n' +
        '• **Exact number:** 2-12 (10:1 payout)\n' +
        '• **High:** 8-12 (1:1 payout)\n' +
        '• **Low:** 2-6 (1:1 payout)\n' +
        '• **Even:** Even numbers (1:1 payout)\n' +
        '• **Odd:** Odd numbers (1:1 payout)\n' +
        '• **Double:** Same number on both dice (5:1 payout)\n\n' +
        '**Examples:**\n`dice 100 7`\n`dice 50 high`\n`dice 200 double`'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const betAmount = parseInt(args[0]);
    const prediction = args[1].toLowerCase();

    if (isNaN(betAmount) || betAmount <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet Amount',
        'Please enter a valid bet amount'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const user = await economy.getUser(msg.author.id);
    if (user.pocket < betAmount) {
      const errorEmbed = embeds.error(
        'Insufficient Funds',
        `You only have ${economy.formatMoney(user.pocket)} coins in your pocket`
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // Roll two dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    let win = false;
    let multiplier = 0;
    let resultText = '';

    // Check prediction
    const exactNumber = parseInt(prediction);
    if (!isNaN(exactNumber) && exactNumber >= 2 && exactNumber <= 12) {
      if (total === exactNumber) {
        win = true;
        multiplier = 10;
        resultText = `Exact match! You predicted ${exactNumber}`;
      } else {
        resultText = `You predicted ${exactNumber} but rolled ${total}`;
      }
    } else {
      switch (prediction) {
        case 'high':
          if (total >= 8) {
            win = true;
            multiplier = 1;
            resultText = 'High roll wins';
          } else {
            resultText = 'Low roll, you needed 8 or higher';
          }
          break;
        case 'low':
          if (total <= 6) {
            win = true;
            multiplier = 1;
            resultText = 'Low roll wins';
          } else {
            resultText = 'High roll, you needed 6 or lower';
          }
          break;
        case 'even':
          if (total % 2 === 0) {
            win = true;
            multiplier = 1;
            resultText = 'Even number wins';
          } else {
            resultText = 'Odd number, you needed even';
          }
          break;
        case 'odd':
          if (total % 2 === 1) {
            win = true;
            multiplier = 1;
            resultText = 'Odd number wins';
          } else {
            resultText = 'Even number, you needed odd';
          }
          break;
        case 'double':
          if (die1 === die2) {
            win = true;
            multiplier = 5;
            resultText = `Double ${die1}s! Lucky roll`;
          } else {
            resultText = 'No double, you needed matching dice';
          }
          break;
        default:
          const errorEmbed = embeds.error(
            'Invalid Prediction',
            'Please use a valid prediction. Use `dice` without arguments for help'
          );
          return msg.channel.send({ embeds: [errorEmbed] });
      }
    }

    const result = win ? 'win' : 'lose';
    const payout = win ? betAmount * (multiplier + 1) : 0;

    // Update user balance
    let updatedUser;
    if (result === 'win') {
      updatedUser = await economy.addMoney(msg.author.id, payout - betAmount, 'luck');
    } else {
      updatedUser = await economy.removeMoney(msg.author.id, betAmount, 'luck');
    }

    // Log transaction and casino activity
    const transaction = new Transaction({
      from: result === 'win' ? null : msg.author.id,
      to: result === 'win' ? msg.author.id : null,
      amount: result === 'win' ? payout - betAmount : betAmount,
      type: 'luck',
      description: `Dice: ${die1}+${die2}=${total} (${prediction}) - ${result === 'win' ? 'Won' : 'Lost'} ${betAmount} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'dice',
      betAmount,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const die1Emoji = diceEmojis[die1 - 1];
    const die2Emoji = diceEmojis[die2 - 1];

    const resultEmbed = result === 'win'
      ? embeds.success(
        'Dice - You Won',
        `**Roll:** ${die1Emoji} ${die2Emoji} = **${total}**\n**Your Prediction:** ${prediction}\n**Multiplier:** ${multiplier}:1\n\n${resultText}\nYou won **${economy.formatMoney(payout - betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        'Dice - You Lost',
        `**Roll:** ${die1Emoji} ${die2Emoji} = **${total}**\n**Your Prediction:** ${prediction}\n\n${resultText}\nYou lost **${economy.formatMoney(betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
