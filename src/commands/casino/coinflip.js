const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');

module.exports = {
  name: 'coinflip',
  description: 'Bet coins on a coinflip',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 5000) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        'Usage: `coinflip <amount>`\nExample: `coinflip 100`'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const user = await economy.getUser(msg.author.id);
    if (user.pocket < bet) {
      const errorEmbed = embeds.error(
        'Insufficient Funds',
        `You only have ${economy.formatMoney(user.pocket)} coins in your pocket`
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const win = Math.random() < 0.5;
    const result = win ? 'heads' : 'tails';

    let updatedUser;
    if (win) {
      // Add winnings
      updatedUser = await economy.addMoney(msg.author.id, bet, 'luck');
    } else {
      // Remove bet amount
      updatedUser = await economy.removeMoney(msg.author.id, bet, 'luck');
    }

    // Log the luck transaction with details
    const transaction = new Transaction({
      from: win ? null : msg.author.id,
      to: win ? msg.author.id : null,
      amount: bet,
      type: 'luck',
      description: `Coinflip: ${result} - ${win ? 'Won' : 'Lost'} ${bet} coins`
    });
    await transaction.save();

    const resultEmbed = win
      ? embeds.success(
        '**Coinflip**', `You Won **${economy.formatMoney(bet*2)}**.`
        // `The coin landed on **${result}**\nYou won **${} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        '**Coinflip**', 'You Lost',
        // `The coin landed on **${result}**\nYou lost **${economy.formatMoney(bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};




