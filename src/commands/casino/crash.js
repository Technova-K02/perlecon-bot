const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const activeGames = new Map();

function generateCrashPoint() {
  // Generate crash point with house edge
  const random = Math.random();
  if (random < 0.01) return 1.00; // 1% chance of instant crash
  if (random < 0.05) return 1.00 + Math.random() * 0.5; // 4% chance of crash before 1.5x

  // Exponential distribution for higher multipliers
  const crashPoint = 1 / (1 - Math.random() * 0.99);
  return Math.min(crashPoint, 1000); // Cap at 1000x
}

function formatMultiplier(multiplier) {
  return `${multiplier.toFixed(2)}x`;
}

module.exports = {
  name: 'crash',
  description: 'Bet on when the multiplier will crash',
  async execute(msg, args) {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        'Usage: `crash <amount>`\nExample: `crash 100`'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    if (activeGames.has(msg.author.id)) {
      const errorEmbed = embeds.error(
        'Game in Progress',
        'You already have an active crash game'
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

    const crashPoint = generateCrashPoint();
    const gameState = {
      bet,
      crashPoint,
      currentMultiplier: 1.00,
      userId: msg.author.id,
      startTime: Date.now(),
      cashedOut: false
    };

    activeGames.set(msg.author.id, gameState);

    const gameEmbed = embeds.info(
      'Crash Game',
      `**Bet:** ${economy.formatMoney(bet)} coins\n**Current Multiplier:** ${formatMultiplier(gameState.currentMultiplier)}\n**Potential Win:** ${economy.formatMoney(Math.floor(bet * gameState.currentMultiplier))} coins\n\nThe multiplier is rising! Cash out before it crashes`
    );

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`crash_cashout_${msg.author.id}`)
          .setLabel('Cash Out')
          .setStyle(ButtonStyle.Success)
      );

    const gameMessage = await msg.channel.send({ embeds: [gameEmbed], components: [buttons] });

    // Start the multiplier animation
    this.runGame(gameMessage, gameState);
  },

  async runGame(message, gameState) {
    const updateInterval = setInterval(async () => {
      if (gameState.cashedOut) {
        clearInterval(updateInterval);
        return;
      }

      // Increase multiplier over time
      const elapsed = Date.now() - gameState.startTime;
      gameState.currentMultiplier = 1 + (elapsed / 1000) * 0.1; // Increases by 0.1x per second

      // Check if crashed
      if (gameState.currentMultiplier >= gameState.crashPoint) {
        clearInterval(updateInterval);
        activeGames.delete(gameState.userId);

        // Player lost
        await economy.removeMoney(gameState.userId, gameState.bet, 'luck');

        const transaction = new Transaction({
          from: gameState.userId,
          amount: gameState.bet,
          type: 'luck',
          description: `Crash: Crashed at ${formatMultiplier(gameState.crashPoint)} - Lost ${gameState.bet} coins`
        });
        await transaction.save();

        const casinoLog = new CasinoLog({
          userId: gameState.userId,
          game: 'crash',
          betAmount: gameState.bet,
          result: 'lose',
          payout: 0
        });
        await casinoLog.save();

        const user = await economy.getUser(gameState.userId);
        const crashEmbed = embeds.error(
          'Crash - Game Crashed',
          `**Crashed at:** ${formatMultiplier(gameState.crashPoint)}\n**Your Bet:** ${economy.formatMoney(gameState.bet)} coins\n\nThe game crashed before you could cash out\nYou lost **${economy.formatMoney(gameState.bet)} coins**\n\n**New Balance:** ${economy.formatMoney(user.pocket)} coins`
        );

        message.edit({ embeds: [crashEmbed], components: [] });
        return;
      }

      // Update the embed with current multiplier
      const gameEmbed = embeds.info(
        'Crash Game',
        `**Bet:** ${economy.formatMoney(gameState.bet)} coins\n**Current Multiplier:** ${formatMultiplier(gameState.currentMultiplier)}\n**Potential Win:** ${economy.formatMoney(Math.floor(gameState.bet * gameState.currentMultiplier))} coins\n\nThe multiplier is rising! Cash out before it crashes`
      );

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`crash_cashout_${gameState.userId}`)
            .setLabel(`Cash Out (${formatMultiplier(gameState.currentMultiplier)})`)
            .setStyle(ButtonStyle.Success)
        );

      try {
        await message.edit({ embeds: [gameEmbed], components: [buttons] });
      } catch (error) {
        clearInterval(updateInterval);
        activeGames.delete(gameState.userId);
      }
    }, 500); // Update every 500ms
  },

  async handleButton(interaction) {
    const [action, userId] = interaction.customId.split('_').slice(1);

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'This is not your game', flags: 64 });
    }

    const gameState = activeGames.get(userId);
    if (!gameState || gameState.cashedOut) {
      return interaction.reply({ content: 'No active game found', flags: 64 });
    }

    if (action === 'cashout') {
      gameState.cashedOut = true;
      activeGames.delete(userId);

      const payout = Math.floor(gameState.bet * gameState.currentMultiplier);
      const profit = payout - gameState.bet;

      await economy.addMoney(userId, profit, 'luck');

      const transaction = new Transaction({
        to: userId,
        amount: profit,
        type: 'luck',
        description: `Crash: Cashed out at ${formatMultiplier(gameState.currentMultiplier)} - Won ${profit} coins`
      });
      await transaction.save();

      const casinoLog = new CasinoLog({
        userId: userId,
        game: 'crash',
        betAmount: gameState.bet,
        result: 'win',
        payout: payout
      });
      await casinoLog.save();

      const user = await economy.getUser(userId);
      const winEmbed = embeds.success(
        'Crash - Cashed Out',
        `**Cashed out at:** ${formatMultiplier(gameState.currentMultiplier)}\n**Your Bet:** ${economy.formatMoney(gameState.bet)} coins\n**Payout:** ${economy.formatMoney(payout)} coins\n\nYou won **${economy.formatMoney(profit)} coins**\n\n**New Balance:** ${economy.formatMoney(user.pocket)} coins`
      );

      interaction.update({ embeds: [winEmbed], components: [] });
    }
  }
};
