const User = require('../models/User');
const config = require('../config/config');

module.exports = {
  calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / config.leveling.baseXpRequired)) + 1;
  },

  calculateXpForLevel(level) {
    return Math.pow(level - 1, 2) * config.leveling.baseXpRequired;
  },

  async addXp(userId, amount) {
    const user = await User.findOne({ userId });
    if (!user) return null;

    const oldLevel = user.level;
    user.xp += amount;
    user.level = this.calculateLevel(user.xp);
    user.weeklyXP += amount;
    
    await user.save();
    
    return {
      user,
      leveledUp: user.level > oldLevel,
      oldLevel,
      newLevel: user.level
    };
  },
  // async addWeeklyXp(userId, amount) {
  //   const user = await User.findOne({ userId });
  //   if (!user) return null;

  //   const oldLevel = user.level;
  //   user.weeklyXP += amount;
  //   // user.level = this.calculateLevel(user.weeklyXP);
    
  //   await user.save();
    
    // return {
    //   user,
    //   leveledUp: user.level > oldLevel,
    //   oldLevel,
    //   newLevel: user.level
    // };
  // },

  getXpProgress(user) {
    const currentLevelXp = this.calculateXpForLevel(user.level);
    const nextLevelXp = this.calculateXpForLevel(user.level + 1);
    const progress = user.xp - currentLevelXp;
    const needed = nextLevelXp - currentLevelXp;
    
    return {
      current: progress,
      needed,
      percentage: Math.floor((progress / needed) * 100)
    };
  }
};
