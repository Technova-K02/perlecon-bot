const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: ranks.indexOf(rank) + 2 });
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

function formatHand(hand) {
  return hand.map(card => `${card.rank}${card.suit}`).join(' ');
}

function evaluateHand(hand) {
  const sortedHand = [...hand].sort((a, b) => a.value - b.value);
  const ranks = sortedHand.map(card => card.value);
  const suits = sortedHand.map(card => card.suit);
  
  // Count occurrences of each rank
  const rankCounts = {};
  ranks.forEach(rank => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = suits.every(suit => suit === suits[0]);
  const isStraight = ranks.every((rank, i) => i === 0 || rank === ranks[i - 1] + 1) ||
                    (ranks.join(',') === '2,3,4,5,14'); // A-2-3-4-5 straight
  
  // Royal Flush
  if (isFlush && isStraight && ranks[0] === 10) {
    return { rank: 10, name: 'Royal Flush', multiplier: 800 };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 9, name: 'Straight Flush', multiplier: 50 };
  }
  
  // Four of a Kind
  if (counts[0] === 4) {
    return { rank: 8, name: 'Four of a Kind', multiplier: 25 };
  }
  
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 7, name: 'Full House', multiplier: 9 };
  }
  
  // Flush
  if (isFlush) {
    return { rank: 6, name: 'Flush', multiplier: 6 };
  }
  
  // Straight
  if (isStraight) {
    return { rank: 5, name: 'Straight', multiplier: 4 };
  }
  
  // Three of a Kind
  if (counts[0] === 3) {
    return { rank: 4, name: 'Three of a Kind', multiplier: 3 };
  }
  
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 3, name: 'Two Pair', multiplier: 2 };
  }
  
  // Pair of Jacks or Better
  if (counts[0] === 2) {
    const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
    if (parseInt(pairRank) >= 11) { // J, Q, K, A
      return { rank: 2, name: 'Jacks or Better', multiplier: 1 };
    }
  }
  
  // High Card (no win)
  return { rank: 1, name: 'High Card', multiplier: 0 };
}

module.exports = {
  name: 'poker',
  description: 'Play 5-card draw poker (Jacks or Better)',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const helpEmbed = embeds.info(
        '🃏 Video Poker (Jacks or Better)',
        '**Usage:** `poker <amount>`\n\n**Payouts:**\n' +
        '• Royal Flush: 800:1\n' +
        '• Straight Flush: 50:1\n' +
        '• Four of a Kind: 25:1\n' +
        '• Full House: 9:1\n' +
        '• Flush: 6:1\n' +
        '• Straight: 4:1\n' +
        '• Three of a Kind: 3:1\n' +
        '• Two Pair: 2:1\n' +
        '• Jacks or Better: 1:1\n\n' +
        '**Example:** `poker 100`'
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

    const deck = createDeck();
    const hand = [];
    
    // Deal 5 cards
    for (let i = 0; i < 5; i++) {
      hand.push(deck.pop());
    }

    const handEvaluation = evaluateHand(hand);
    const payout = handEvaluation.multiplier > 0 ? bet * (handEvaluation.multiplier + 1) : 0;
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
      description: `Poker: ${handEvaluation.name} - ${result === 'win' ? 'Won' : 'Lost'} ${result === 'win' ? payout - bet : bet} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'poker',
      betAmount: bet,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const handDisplay = formatHand(hand);
    
    const resultEmbed = result === 'win'
      ? embeds.success(
        '🃏 Video Poker - You Won',
        `**Your Hand:** ${handDisplay}\n**Result:** ${handEvaluation.name}\n**Multiplier:** ${handEvaluation.multiplier}:1\n\nYou won **${economy.formatMoney(payout - bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.error(
        '🃏 Video Poker - You Lost',
        `**Your Hand:** ${handDisplay}\n**Result:** ${handEvaluation.name}\n\nYou lost **${economy.formatMoney(bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    msg.channel.send({ embeds: [resultEmbed] });
  }
};
