const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

// Symbol weights based on probability (chance per reel)
const symbolWeights = [
  { symbol: '🍒', weight: 18 },  // 18%
  { symbol: '🍊', weight: 12 },  // 12%
  { symbol: '🍋', weight: 8 },   // 8%
  { symbol: '🍇', weight: 5 },   // 5%
  { symbol: '⭐', weight: 2.5 }, // 2.5%
  { symbol: '💎', weight: 1.2 }, // 1.2%
  { symbol: '7️⃣', weight: 0.6 }  // 0.6%
];

// Payouts for 3-match and 2-match combinations
const payouts = {
  '🍒🍒🍒': 2,
  '🍊🍊🍊': 3,
  '🍋🍋🍋': 6,
  '🍇🍇🍇': 10,
  '⭐⭐⭐': 20,
  '💎💎💎': 50,
  '7️⃣7️⃣7️⃣': 250
};

const twoMatchPayouts = {
  '🍒': 1.0,
  '🍊': 1.3,
  '🍋': 1.6,
  '🍇': 2.0,
  '⭐': 2.8,
  '💎': 3.2,
  '7️⃣': 4.0
};

function getWeightedSymbol() {
  const totalWeight = symbolWeights.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of symbolWeights) {
    random -= item.weight;
    if (random <= 0) {
      return item.symbol;
    }
  }

  return symbolWeights[0].symbol; // Fallback
}

function spinReels() {
  return [
    getWeightedSymbol(),
    getWeightedSymbol(),
    getWeightedSymbol()
  ];
}

function calculatePayout(reels, betAmount) {
  const combination = reels.join('');

  // Check for 3 matching symbols
  if (payouts[combination]) {
    return betAmount * payouts[combination];
  }

  // Check for 2 matching symbols
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    const matchingSymbol = reels[0] === reels[1] ? reels[0] :
      reels[1] === reels[2] ? reels[1] : reels[0];

    if (twoMatchPayouts[matchingSymbol]) {
      return Math.floor(betAmount * twoMatchPayouts[matchingSymbol]);
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
    if (result === 'win') {
      await economy.addMoney(msg.author.id, payout - bet, 'luck');
    } else {
      await economy.removeMoney(msg.author.id, bet, 'luck');
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
    let partial = false;
    if (result === 'win') {
      const combination = reels.join('');
      if (payouts[combination]) {
        payoutInfo = `\n**Jackpot!** ${payouts[combination]}x multiplier`;
      } else {
        partial = true;
        payoutInfo = `\n**Match!** Partial win`;
      }
    }

    const resultEmbed = result === 'win'
      ? partial === true ?
        embeds.warning(
          'Slots - You Won',
          `${slotsDisplay}${payoutInfo}\n\nYou won **${economy.formatMoney(payout)} coins**\n`
        ) : embeds.success(
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
