require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  prefix: process.env.PREFIX || '.',
  ownerId: process.env.OWNER_ID,

  // Economy settings
  economy: {
    workCooldown: 3600000, // 1 hour
    workMinPay: 100,
    workMaxPay: 500,
    dailyCooldown: 86400000, // 24 hours
    dailyAmount: 1000
  },

  // Casino settings
  casino: {
    minBet: 10,
    maxBet: 10000,
    houseEdge: 0.05
  },

  // Leveling settings
  leveling: {
    xpPerMessage: Math.floor(Math.random() * 10 + 15),
    xpCooldown: 0, // 0 second
    baseXpRequired: 100
  },

  // Gang settings
  gangs: {
    createCost: 0,
    maxMembers: 10,
    battleCooldown: 3600000 // 1 hour
  }
};
