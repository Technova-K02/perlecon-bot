const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const GRID_SIZE = 25; // 5x5 grid
const activeGames = new Map();

function createMineField(mineCount) {
  const field = Array(GRID_SIZE).fill(false);
  
  // Place mines randomly
  const minePositions = [];
  while (minePositions.length < mineCount) {
    const pos = Math.floor(Math.random() * GRID_SIZE);
    if (!minePositions.includes(pos)) {
      minePositions.push(pos);
      field[pos] = true;
    }
  }
  
  return field;
}

function calculateMultiplier(revealed, totalSafe, mineCount) {
  if (revealed === 0) return 1;
  
  // Calculate multiplier based on risk
  const baseMultiplier = 1.1;
  const riskFactor = mineCount / (GRID_SIZE - mineCount);
  return Math.pow(baseMultiplier + riskFactor * 0.1, revealed);
}

function createGameBoard(gameState) {
  const buttons = [];
  
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = Math.floor(i / 5);
    if (!buttons[row]) buttons[row] = new ActionRowBuilder();
    
    let emoji = '⬜';
    let disabled = false;
    
    if (gameState.revealed[i]) {
      emoji = gameState.mines[i] ? '💣' : '💎';
      disabled = true;
    }
    
    buttons[row].addComponents(
      new ButtonBuilder()
        .setCustomId(`mines_reveal_${gameState.userId}_${i}`)
        .setEmoji(emoji)
        .setStyle(gameState.revealed[i] ? 
          (gameState.mines[i] ? ButtonStyle.Danger : ButtonStyle.Success) : 
          ButtonStyle.Secondary)
        .setDisabled(disabled || gameState.gameOver)
    );
  }
  
  // Add cash out button
  if (!gameState.gameOver && gameState.revealedCount > 0) {
    buttons.push(new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`mines_cashout_${gameState.userId}`)
          .setLabel(`Cash Out (${calculateMultiplier(gameState.revealedCount, GRID_SIZE - gameState.mineCount, gameState.mineCount).toFixed(2)}x)`)
          .setStyle(ButtonStyle.Success)
      ));
  }
  
  return buttons;
}

