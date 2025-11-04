const mongoose = require('mongoose');

const gangInvitationSchema = new mongoose.Schema({
  gangId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gang', required: true },
  inviterId: { type: String, required: true }, // User who sent the invite
  inviteeId: { type: String, required: true }, // User who received the invite
  messageId: { type: String, required: true }, // Message ID for reaction handling
  channelId: { type: String, required: true }, // Channel ID where invitation was sent
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'expired'], 
    default: 'pending' 
  },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours
}, { timestamps: true });

// Index for efficient queries
gangInvitationSchema.index({ inviteeId: 1, status: 1 });
gangInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GangInvitation', gangInvitationSchema);