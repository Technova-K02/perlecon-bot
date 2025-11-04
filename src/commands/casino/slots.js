const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
const payouts = {
  '🍒🍒🍒': 5,
  '🍋🍋🍋': 10,
  '🍊🍊🍊': 15,
  '🍇🍇🍇': 20,
  '⭐⭐⭐': 50,
  '💎💎💎': 100,
  '7️⃣7️⃣7️⃣': 777
};

function spinReels() {
  return [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];
}

function calculatePayout(reels, betAmount) {
  const combination = reels.join('');

  // Check for exact matches
  if (payouts[combination]) {
    return betAmount * payouts[combination];
  }

  // Check for two matching symbols
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    const matchingSymbol = reels[0] === reels[1] ? reels[0] :
      reels[1] === reels[2] ? reels[1] : reels[0];

    // Small payout for two matches
    switch (matchingSymbol) {
      case '🍒': return Math.floor(betAmount * 0.5);
      case '🍋': return Math.floor(betAmount * 0.8);
      case '🍊': return Math.floor(betAmount * 1.2);
      case '🍇': return Math.floor(betAmount * 1.5);
      case '⭐': return Math.floor(betAmount * 2);
      case '💎': return Math.floor(betAmount * 3);
      case '7️⃣': return Math.floor(betAmount * 5);
    }
  }

  return 0;
}

module.exports = {
  name: 'slots',
  description: 'Play the slot machine',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        'Usage: `slots <amount>`\nExample: `slots 100`'
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

    const reels = spinReels();
    const payout = calculatePayout(reels, bet);
    const result = payout > 0 ? 'win' : 'lose';

    // Update user balance
    let updatedUser;
    if (result === 'win') {
      updatedUser = await economy.addMoney(msg.author.id, payout - bet, 'luck');
    } else {
      updatedUser = await economy.removeMoney(msg.author.id, bet, 'luck');
    }

    // Log transaction and casino activity
    const transaction = new Transaction({
      from: result === 'win' ? null : msg.author.id,
      to: result === 'win' ? msg.author.id : null,
      amount: result === 'win' ? payout - bet : bet,
      type: 'luck',
      description: `Slots: ${reels.join('')} - ${result === 'win' ? 'Won' : 'Lost'} ${bet} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'slots',
      betAmount: bet,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const slotsDisplay = `${reels[0]} | ${reels[1]} | ${reels[2]}`;

    let payoutInfo = '';
    if (result === 'win') {
      const combination = reels.join('');
      if (payouts[combination]) {
        payoutInfo = `\n**Jackpot!** ${payouts[combination]}x multiplier`;
      } else {
        payoutInfo = `\n**Match!** Partial win`;
      }
    }

    const resultEmbed = result === 'win'
      ? embeds.success(
        'Slots - You Won',
        `${slotsDisplay}${payoutInfo}\n\nYou won **${economy.formatMoney(payout)} coins**\n`
      )
      : embeds.error(
        'Slots - You Lost',
        `${slotsDisplay}\n\nYou lost **${economy.formatMoney(bet)} coins**\n`
      );

    // Add payout table to help
    // if (Math.random() < 0.1) { // 10% chance to show payout table
    //   resultEmbed.addFields({
    //     name: '💰 Payout Table',
    //     value: '🍒🍒🍒 = 5x\n🍋🍋🍋 = 10x\n🍊🍊🍊 = 15x\n🍇🍇🍇 = 20x\n⭐⭐⭐ = 50x\n💎💎💎 = 100x\n7️⃣7️⃣7️⃣ = 777x',
    //     inline: true
    //   });
    // }

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
