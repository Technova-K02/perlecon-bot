const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const TICKET_PRICE = 100;
const DRAW_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_NUMBERS = 49;
const PICK_COUNT = 6;

let currentLottery = {
  tickets: [],
  jackpot: 1000,
  drawTime: Date.now() + DRAW_INTERVAL,
  drawNumber: 1
};

function generateWinningNumbers() {
  const numbers = [];
  while (numbers.length < PICK_COUNT) {
    const num = Math.floor(Math.random() * MAX_NUMBERS) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
}

function countMatches(playerNumbers, winningNumbers) {
  return playerNumbers.filter(num => winningNumbers.includes(num)).length;
}

function calculatePayout(matches, jackpot) {
  switch (matches) {
    case 6: return jackpot; // Jackpot
    case 5: return Math.floor(jackpot * 0.1); // 10% of jackpot
    case 4: return Math.floor(jackpot * 0.02); // 2% of jackpot
    case 3: return TICKET_PRICE * 2; // Double ticket price
    case 2: return TICKET_PRICE; // Ticket price back
    default: return 0;
  }
}

async function drawLottery() {
  if (currentLottery.tickets.length === 0) {
    // No tickets, roll over jackpot
    currentLottery.drawTime = Date.now() + DRAW_INTERVAL;
    currentLottery.drawNumber++;
    return;
  }

  const winningNumbers = generateWinningNumbers();
  const winners = [];
  let totalPayout = 0;

  // Check all tickets
  for (const ticket of currentLottery.tickets) {
    const matches = countMatches(ticket.numbers, winningNumbers);
    if (matches >= 2) {
      const payout = calculatePayout(matches, currentLottery.jackpot);
      winners.push({
        userId: ticket.userId,
        matches,
        payout,
        numbers: ticket.numbers
      });
      totalPayout += payout;
    }
  }

  // Pay out winners
  for (const winner of winners) {
    await economy.addMoney(winner.userId, winner.payout, 'luck');
    
    const transaction = new Transaction({
      to: winner.userId,
      amount: winner.payout,
      type: 'luck',
      description: `Lottery Win: ${winner.matches} matches - Won ${winner.payout} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: winner.userId,
      game: 'lottery',
      betAmount: TICKET_PRICE,
      result: 'win',
      payout: winner.payout
    });
    await casinoLog.save();
  }

  // Reset lottery
  const newJackpot = Math.max(1000, currentLottery.jackpot - totalPayout + (currentLottery.tickets.length * TICKET_PRICE * 0.5));
  currentLottery = {
    tickets: [],
    jackpot: newJackpot,
    drawTime: Date.now() + DRAW_INTERVAL,
    drawNumber: currentLottery.drawNumber + 1
  };

  return { winningNumbers, winners, totalPayout };
}

// Auto-draw timer
setInterval(async () => {
  if (Date.now() >= currentLottery.drawTime) {
    await drawLottery();
  }
}, 60000); // Check every minute

module.exports = {
  name: 'lottery',
  description: 'Buy lottery tickets and win big',
  async execute(msg, args) {
    if (args.length === 0) {
      const timeLeft = Math.max(0, currentLottery.drawTime - Date.now());
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      const infoEmbed = embeds.info(
        'Lottery Information',
        `**Current Jackpot:** ${economy.formatMoney(currentLottery.jackpot)} coins\n` +
        `**Ticket Price:** ${economy.formatMoney(TICKET_PRICE)} coins\n` +
        `**Tickets Sold:** ${currentLottery.tickets.length}\n` +
        `**Next Draw:** ${minutes}m ${seconds}s\n` +
        `**Draw #:** ${currentLottery.drawNumber}\n\n` +
        `**How to Play:**\n` +
        `• Pick ${PICK_COUNT} numbers from 1-${MAX_NUMBERS}\n` +
        `• Match 2+ numbers to win\n` +
        `• Match all ${PICK_COUNT} for the jackpot\n\n` +
        `**Usage:** \`lottery buy 1 5 12 23 34 45\``
      );
      return msg.channel.send({ embeds: [infoEmbed] });
    }

    if (args[0].toLowerCase() === 'buy') {
      if (args.length !== PICK_COUNT + 1) {
        const errorEmbed = embeds.error(
          'Invalid Numbers',
          `Please pick exactly ${PICK_COUNT} numbers from 1-${MAX_NUMBERS}\nExample: \`lottery buy 1 5 12 23 34 45\``
        );
        return msg.channel.send({ embeds: [errorEmbed] });
      }

      const numbers = [];
      for (let i = 1; i <= PICK_COUNT; i++) {
        const num = parseInt(args[i]);
        if (isNaN(num) || num < 1 || num > MAX_NUMBERS) {
          const errorEmbed = embeds.error(
            'Invalid Number',
            `All numbers must be between 1 and ${MAX_NUMBERS}`
          );
          return msg.channel.send({ embeds: [errorEmbed] });
        }
        if (numbers.includes(num)) {
          const errorEmbed = embeds.error(
            'Duplicate Number',
            'All numbers must be unique'
          );
          return msg.channel.send({ embeds: [errorEmbed] });
        }
        numbers.push(num);
      }

      const user = await economy.getUser(msg.author.id);
      if (user.pocket < TICKET_PRICE) {
        const errorEmbed = embeds.error(
          'Insufficient Funds',
          `You need ${economy.formatMoney(TICKET_PRICE)} coins to buy a ticket`
        );
        return msg.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user already has a ticket
      const existingTicket = currentLottery.tickets.find(t => t.userId === msg.author.id);
      if (existingTicket) {
        const errorEmbed = embeds.error(
          'Already Entered',
          `You already have a ticket for draw #${currentLottery.drawNumber}\nYour numbers: ${existingTicket.numbers.join(', ')}`
        );
        return msg.channel.send({ embeds: [errorEmbed] });
      }

      // Buy ticket
      await economy.removeMoney(msg.author.id, TICKET_PRICE, 'luck');
      
      const ticket = {
        userId: msg.author.id,
        numbers: numbers.sort((a, b) => a - b),
        purchaseTime: Date.now()
      };
      
      currentLottery.tickets.push(ticket);
      currentLottery.jackpot += TICKET_PRICE * 0.5; // 50% goes to jackpot

      const transaction = new Transaction({
        from: msg.author.id,
        amount: TICKET_PRICE,
        type: 'luck',
        description: `Lottery Ticket: ${numbers.join(', ')} - Draw #${currentLottery.drawNumber}`
      });
      await transaction.save();

      const timeLeft = Math.max(0, currentLottery.drawTime - Date.now());
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);

      const successEmbed = embeds.success(
        'Lottery Ticket Purchased',
        `**Your Numbers:** ${numbers.join(', ')}\n` +
        `**Draw #:** ${currentLottery.drawNumber}\n` +
        `**Next Draw:** ${minutes}m ${seconds}s\n` +
        `**Current Jackpot:** ${economy.formatMoney(currentLottery.jackpot)} coins\n\n` +
        `Good luck! Match 2+ numbers to win`
      );
      
      msg.channel.send({ embeds: [successEmbed] });
    } else if (args[0].toLowerCase() === 'draw' && msg.author.id === '123456789') { // Admin only
      const result = await drawLottery();
      if (result) {
        const drawEmbed = embeds.info(
          'Lottery Draw Results',
          `**Winning Numbers:** ${result.winningNumbers.join(', ')}\n` +
          `**Winners:** ${result.winners.length}\n` +
          `**Total Payout:** ${economy.formatMoney(result.totalPayout)} coins`
        );
        msg.channel.send({ embeds: [drawEmbed] });
      }
    } else {
      const errorEmbed = embeds.error(
        'Invalid Command',
        'Use `lottery` to see info or `lottery buy <numbers>` to purchase a ticket'
      );
      msg.channel.send({ embeds: [errorEmbed] });
    }
  }
};
