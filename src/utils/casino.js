const CasinoLog = require('../models/CasinoLog');

module.exports = {
  async getStats(userId) {
    const logs = await CasinoLog.find({ userId });
    
    const stats = {
      totalGames: logs.length,
      wins: logs.filter(log => log.result === 'win').length,
      losses: logs.filter(log => log.result === 'lose').length,
      totalBet: logs.reduce((sum, log) => sum + log.betAmount, 0),
      totalWon: logs.filter(log => log.result === 'win').reduce((sum, log) => sum + log.payout, 0),
      netProfit: 0
    };
    
    stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames * 100).toFixed(1) : 0;
    stats.netProfit = stats.totalWon - stats.totalBet;
    
    return stats;
  },

  calculatePayout(betAmount, multiplier, houseEdge = 0.05) {
    return Math.floor(betAmount * multiplier * (1 - houseEdge));
  }
};
