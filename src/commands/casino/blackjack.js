const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

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
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  return value;
}

function formatHand(hand) {
  return hand.map(card => `${card.rank}${card.suit}`).join(' ');
}

const activeGames = new Map();

module.exports = {
  name: 'blackjack',
  description: 'Play blackjack against the dealer',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        'Usage: `blackjack <amount>`\nExample: `blackjack 100`'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    if (activeGames.has(msg.author.id)) {
      const errorEmbed = embeds.error(
        'Game in Progress',
        'You already have an active blackjack game'
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

    const deck = createDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];
    
    const gameState = {
      deck,
      playerHand,
      dealerHand,
      bet,
      userId: msg.author.id,
      finished: false
    };
    
    activeGames.set(msg.author.id, gameState);

    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue([dealerHand[0]]);

    // Check for blackjack
    if (playerValue === 21) {
      return await this.endGame(msg, gameState, 'blackjack');
    }

    const gameEmbed = embeds.info(
      'Blackjack',
      `**Your Hand:** ${formatHand(playerHand)} (${playerValue})\n**Dealer:** ${dealerHand[0].rank}${dealerHand[0].suit} ? (${dealerValue}+)\n\n**Bet:** ${economy.formatMoney(bet)} coins`
    );

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`blackjack_hit_${msg.author.id}`)
          .setLabel('Hit')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`blackjack_stand_${msg.author.id}`)
          .setLabel('Stand')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`blackjack_double_${msg.author.id}`)
          .setLabel('Double Down')
          .setStyle(ButtonStyle.Success)
          .setDisabled(user.pocket < bet * 2)
      );

    msg.channel.send({ embeds: [gameEmbed], components: [buttons] });
  },

  async handleButton(interaction) {
    const [action, userId] = interaction.customId.split('_').slice(1);
    
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'This is not your game', flags: 64 });
    }

    const gameState = activeGames.get(userId);
    if (!gameState || gameState.finished) {
      return interaction.reply({ content: 'No active game found', flags: 64 });
    }

    if (action === 'hit') {
      gameState.playerHand.push(gameState.deck.pop());
      const playerValue = calculateHandValue(gameState.playerHand);
      
      if (playerValue > 21) {
        return await this.endGame(interaction, gameState, 'bust');
      }
      
      const gameEmbed = embeds.info(
        'Blackjack',
        `**Your Hand:** ${formatHand(gameState.playerHand)} (${playerValue})\n**Dealer:** ${gameState.dealerHand[0].rank}${gameState.dealerHand[0].suit} ? (${calculateHandValue([gameState.dealerHand[0]])}+)\n\n**Bet:** ${economy.formatMoney(gameState.bet)} coins`
      );

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`blackjack_hit_${userId}`)
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`blackjack_stand_${userId}`)
            .setLabel('Stand')
            .setStyle(ButtonStyle.Secondary)
        );

      interaction.update({ embeds: [gameEmbed], components: [buttons] });
    } else if (action === 'stand') {
      return await this.endGame(interaction, gameState, 'stand');
    } else if (action === 'double') {
      const user = await economy.getUser(userId);
      if (user.pocket < gameState.bet * 2) {
        return interaction.reply({ content: 'Insufficient funds to double down', flags: 64 });
      }
      
      gameState.bet *= 2;
      gameState.playerHand.push(gameState.deck.pop());
      return await this.endGame(interaction, gameState, 'double');
    }
  },

  async endGame(msgOrInteraction, gameState, reason) {
    gameState.finished = true;
    activeGames.delete(gameState.userId);

    const playerValue = calculateHandValue(gameState.playerHand);
    const dealerValue = calculateHandValue(gameState.dealerHand);

    // Dealer draws cards
    if (reason !== 'bust') {
      while (dealerValue < 17) {
        gameState.dealerHand.push(gameState.deck.pop());
        const newDealerValue = calculateHandValue(gameState.dealerHand);
        if (newDealerValue !== dealerValue) break;
      }
    }

    const finalDealerValue = calculateHandValue(gameState.dealerHand);
    let result, payout = 0, resultText;

    if (reason === 'blackjack') {
      result = 'win';
      payout = Math.floor(gameState.bet * 2.5);
      resultText = 'Blackjack! You win';
    } else if (reason === 'bust') {
      result = 'lose';
      resultText = 'Bust! You lose';
    } else if (finalDealerValue > 21) {
      result = 'win';
      payout = gameState.bet * 2;
      resultText = 'Dealer busts! You win';
    } else if (playerValue > finalDealerValue) {
      result = 'win';
      payout = gameState.bet * 2;
      resultText = 'You win';
    } else if (playerValue < finalDealerValue) {
      result = 'lose';
      resultText = 'Dealer wins';
    } else {
      result = 'draw';
      payout = gameState.bet;
      resultText = 'Push! It\'s a tie';
    }

    // Update user balance
    let updatedUser;
    if (result === 'win') {
      updatedUser = await economy.addMoney(gameState.userId, payout - gameState.bet, 'luck');
    } else if (result === 'lose') {
      updatedUser = await economy.removeMoney(gameState.userId, gameState.bet, 'luck');
    } else {
      updatedUser = await economy.getUser(gameState.userId);
    }

    // Log transaction and casino activity
    const transaction = new Transaction({
      from: result === 'win' ? null : gameState.userId,
      to: result === 'win' ? gameState.userId : null,
      amount: result === 'win' ? payout - gameState.bet : gameState.bet,
      type: 'luck',
      description: `Blackjack: ${resultText} - ${result === 'win' ? 'Won' : result === 'lose' ? 'Lost' : 'Tied'} ${gameState.bet} coins`
    });
    await transaction.save();

    const casinoLog = new CasinoLog({
      userId: gameState.userId,
      game: 'blackjack',
      betAmount: gameState.bet,
      result,
      payout: result === 'win' ? payout : 0
    });
    await casinoLog.save();

    const resultEmbed = result === 'win' 
      ? embeds.success(
        'Blackjack - You Won',
        `**Your Hand:** ${formatHand(gameState.playerHand)} (${playerValue})\n**Dealer:** ${formatHand(gameState.dealerHand)} (${finalDealerValue})\n\n${resultText}\nYou won **${economy.formatMoney(payout - gameState.bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : result === 'lose'
      ? embeds.error(
        'Blackjack - You Lost',
        `**Your Hand:** ${formatHand(gameState.playerHand)} (${playerValue})\n**Dealer:** ${formatHand(gameState.dealerHand)} (${finalDealerValue})\n\n${resultText}\nYou lost **${economy.formatMoney(gameState.bet)} coins**\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      )
      : embeds.info(
        'Blackjack - Push',
        `**Your Hand:** ${formatHand(gameState.playerHand)} (${playerValue})\n**Dealer:** ${formatHand(gameState.dealerHand)} (${finalDealerValue})\n\n${resultText}\nYour bet was returned\n\n**Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );

    if (msgOrInteraction.update) {
      msgOrInteraction.update({ embeds: [resultEmbed], components: [] });
    } else {
      msgOrInteraction.channel.send({ embeds: [resultEmbed] });
    }
  }
};
