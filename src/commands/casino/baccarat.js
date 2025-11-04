const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCardValue(card) {
  if (card.rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(card.rank)) return 0;
  return parseInt(card.rank);
}

function calculateHandValue(hand) {
  const total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  return total % 10; // Baccarat uses modulo 10
}

function formatHand(hand) {
  return hand.map(card => `${card.rank}${card.suit}`).join(' ');
}

module.exports = {
  name: 'baccarat',
  description: 'Play baccarat - bet on Player, Banker, or Tie',
  async execute(msg, args) {
    if (args.length < 2) {
      const helpEmbed = embeds.info(
        'Baccarat Help',
        '**Usage:** `baccarat <amount> <bet>`\n\n**Bet Types:**\n' +
        '• **player** - Bet on player hand (1:1 payout)\n' +
        '• **banker** - Bet on banker hand (0.95:1 payout)\n' +
        '• **tie** - Bet on tie (8:1 payout)\n\n' +
        '**Rules:**\n' +
        '• Cards 2-9 = Face value\n' +
        '• Ace = 1, Face cards = 0\n' +
        '• Hand value = Sum % 10\n' +
        '• Closest to 9 wins\n\n' +
        '**Examples:**\n`baccarat 100 player`\n`baccarat 50 banker`\n`baccarat 25 tie`'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const betAmount = parseInt(args[0]);
    const betType = args[1].toLowerCase();

    if (isNaN(betAmount) || betAmount <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet Amount',
        'Please enter a valid bet amount'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    if (!['player', 'banker', 'tie'].includes(betType)) {
      const errorEmbed = embeds.error(
        'Invalid Bet Type',
        'Please bet on: player, banker, or tie'
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

    const deck = createDeck();
    
    // Deal initial cards
    const playerHand = [deck.pop(), deck.pop()];
    const bankerHand = [deck.pop(), deck.pop()];
    
    let playerValue = calculateHandValue(playerHand);
    let bankerValue = calculateHandValue(bankerHand);
    
    // Third card rules
    let playerThirdCard = null;
    let bankerThirdCard = null;
    
    // Player third card rule
    if (playerValue <= 5) {
      playerThirdCard = deck.pop();
      playerHand.push(playerThirdCard);
      playerValue = calculateHandValue(playerHand);
    }
    
    // Banker third card rules (simplified)
    if (bankerValue <= 5 && !playerThirdCard) {
      bankerThirdCard = deck.pop();
      bankerHand.push(bankerThirdCard);
      bankerValue = calculateHandValue(bankerHand);
    } else if (playerThirdCard) {
      const thirdCardValue = getCardValue(playerThirdCard);
      let shouldDraw = false;
      
      if (bankerValue <= 2) shouldDraw = true;
      else if (bankerValue === 3 && thirdCardValue !== 8) shouldDraw = true;
      else if (bankerValue === 4 && [2,3,4,5,6,7].includes(thirdCardValue)) shouldDraw = true;
      else if (bankerValue === 5 && [4,5,6,7].includes(thirdCardValue)) shouldDraw = true;
      else if (bankerValue === 6 && [6,7].includes(thirdCardValue)) shouldDraw = true;
      
      if (shouldDraw) {
        bankerThirdCard = deck.pop();
        bankerHand.push(bankerThirdCard);
        bankerValue = calculateHandValue(bankerHand);
      }
    }

    // Determine winner
    let winner, payout = 0, result;
    
    if (playerValue > bankerValue) {
      winner = 'player';
    } else if (bankerValue > playerValue) {
      winner = 'banker';
    } else {
      winner = 'tie';
    }

    // Calculate payout
    if (betType === winner) {
      result = 'win';
      if (betType === 'player') {
        payout = betAmount * 2; // 1:1
      } else if (betType === 'banker') {
        payout = Math.floor(betAmount * 1.95); // 0.95:1 (5% commission)
      } else if (betType === 'tie') {
        payout = betAmount * 9; // 8:1
      }
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
      description: `Baccarat: ${winner} wins (${playerValue}-${bankerValue}) - ${result === 'win' ? 'Won' : 'Lost'} ${result === 'win' ? payout - betAmount : betAmount} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'baccarat',
      betAmount,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const gameResult = `**Player Hand:** ${formatHand(playerHand)} = ${playerValue}\n**Banker Hand:** ${formatHand(bankerHand)} = ${bankerValue}\n\n**Winner:** ${winner.charAt(0).toUpperCase() + winner.slice(1)}\n**Your Bet:** ${betType}`;

    const resultEmbed = result === 'win'
      ? embeds.success(
        'Baccarat - You Won',
        `${gameResult}\n\nYou won **${economy.formatMoney(payout - betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        'Baccarat - You Lost',
        `${gameResult}\n\nYou lost **${economy.formatMoney(betAmount)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
