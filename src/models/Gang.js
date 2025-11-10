const mongoose = require('mongoose');

const gangSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  leaderId: { type: String, required: true },
  members: [{ type: String }],
  vault: { type: Number, default: 0 },
  power: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  description: { type: String, default: 'No description set.' },
  level: { type: Number, default: 1 },
  // experience: { type: Number, default: 0 },
  maxMembers: { type: Number, default: 10 },
  isPublic: { type: Boolean, default: true },
  totalEarnings: { type: Number, default: 0 },
  totalBattles: { type: Number, default: 0 },
  lastBattleTime: { type: Date, default: null },
  officers: [{ type: String }],
  banned: [{ type: String }],
  // Criminal activities stats
  raids: { type: Number, default: 0 },
  kidnaps: { type: Number, default: 0 },
  robs: { type: Number, default: 0 },
  // Base system
  base: {
    level: { type: Number, default: 1 },
    // guards: { type: Number, default: 4 }, // Start with 4 guards (Trailer level)
    defenses: { type: Number, default: 0 },
    hp: { type: Number, default: 250 }, // Start with 250 HP (Trailer level)
    lastRaid: { type: Date, default: null }
  },
  // Combat cooldowns
  lastRaidTime: { type: Date, default: null },
  // Gang resources
  army: {
    guards: { type: Number, default: 0 },
    medics: { type: Number, default: 0 },
    // Individual guard and medic levels (arrays of levels)
    guardLevels: [{ type: Number, default: 1 }],
    medicLevels: [{ type: Number, default: 1 }]
  },
  hostages: { type: Number, default: 0 },
  tools: {
    basicLockpick: { type: Number, default: 0 },
    steelLockpick: { type: Number, default: 0 },
    titanLockpick: { type: Number, default: 0 },
    breachCharge: { type: Number, default: 0 }
  },
  // Gang upgrades (all start at level 1)
  upgrades: {
    weapons: { type: Number, default: 1 },
    walls: { type: Number, default: 1 },
    guardsTraining: { type: Number, default: 1 },
    medicTraining: { type: Number, default: 1 }
  },
  settings: {
    allowInvites: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    minLevelToJoin: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Gang', gangSchema);
