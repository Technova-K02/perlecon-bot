const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const CARD_SIZE = 5;
const MAX_NUMBER = 75;

function generateBingoCard() {
  const card = [];
  const ranges = [
    [1, 15],   // B column
    [16, 30],  // I column
    [31, 45],  // N column
    [46, 60],  // G column
    [61, 75]   // O column
  ];

  for (let col = 0; col < CARD_SIZE; col++) {
    const column = [];
    const [min, max] = ranges[col];
    const usedNumbers = new Set();

    for (let row = 0; row < CARD_SIZE; row++) {
      if (col === 2 && row === 2) {
        // Center square is FREE
        column.push('FREE');
      } else {
        let num;
        do {
          num = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (usedNumbers.has(num));
        usedNumbers.add(num);
        column.push(num);
      }
    }
    card.push(column);
  }

  return card;
}

function generateCalledNumbers(count) {
  const numbers = [];
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * MAX_NUMBER) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
}

function markCard(card, calledNumbers) {
  const markedCard = card.map(col => [...col]);
  
  for (let col = 0; col < CARD_SIZE; col++) {
    for (let row = 0; row < CARD_SIZE; row++) {
      if (markedCard[col][row] === 'FREE' || calledNumbers.includes(markedCard[col][row])) {
        markedCard[col][row] = 'X';
      }
    }
  }
  
  return markedCard;
}

function checkWins(markedCard) {
  const wins = [];
  
  // Check rows
  for (let row = 0; row < CARD_SIZE; row++) {
    if (markedCard.every(col => col[row] === 'X')) {
      wins.push(`Row ${row + 1}`);
    }
  }
  
  // Check columns
  for (let col = 0; col < CARD_SIZE; col++) {
    if (markedCard[col].every(cell => cell === 'X')) {
      wins.push(`Column ${['B', 'I', 'N', 'G', 'O'][col]}`);
    }
  }
  
  // Check diagonals
  if (markedCard.every((col, i) => col[i] === 'X')) {
    wins.push('Diagonal (top-left to bottom-right)');
  }
  
  if (markedCard.every((col, i) => col[CARD_SIZE - 1 - i] === 'X')) {
    wins.push('Diagonal (top-right to bottom-left)');
  }
  
  // Check four corners
  if (markedCard[0][0] === 'X' && markedCard[4][0] === 'X' && 
      markedCard[0][4] === 'X' && markedCard[4][4] === 'X') {
    wins.push('Four Corners');
  }
  
  // Check full card (blackout)
  if (markedCard.every(col => col.every(cell => cell === 'X'))) {
    wins.push('BLACKOUT');
  }
  
  return wins;
}

function calculatePayout(wins, betAmount) {
  let totalMultiplier = 0;
  
  for (const win of wins) {
    if (win.includes('BLACKOUT')) {
      totalMultiplier += 100; // 100x for blackout
    } else if (win.includes('Diagonal')) {
      totalMultiplier += 10; // 10x for diagonal
    } else if (win.includes('Four Corners')) {
      totalMultiplier += 15; // 15x for four corners
    } else if (win.includes('Row') || win.includes('Column')) {
      totalMultiplier += 5; // 5x for line
    }
  }
  
  return betAmount * totalMultiplier;
}

function formatCard(card, title = 'BINGO CARD') {
  const header = '  B   I   N   G   O';
  const separator = '─'.repeat(19);
  
  let cardStr = `\`\`\`\n${title}\n${separator}\n${header}\n${separator}\n`;
  
  for (let row = 0; row < CARD_SIZE; row++) {
    let rowStr = '';
    for (let col = 0; col < CARD_SIZE; col++) {
      const cell = card[col][row];
      const cellStr = cell === 'X' ? ' X ' : 
                     cell === 'FREE' ? 'FRE' : 
                     cell.toString().padStart(3, ' ');
      rowStr += cellStr + (col < CARD_SIZE - 1 ? ' ' : '');
    }
    cardStr += rowStr + '\n';
  }
  
  cardStr += '```';
  return cardStr;
}

module.exports = {
  name: 'bingo',
  description: 'Play bingo with randomly generated cards',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const helpEmbed = embeds.info(
        'Bingo Help',
        '**Usage:** `bingo <amount>`\n\n**How to Play:**\n' +
        '• Get a random 5x5 bingo card\n' +
        '• 30 numbers will be called\n' +
        '• Match patterns to win\n\n**Winning Patterns:**\n' +
        '• Line (Row/Column): 5x payout\n' +
        '• Diagonal: 10x payout\n' +
        '• Four Corners: 15x payout\n' +
        '• BLACKOUT (Full Card): 100x payout\n\n' +
        '**Example:** `bingo 100`'
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

    // Generate card and call numbers
    const card = generateBingoCard();
    const calledNumbers = generateCalledNumbers(30); // Call 30 numbers
    const markedCard = markCard(card, calledNumbers);
    const wins = checkWins(markedCard);
    
    const payout = calculatePayout(wins, bet);
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
      description: `Bingo: ${wins.length} wins - ${result === 'win' ? 'Won' : 'Lost'} ${result === 'win' ? payout - bet : bet} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'bingo',
      betAmount: bet,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const cardDisplay = formatCard(markedCard, 'YOUR BINGO CARD (X = MATCHED)');
    const calledDisplay = `**Called Numbers:** ${calledNumbers.join(', ')}`;
    
    let winsDisplay = '';
    if (wins.length > 0) {
      winsDisplay = `\n**Winning Patterns:** ${wins.join(', ')}`;
    }

    const resultEmbed = result === 'win'
      ? embeds.success(
        'Bingo - You Won',
        `${cardDisplay}\n${calledDisplay}${winsDisplay}\n\nYou won **${economy.formatMoney(payout - bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        'Bingo - You Lost',
        `${cardDisplay}\n${calledDisplay}\n\nNo winning patterns found\nYou lost **${economy.formatMoney(bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
