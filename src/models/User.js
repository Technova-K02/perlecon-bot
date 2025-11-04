const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: String,
  pocket: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  fame: { type: Number, default: 0 },
  gang: { type: mongoose.Schema.Types.ObjectId, ref: 'Gang' },
  cooldowns: { type: Map, of: Number, default: new Map() },
  dailyStreak: { type: Number, default: 0 },
  weeklyStreak: { type: Number, default: 0 },
  lastWeeklyClaim: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  lastStealMessages: { type: Number, default: 0 },
  weeklyTextMessages: { type: Number, default: 0 },
  weeklyVoiceMinutes: { type: Number, default: 0 },
  voiceJoinTime: { type: Number, default: null },
  lastWeeklyReset: { type: Date, default: Date.now },
  inventory: { type: [String], default: [] },
  activeStyles: {
    nameColor: { type: String, default: null }, // Active gradient role
    displayEmoji: { type: String, default: null } // Active cat emoji for bot displays
  },
  // Base and status system
  status: { type: String, enum: ['base', 'outside', 'kidnapped'], default: 'base' },
  guardsWithUser: { type: Number, default: 0 },
  kidnappedUntil: { type: Date, default: null },
  kidnappedBy: { type: String, default: null },
  lastRepairTime: { type: Date, default: null }
});

module.exports = mongoose.model('User', schema);
