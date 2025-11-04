const mongoose = require('mongoose');

const casinoLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  game: { type: String, required: true },
  betAmount: { type: Number, required: true },
  result: { type: String, enum: ['win', 'lose', 'draw'], required: true },
  payout: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CasinoLog', casinoLogSchema);
