const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const MAX_NUMBERS = 80;
const DRAW_COUNT = 20;
const MAX_PICKS = 10;

// Payout table based on numbers picked and matched
const PAYOUTS = {
  1: { 1: 3 },
  2: { 2: 12 },
  3: { 2: 1, 3: 42 },
  4: { 2: 1, 3: 4, 4: 120 },
  5: { 3: 2, 4: 12, 5: 750 },
  6: { 3: 1, 4: 3, 5: 75, 6: 1500 },
  7: { 3: 1, 4: 2, 5: 20, 6: 400, 7: 7500 },
  8: { 4: 2, 5: 12, 6: 98, 7: 1500, 8: 10000 },
  9: { 4: 1, 5: 4, 6: 44, 7: 335, 8: 4000, 9: 10000 },
  10: { 5: 2, 6: 24, 7: 142, 8: 1000, 9: 4500, 10: 10000 }
};

function generateDrawNumbers() {
  const numbers = [];
  while (numbers.length < DRAW_COUNT) {
    const num = Math.floor(Math.random() * MAX_NUMBERS) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
}

function countMatches(playerNumbers, drawnNumbers) {
  return playerNumbers.filter(num => drawnNumbers.includes(num)).length;
}

function calculatePayout(picked, matches, betAmount) {
  const payoutTable = PAYOUTS[picked];
  if (!payoutTable || !payoutTable[matches]) {
    return 0;
  }
  return betAmount * payoutTable[matches];
}

module.exports = {
  name: 'keno',
  description: 'Play keno - pick numbers and match the draw',
  async execute(msg, args) {
    if (args.length < 2) {
      const helpEmbed = embeds.info(
        'Keno Help',
        '**Usage:** `keno <amount> <numbers...>`\n\n' +
        '• Pick 1-10 numbers from 1-80\n' +
        '• 20 numbers will be drawn\n' +
        '• Match numbers to win\n' +
        '• More picks = higher potential payouts\n\n' +
        '**Payout Examples (10x bet):**\n' +
        '• Pick 1, Match 1: 3x\n' +
        '• Pick 5, Match 5: 750x\n' +
        '• Pick 10, Match 10: 10,000x\n\n' +
        '**Examples:**\n`keno 100 7 14 21 35 42`\n`keno 50 1 2 3 4 5 6 7 8 9 10`'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const betAmount = parseInt(args[0]);
    const playerNumbers = args.slice(1).map(num => parseInt(num));

    if (isNaN(betAmount) || betAmount <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet Amount',
        'Please enter a valid bet amount'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    if (playerNumbers.length < 1 || playerNumbers.length > MAX_PICKS) {
      const errorEmbed = embeds.error(
        'Invalid Number Count',
        `Please pick between 1 and ${MAX_PICKS} numbers`
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // Validate numbers
    for (const num of playerNumbers) {
      if (isNaN(num) || num < 1 || num > MAX_NUMBERS) {
        const errorEmbed = embeds.error(
          'Invalid Numbers',
          `All numbers must be between 1 and ${MAX_NUMBERS}`
        );
        return msg.channel.send({ embeds: [errorEmbed] });
      }
    }

    // Check for duplicates
    if (new Set(playerNumbers).size !== playerNumbers.length) {
      const errorEmbed = embeds.error(
        'Duplicate Numbers',
        'All numbers must be unique'
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

    // Draw numbers
    const drawnNumbers = generateDrawNumbers();
    const matches = countMatches(playerNumbers, drawnNumbers);
    const matchedNumbers = playerNumbers.filter(num => drawnNumbers.includes(num));
    
    const payout = calculatePayout(playerNumbers.length, matches, betAmount);
    const result = payout > 0 ? 'win' : 'lose';

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
      description: `Keno: ${matches}/${playerNumbers.length} matches - ${result === 'win' ? 'Won' : 'Lost'} ${result === 'win' ? payout - betAmount : betAmount} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'keno',
      betAmount,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    // Format numbers display
    const formatNumbers = (numbers) => {
      return numbers.map(num => num.toString().padStart(2, '0')).join(' ');
    };

    const gameInfo = `**Your Numbers:** ${formatNumbers(playerNumbers.sort((a, b) => a - b))}\n**Drawn Numbers:** ${formatNumbers(drawnNumbers)}\n**Matched Numbers:** ${matchedNumbers.length > 0 ? formatNumbers(matchedNumbers.sort((a, b) => a - b)) : 'None'}\n**Matches:** ${matches}/${playerNumbers.length}`;

    const resultEmbed = result === 'win'
      ? embeds.success(
        'Keno - You Won',
        `${gameInfo}\n\n**Payout:** ${economy.formatMoney(payout)} coins\nYou won **${economy.formatMoney(payout - betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        'Keno - You Lost',
        `${gameInfo}\n\nYou lost **${economy.formatMoney(betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
