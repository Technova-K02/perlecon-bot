const GangInvitation = require('../models/GangInvitation');

module.exports = {
  async cleanupExpiredInvitations() {
    try {
      const result = await GangInvitation.updateMany(
        { 
          status: 'pending',
          expiresAt: { $lt: new Date() }
        },
        { status: 'expired' }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`Cleaned up ${result.modifiedCount} expired gang invitations`);
      }
      
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      return 0;
    }
  },

  async getUserPendingInvitations(userId) {
    try {
      // Clean up expired invitations first
      await this.cleanupExpiredInvitations();
      
      return await GangInvitation.find({
        inviteeId: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).populate('gangId').sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting user invitations:', error);
      return [];
    }
  },

  async hasValidInvitation(userId) {
    try {
      const invitation = await GangInvitation.findOne({
        inviteeId: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });
      
      return !!invitation;
    } catch (error) {
      console.error('Error checking for valid invitation:', error);
      return false;
    }
  }
};