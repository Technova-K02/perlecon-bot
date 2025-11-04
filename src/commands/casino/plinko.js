const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

// Plinko multipliers from left to right (16 slots)
const MULTIPLIERS = [1000, 130, 26, 9, 4, 2, 1.5, 1, 0.5, 1, 1.5, 2, 4, 9, 26, 130, 1000];
const ROWS = 16;

function simulatePlinko() {
  let position = ROWS / 2; // Start in the middle
  
  // Simulate ball bouncing through pegs
  for (let row = 0; row < ROWS; row++) {
    // Random bounce left or right
    if (Math.random() < 0.5) {
      position -= 0.5;
    } else {
      position += 0.5;
    }
    
    // Add some randomness to make it more realistic
    position += (Math.random() - 0.5) * 0.3;
  }
  
  // Determine final slot (0-16)
  let slot = Math.round(position);
  slot = Math.max(0, Math.min(MULTIPLIERS.length - 1, slot));
  
  return slot;
}

function createPlinkoVisualization(finalSlot) {
  const visualization = [];
  
  // Top of board
  visualization.push('```');
  visualization.push('        🔴');
  visualization.push('       /   \\');
  
  // Peg rows
  for (let row = 0; row < 8; row++) {
    let line = ' '.repeat(8 - row);
    for (let peg = 0; peg <= row; peg++) {
      line += '● ';
    }
    visualization.push(line);
  }
  
  // Bottom slots with multipliers
  visualization.push('');
  let multiplierLine = '';
  let slotLine = '';
  
  for (let i = 0; i < MULTIPLIERS.length; i++) {
    const mult = MULTIPLIERS[i];
    const multStr = mult >= 1 ? `${mult}x` : `${mult}x`;
    
    if (i === finalSlot) {
      multiplierLine += `[${multStr}]`;
      slotLine += ' ⬇️ ';
    } else {
      multiplierLine += ` ${multStr} `;
      slotLine += '   ';
    }
  }
  
  visualization.push(multiplierLine);
  visualization.push(slotLine);
  visualization.push('```');
  
  return visualization.join('\n');
}

module.exports = {
  name: 'plinko',
  description: 'Drop a ball down the plinko board',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        'Usage: `plinko <amount>`\nExample: `plinko 100`'
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

    // Simulate the plinko drop
    const finalSlot = simulatePlinko();
    const multiplier = MULTIPLIERS[finalSlot];
    const payout = Math.floor(bet * multiplier);
    const profit = payout - bet;
    const result = profit > 0 ? 'win' : profit < 0 ? 'lose' : 'draw';

    // Update user balance
    let updatedUser;
    if (result === 'win') {
      updatedUser = await economy.addMoney(msg.author.id, profit, 'luck');
    } else if (result === 'lose') {
      updatedUser = await economy.removeMoney(msg.author.id, Math.abs(profit), 'luck');
    } else {
      updatedUser = await economy.getUser(msg.author.id);
    }

    // Log transaction and casino activity
    const transaction = new Transaction({
      from: result === 'win' ? null : result === 'lose' ? msg.author.id : null,
      to: result === 'win' ? msg.author.id : null,
      amount: Math.abs(profit),
      type: 'luck',
      description: `Plinko: ${multiplier}x multiplier - ${result === 'win' ? 'Won' : result === 'lose' ? 'Lost' : 'Broke even'} ${Math.abs(profit)} coins`
    });
    if (profit !== 0) await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'plinko',
      betAmount: bet,
      result: result === 'draw' ? 'win' : result, // Treat break-even as win for stats
      payout: payout
    });
    await casinoLog.save();

    const visualization = createPlinkoVisualization(finalSlot);
    
    let resultText, embedColor;
    if (result === 'win') {
      resultText = `You won **${economy.formatMoney(profit)} coins**`;
      embedColor = embeds.success;
    } else if (result === 'lose') {
      resultText = `You lost **${economy.formatMoney(Math.abs(profit))} coins**`;
      embedColor = embeds.error;
    } else {
      resultText = `You broke even`;
      embedColor = embeds.info;
    }

    const resultEmbed = embedColor(
      '🔴 Plinko',
      `${visualization}\n**Multiplier:** ${multiplier}x\n**Payout:** ${economy.formatMoney(payout)} coins\n\n${resultText}\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
    );

    // Add multiplier guide occasionally
    if (Math.random() < 0.15) { // 15% chance
      resultEmbed.addFields({
        name: '🎯 Multiplier Guide',
        value: 'Center slots: Lower risk, steady returns\nEdge slots: High risk, massive rewards\n1000x jackpot on the edges!',
        inline: false
      });
    }

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
