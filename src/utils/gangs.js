const Gang = require('../models/Gang');
const User = require('../models/User');

module.exports = {
  // Calculate Gang Safe limit based on level
  getVaultLimit(gangLevel) {
    // Base limit of 10K coins, increases by 25K per level
    // Level 1: 10K, Level 2: 35K, Level 3: 60K, etc.
    return 10000 + ((gangLevel - 1) * 25000);
  },

  // Get base stats for vault capacity
  getBaseStats(level) {
    const baseData = {
      1: { name: 'Trailer', maxHP: 250, safeCapacity: 10000, maxGuards: 4, maxMedics: 2, upgradeCost: 0 },
      2: { name: 'Cabin', maxHP: 500, safeCapacity: 20000, maxGuards: 6, maxMedics: 3, upgradeCost: 10000 },
      3: { name: 'Warehouse', maxHP: 900, safeCapacity: 35000, maxGuards: 8, maxMedics: 4, upgradeCost: 20000 },
      4: { name: 'Bunker', maxHP: 1400, safeCapacity: 55000, maxGuards: 10, maxMedics: 5, upgradeCost: 35000 },
      5: { name: 'Compound', maxHP: 2000, safeCapacity: 80000, maxGuards: 12, maxMedics: 6, upgradeCost: 55000 },
      6: { name: 'Fortress', maxHP: 2800, safeCapacity: 110000, maxGuards: 14, maxMedics: 7, upgradeCost: 80000 },
      7: { name: 'Citadel', maxHP: 3800, safeCapacity: 150000, maxGuards: 16, maxMedics: 8, upgradeCost: 110000 },
      8: { name: 'Kingdom', maxHP: 5000, safeCapacity: 200000, maxGuards: 18, maxMedics: 9, upgradeCost: 150000 }
    };
    return baseData[level] || baseData[1];
  },

  // Safe vault operations to prevent negative or over-limit balances
  safeVaultTransfer(fromGang, toGang, amount) {
    // Ensure from gang doesn't go negative
    const actualAmount = Math.min(amount, fromGang.vault);
    
    // Get to gang vault limit
    const toBaseLevel = toGang.base?.level || 1;
    const toVaultLimit = this.getBaseStats(toBaseLevel).safeCapacity;
    
    // Ensure to gang doesn't exceed limit
    const maxCanReceive = toVaultLimit - toGang.vault;
    const finalAmount = Math.min(actualAmount, maxCanReceive);
    
    // Perform safe transfer
    fromGang.vault = Math.max(0, fromGang.vault - finalAmount);
    toGang.vault = Math.min(toVaultLimit, toGang.vault + finalAmount);
    
    return finalAmount;
  },

  async createGang(leaderId, name) {
    const existingGang = await Gang.findOne({ name });
    if (existingGang) return null;
    
    const gang = new Gang({
      name,
      leaderId,
      members: [leaderId]
    });
    
    await gang.save();
    
    // Update user's gang reference
    await User.findOneAndUpdate(
      { userId: leaderId },
      { gang: gang._id }
    );
    
    return gang;
  },

  async joinGang(userId, gangId) {
    const gang = await Gang.findById(gangId);
    if (!gang || gang.members.length >= 10) return null;
    
    gang.members.push(userId);
    await gang.save();
    
    await User.findOneAndUpdate(
      { userId },
      { gang: gang._id }
    );
    
    return gang;
  },

  async leaveGang(userId) {
    const user = await User.findOne({ userId }).populate('gang');
    if (!user || !user.gang) return null;
    
    const gang = user.gang;
    gang.members = gang.members.filter(id => id !== userId);
    
    if (gang.leaderId !== userId && gang.members.length > 0) {
      gang.leaderId = gang.members[0];
    }
    
    if (gang.members.length === 0) {
      await Gang.findByIdAndDelete(gang._id);
    } else {
      await gang.save();
    }
    
    user.gang = null;
    await user.save();
    
    return gang;
  }
};
