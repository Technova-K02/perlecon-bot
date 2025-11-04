const Gang = require('../models/Gang');
const User = require('../models/User');

module.exports = {
  // Calculate Gang Safe limit based on level
  getVaultLimit(gangLevel) {
    // Base limit of 10K coins, increases by 25K per level
    // Level 1: 10K, Level 2: 35K, Level 3: 60K, etc.
    return 10000 + ((gangLevel - 1) * 25000);
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
