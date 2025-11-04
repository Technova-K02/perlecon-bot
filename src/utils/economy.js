const User = require('../models/User');
const Transaction = require('../models/Transaction');

module.exports = {
  async getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId });
      await user.save();
    }
    return user;
  },

  async addMoney(userId, amount, type = 'admin') {
    const user = await this.getUser(userId);
    user.pocket += amount;
    await user.save();

    const transaction = new Transaction({
      to: userId,
      amount,
      type
    });
    await transaction.save();

    return user;
  },

  async removeMoney(userId, amount, type = 'admin') {
    const user = await this.getUser(userId);
    if (user.pocket < amount) return null;

    user.pocket -= amount;
    await user.save();

    const transaction = new Transaction({
      from: userId,
      amount,
      type
    });
    await transaction.save();

    return user;
  },

  async transferMoney(fromId, toId, amount) {
    const fromUser = await this.getUser(fromId);
    const toUser = await this.getUser(toId);

    if (fromUser.pocket < amount) return null;

    fromUser.pocket -= amount;
    toUser.pocket += amount;

    await fromUser.save();
    await toUser.save();

    const transaction = new Transaction({
      from: fromId,
      to: toId,
      amount,
      type: 'transfer'
    });
    await transaction.save();

    return { fromUser, toUser };
  },

  async depositMoney(userId, amount) {
    const user = await this.getUser(userId);
    if (user.pocket < amount) return null;

    user.pocket -= amount;
    user.bank += amount;
    await user.save();

    const transaction = new Transaction({
      from: userId,
      to: userId,
      amount,
      type: 'put',
      description: 'Safe put'
    });
    await transaction.save();

    return user;
  },

  async withdrawMoney(userId, amount) {
    const user = await this.getUser(userId);
    if (user.bank < amount) return null;

    user.bank -= amount;
    user.pocket += amount;
    await user.save();

    const transaction = new Transaction({
      from: userId,
      to: userId,
      amount,
      type: 'take',
      description: 'Safe take'
    });
    await transaction.save();

    return user;
  },

  formatMoney(amount) {
    return this.formatNumber(amount);
  },

  formatNumber(num) {
    // Convert to integer if it's a float
    const number = Math.floor(num);
    
    // Use toLocaleString to add commas
    return number.toLocaleString('en-US');
  }
};
