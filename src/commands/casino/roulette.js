const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const rouletteNumbers = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

function getPayoutMultiplier(bet, winningNumber) {
  const betLower = bet.toLowerCase();
  const color = rouletteNumbers[winningNumber];
  
  // Straight up number bet
  if (!isNaN(parseInt(bet)) && parseInt(bet) === winningNumber) {
    return 35;
  }
  
  // Color bets
  if ((betLower === 'red' && color === 'red') || 
      (betLower === 'black' && color === 'black') ||
      (betLower === 'green' && color === 'green')) {
    return betLower === 'green' ? 35 : 1;
  }
  
  // Even/Odd bets
  if (winningNumber !== 0) {
    if ((betLower === 'even' && winningNumber % 2 === 0) ||
        (betLower === 'odd' && winningNumber % 2 === 1)) {
      return 1;
    }
  }
  
  // High/Low bets
  if (winningNumber !== 0) {
    if ((betLower === 'low' && winningNumber >= 1 && winningNumber <= 18) ||
        (betLower === 'high' && winningNumber >= 19 && winningNumber <= 36)) {
      return 1;
    }
  }
  
  // Dozen bets
  if (winningNumber !== 0) {
    if ((betLower === '1st12' && winningNumber >= 1 && winningNumber <= 12) ||
        (betLower === '2nd12' && winningNumber >= 13 && winningNumber <= 24) ||
        (betLower === '3rd12' && winningNumber >= 25 && winningNumber <= 36)) {
      return 2;
    }
  }
  
  // Column bets
  if (winningNumber !== 0) {
    if ((betLower === 'col1' && winningNumber % 3 === 1) ||
        (betLower === 'col2' && winningNumber % 3 === 2) ||
        (betLower === 'col3' && winningNumber % 3 === 0)) {
      return 2;
    }
  }
  
  return 0; // No win
}

module.exports = {
  name: 'roulette',
  description: 'Play roulette - bet on numbers, colors, or ranges',
  async execute(msg, args) {
    if (args.length < 2) {
      const helpEmbed = embeds.info(
        '🎰 Roulette Help',
        '**Usage:** `roulette <amount> <bet>`\n\n**Bet Types:**\n' +
        '• **Numbers:** 0-36 (35:1 payout)\n' +
        '• **Colors:** red, black, green (1:1 or 35:1 for green)\n' +
        '• **Even/Odd:** even, odd (1:1)\n' +
        '• **High/Low:** high (19-36), low (1-18) (1:1)\n' +
        '• **Dozens:** 1st12, 2nd12, 3rd12 (2:1)\n' +
        '• **Columns:** col1, col2, col3 (2:1)\n\n' +
        '**Examples:**\n`roulette 100 red`\n`roulette 50 17`\n`roulette 200 even`'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const betAmount = parseInt(args[0]);
    const betType = args[1];

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

    // Validate bet type
    const validBets = ['red', 'black', 'green', 'even', 'odd', 'high', 'low', 
                      '1st12', '2nd12', '3rd12', 'col1', 'col2', 'col3'];
    const numberBet = parseInt(betType);
    
    if (!validBets.includes(betType.toLowerCase()) && (isNaN(numberBet) || numberBet < 0 || numberBet > 36)) {
      const errorEmbed = embeds.error(
        'Invalid Bet Type',
        'Please use a valid bet type. Use `roulette` without arguments for help'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // Spin the wheel
    const winningNumber = Math.floor(Math.random() * 37); // 0-36
    const winningColor = rouletteNumbers[winningNumber];
    const multiplier = getPayoutMultiplier(betType, winningNumber);
    
    let result, payout = 0;
    if (multiplier > 0) {
      result = 'win';
      payout = betAmount * (multiplier + 1); // Include original bet
    } else {
      result = 'lose';
    }

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
      description: `Roulette: ${winningNumber} ${winningColor} - ${result === 'win' ? 'Won' : 'Lost'} ${betAmount} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'roulette',
      betAmount,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const colorEmoji = winningColor === 'red' ? '🔴' : winningColor === 'black' ? '⚫' : '🟢';
    
    const resultEmbed = result === 'win'
      ? embeds.success(
        '🎰 Roulette - You Won',
        `**Winning Number:** ${winningNumber} ${colorEmoji}\n**Your Bet:** ${betType} (${betAmount} coins)\n**Multiplier:** ${multiplier}:1\n\nYou won **${economy.formatMoney(payout - betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        '🎰 Roulette - You Lost',
        `**Winning Number:** ${winningNumber} ${colorEmoji}\n**Your Bet:** ${betType} (${betAmount} coins)\n\nYou lost **${economy.formatMoney(betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
