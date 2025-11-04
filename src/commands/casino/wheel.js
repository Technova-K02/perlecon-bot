const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

// Wheel segments with their multipliers and probabilities
const WHEEL_SEGMENTS = [
  { multiplier: 1.2, color: '🟢', weight: 20 },
  { multiplier: 1.5, color: '🔵', weight: 15 },
  { multiplier: 2, color: '🟡', weight: 12 },
  { multiplier: 3, color: '🟠', weight: 8 },
  { multiplier: 5, color: '🔴', weight: 5 },
  { multiplier: 10, color: '🟣', weight: 3 },
  { multiplier: 25, color: '⚫', weight: 2 },
  { multiplier: 50, color: '⚪', weight: 1 }
];

function spinWheel() {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const segment of WHEEL_SEGMENTS) {
    random -= segment.weight;
    if (random <= 0) {
      return segment;
    }
  }
  
  return WHEEL_SEGMENTS[0]; // Fallback
}

function createWheelVisualization(winningSegment) {
  const wheel = [
    '```',
    '       🎡 WHEEL OF FORTUNE 🎡',
    '           ╭─────────────╮',
    '         ╱               ╲',
    '       ╱     🟢 1.2x      ╲',
    '      │   🔵 1.5x   🟡 2x  │',
    '      │ ⚪ 50x         🟠 3x │',
    '      │   ⚫ 25x   🔴 5x   │',
    '       ╲     🟣 10x      ╱',
    '         ╲               ╱',
    '           ╰─────────────╯',
    '                 ⬇️',
    `         Winner: ${winningSegment.color} ${winningSegment.multiplier}x`,
    '```'
  ];
  
  return wheel.join('\n');
}

module.exports = {
  name: 'wheel',
  description: 'Spin the wheel of fortune',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const helpEmbed = embeds.info(
        '🎡 Wheel of Fortune',
        '**Usage:** `wheel <amount>`\n\n**Multipliers:**\n' +
        '🟢 1.2x - Common (20%)\n' +
        '🔵 1.5x - Uncommon (15%)\n' +
        '🟡 2x - Rare (12%)\n' +
        '🟠 3x - Epic (8%)\n' +
        '🔴 5x - Legendary (5%)\n' +
        '🟣 10x - Mythic (3%)\n' +
        '⚫ 25x - Ultra Rare (2%)\n' +
        '⚪ 50x - Jackpot (1%)\n\n' +
        '**Example:** `wheel 100`'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const user = await economy.getUser(msg.author.id);
    if (user.pocket < bet) {
      const errorEmbed = embeds.error(
        'Insufficient Funds',
        `You only have ${economy.formatMoney(user.pocket)} coins in your pocket`
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // Spin the wheel
    const winningSegment = spinWheel();
    const payout = Math.floor(bet * winningSegment.multiplier);
    const profit = payout - bet;
    const result = profit > 0 ? 'win' : 'lose';

    // Update user balance
    let updatedUser;
    if (result === 'win') {
      updatedUser = await economy.addMoney(msg.author.id, profit, 'luck');
    } else {
      updatedUser = await economy.removeMoney(msg.author.id, bet, 'luck');
    }

    // Log transaction and casino activity
    const transaction = new Transaction({
      from: result === 'win' ? null : msg.author.id,
      to: result === 'win' ? msg.author.id : null,
      amount: result === 'win' ? profit : bet,
      type: 'luck',
      description: `Wheel: ${winningSegment.multiplier}x ${winningSegment.color} - ${result === 'win' ? 'Won' : 'Lost'} ${result === 'win' ? profit : bet} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'wheel',
      betAmount: bet,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const visualization = createWheelVisualization(winningSegment);
    
    let rarityText = '';
    if (winningSegment.multiplier >= 50) rarityText = ' - JACKPOT!';
    else if (winningSegment.multiplier >= 25) rarityText = ' - Ultra Rare!';
    else if (winningSegment.multiplier >= 10) rarityText = ' - Mythic!';
    else if (winningSegment.multiplier >= 5) rarityText = ' - Legendary!';
    else if (winningSegment.multiplier >= 3) rarityText = ' - Epic!';

    const resultEmbed = result === 'win'
      ? embeds.success(
        '🎡 Wheel of Fortune - You Won',
        `${visualization}\n**Multiplier:** ${winningSegment.multiplier}x${rarityText}\n**Payout:** ${economy.formatMoney(payout)} coins\n\nYou won **${economy.formatMoney(profit)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        '🎡 Wheel of Fortune - You Lost',
        `${visualization}\n**Multiplier:** ${winningSegment.multiplier}x\n**Payout:** ${economy.formatMoney(payout)} coins\n\nYou lost **${economy.formatMoney(bet - payout)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
