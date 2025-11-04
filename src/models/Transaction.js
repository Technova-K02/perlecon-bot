const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  from: { type: String },
  to: { type: String },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['work', 'luck', 'transfer', 'admin', 'put', 'take', 'steal_success', 'steal_caught', 'daily', 'weekly', 'shop', 'booster_reward'], required: true },
  date: { type: Date, default: Date.now },
  description: { type: String }
});

module.exports = mongoose.model('Transaction', transactionSchema);
