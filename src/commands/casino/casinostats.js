const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const casino = require('../../utils/casino');
const CasinoLog = require('../../models/CasinoLog');

module.exports = {
  name: 'luckstats',
  description: 'View your casino luck statistics',
  async execute(msg, args) {
    const targetUser = msg.mentions.users.first() || msg.author;
    const stats = await casino.getStats(targetUser.id);

    if (stats.totalGames === 0) {
      const noStatsEmbed = embeds.info(
        'Luck Statistics',
        `${targetUser.id === msg.author.id ? 'You have' : `${targetUser.username} has`} not played any casino games yet`
      );
      return msg.channel.send({ embeds: [noStatsEmbed] });
    }

    // Get game-specific stats
    const gameStats = await CasinoLog.aggregate([
      { $match: { userId: targetUser.id } },
      {
        $group: {
          _id: '$game',
          totalGames: { $sum: 1 },
          totalBet: { $sum: '$betAmount' },
          totalWon: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, '$payout', 0] } },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } }
        }
      },
      { $sort: { totalGames: -1 } }
    ]);

    let gameBreakdown = '';
    for (const game of gameStats.slice(0, 5)) { // Top 5 games
      const winRate = ((game.wins / game.totalGames) * 100).toFixed(1);
      const profit = game.totalWon - game.totalBet;
      const profitStr = profit >= 0 ? `+${economy.formatMoney(profit)}` : `-${economy.formatMoney(Math.abs(profit))}`;
      
      gameBreakdown += `**${game._id.charAt(0).toUpperCase() + game._id.slice(1)}:** ${game.totalGames} games, ${winRate}% wins, ${profitStr}\n`;
    }

    const profitColor = stats.netProfit >= 0 ? '🟢' : '🔴';
    const profitStr = stats.netProfit >= 0 ? `+${economy.formatMoney(stats.netProfit)}` : `-${economy.formatMoney(Math.abs(stats.netProfit))}`;

    const statsEmbed = embeds.info(
      `Luck Statistics - ${targetUser.username}`,
      `**Total Games:** ${stats.totalGames}\n` +
      `**Wins:** ${stats.wins} (${stats.winRate}%)\n` +
      `**Losses:** ${stats.losses}\n` +
      `**Total Bet:** ${economy.formatMoney(stats.totalBet)} coins\n` +
      `**Total Won:** ${economy.formatMoney(stats.totalWon)} coins\n` +
      `**Net Profit:** ${profitColor} ${profitStr} coins\n\n` 
      // `**Game Breakdown:**\n${gameBreakdown || 'No games played yet'}`
    );

    msg.channel.send({ embeds: [statsEmbed] });
  }
};
