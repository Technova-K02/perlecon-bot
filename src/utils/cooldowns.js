const Cooldown = require('../models/Cooldown');

module.exports = {
  async setCooldown(userId, command, duration) {
    const expiresAt = new Date(Date.now() + duration);
    
    await Cooldown.findOneAndUpdate(
      { userId, command },
      { expiresAt },
      { upsert: true }
    );
  },

  async getCooldown(userId, command) {
    const cooldown = await Cooldown.findOne({ userId, command });
    if (!cooldown) return null;
    
    if (cooldown.expiresAt <= new Date()) {
      await Cooldown.deleteOne({ userId, command });
      return null;
    }
    
    return cooldown.expiresAt;
  },

  async removeCooldown(userId, command) {
    await Cooldown.deleteOne({ userId, command });
  },

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
};
