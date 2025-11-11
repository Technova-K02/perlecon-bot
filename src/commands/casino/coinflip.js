const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

module.exports = {
  name: 'toss',
  description: 'Bet coins on a toss',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet)) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        ' '
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

    const win = Math.random() < 0.3;
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
      description: `Toss: ${result} - ${win ? 'Won' : 'Lost'} ${bet} coins`
    });
    await transaction.save();

    // Log casino activity
    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'toss',
      betAmount: bet,
      result: win ? 'win' : 'lose',
      payout: win ? bet*2 : 0
    });
    await casinoLog.save();

    const resultEmbed = win
      ? embeds.success(
        '**Toss**', `You Won **${economy.formatMoney(bet * 2)}**.`
        // `The coin landed on **${result}**\nYou won **${} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        '**Toss**', 'You Lost',
        // `The coin landed on **${result}**\nYou lost **${economy.formatMoney(bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};