module.exports = {
  name: 'mines',
  description: 'Find diamonds while avoiding mines',
  async execute(msg, args) {
    if (args.length < 2) {
      const helpEmbed = embeds.info(
        '💣 Mines Help',
        '**Usage:** `mines <amount> <mine_count>`\n\n' +
        '• **Amount:** Your bet amount\n' +
        '• **Mine Count:** Number of mines (1-20)\n' +
        '• **Grid:** 5x5 (25 tiles total)\n' +
        '• **Goal:** Find diamonds, avoid mines\n' +
        '• **Strategy:** More mines = higher multipliers\n\n' +
        '**Examples:**\n`mines 100 3` - 3 mines, safer\n`mines 500 10` - 10 mines, riskier'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const bet = parseInt(args[0]);
    const mineCount = parseInt(args[1]);

    if (isNaN(bet) || bet <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet Amount',
        'Please enter a valid bet amount'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    if (isNaN(mineCount) || mineCount < 1 || mineCount > 20) {
      const errorEmbed = embeds.error(
        'Invalid Mine Count',
        'Mine count must be between 1 and 20'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    if (activeGames.has(msg.author.id)) {
      const errorEmbed = embeds.error(
        'Game in Progress',
        'You already have an active mines game'
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

    const gameState = {
      userId: msg.author.id,
      bet,
      mineCount,
      mines: createMineField(mineCount),
      revealed: Array(GRID_SIZE).fill(false),
      revealedCount: 0,
      gameOver: false
    };

    activeGames.set(msg.author.id, gameState);

    const gameEmbed = embeds.info(
      '💣 Mines Game',
      `**Bet:** ${economy.formatMoney(bet)} coins\n` +
      `**Mines:** ${mineCount}\n` +
      `**Safe Tiles:** ${GRID_SIZE - mineCount}\n` +
      `**Current Multiplier:** 1.00x\n\n` +
      `Click tiles to reveal diamonds. Avoid the mines!`
    );

    const buttons = createGameBoard(gameState);
    msg.channel.send({ embeds: [gameEmbed], components: buttons });
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const userId = parts[2];
    
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'This is not your game', flags: 64 });
    }

    const gameState = activeGames.get(userId);
    if (!gameState || gameState.gameOver) {
      return interaction.reply({ content: 'No active game found', flags: 64 });
    }

    if (action === 'reveal') {
      const position = parseInt(parts[3]);
      
      if (gameState.revealed[position]) {
        return interaction.reply({ content: 'Tile already revealed', flags: 64 });
      }

      gameState.revealed[position] = true;
      
      if (gameState.mines[position]) {
        // Hit a mine - game over
        gameState.gameOver = true;
        activeGames.delete(userId);
        
        // Reveal all mines
        for (let i = 0; i < GRID_SIZE; i++) {
          if (gameState.mines[i]) {
            gameState.revealed[i] = true;
          }
        }

        await economy.removeMoney(userId, gameState.bet, 'luck');

        const transaction = new Transaction({
          from: userId,
          amount: gameState.bet,
          type: 'luck',
          description: `Mines: Hit mine - Lost ${gameState.bet} coins`
        });
        await transaction.save();

        const casinoLog = new CasinoLog({
          userId: userId,
          game: 'mines',
          betAmount: gameState.bet,
          result: 'lose',
          payout: 0
        });
        await casinoLog.save();

        const user = await economy.getUser(userId);
        const loseEmbed = embeds.error(
          '💣 Mines - You Hit a Mine',
          `**Diamonds Found:** ${gameState.revealedCount}\n` +
          `**Mines Hit:** 1\n\n` +
          `You hit a mine and lost **${economy.formatMoney(gameState.bet)} coins**\n\n` +
          `**New Balance:** ${economy.formatMoney(user.pocket)} coins`
        );

        const buttons = createGameBoard(gameState);
        interaction.update({ embeds: [loseEmbed], components: buttons });
      } else {
        // Found a diamond
        gameState.revealedCount++;
        const multiplier = calculateMultiplier(gameState.revealedCount, GRID_SIZE - gameState.mineCount, gameState.mineCount);
        const potentialWin = Math.floor(gameState.bet * multiplier);

        const gameEmbed = embeds.info(
          '💣 Mines Game',
          `**Bet:** ${economy.formatMoney(gameState.bet)} coins\n` +
          `**Mines:** ${gameState.mineCount}\n` +
          `**Diamonds Found:** ${gameState.revealedCount}\n` +
          `**Current Multiplier:** ${multiplier.toFixed(2)}x\n` +
          `**Potential Win:** ${economy.formatMoney(potentialWin)} coins\n\n` +
          `Keep going or cash out!`
        );

        const buttons = createGameBoard(gameState);
        interaction.update({ embeds: [gameEmbed], components: buttons });
      }
    } else if (action === 'cashout') {
      gameState.gameOver = true;
      activeGames.delete(userId);

      const multiplier = calculateMultiplier(gameState.revealedCount, GRID_SIZE - gameState.mineCount, gameState.mineCount);
      const payout = Math.floor(gameState.bet * multiplier);
      const profit = payout - gameState.bet;

      await economy.addMoney(userId, profit, 'luck');

      const transaction = new Transaction({
        to: userId,
        amount: profit,
        type: 'luck',
        description: `Mines: Cashed out with ${gameState.revealedCount} diamonds - Won ${profit} coins`
      });
      await transaction.save();

      const casinoLog = new CasinoLog({
        userId: userId,
        game: 'mines',
        betAmount: gameState.bet,
        result: 'win',
        payout: payout
      });
      await casinoLog.save();

      const user = await economy.getUser(userId);
      const winEmbed = embeds.success(
        '💎 Mines - Cashed Out',
        `**Diamonds Found:** ${gameState.revealedCount}\n` +
        `**Final Multiplier:** ${multiplier.toFixed(2)}x\n` +
        `**Payout:** ${economy.formatMoney(payout)} coins\n\n` +
        `You won **${economy.formatMoney(profit)} coins**\n\n` +
        `**New Balance:** ${economy.formatMoney(user.pocket)} coins`
      );

      const buttons = createGameBoard(gameState);
      interaction.update({ embeds: [winEmbed], components: buttons });
    }
  }
};
