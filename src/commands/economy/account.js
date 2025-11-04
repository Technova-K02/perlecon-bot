const User = require('../../models/User');
const economy = require('../../utils/economy');

module.exports = {
  name: 'coins',
  aliases: ['bal', 'balance', 'acc'],
  description: 'Check your account.',
  async execute(msg) {
    let user = await User.findOne({ userId: msg.author.id });
    if (!user) {
      user = new User({ userId: msg.author.id });
      await user.save();
    }
    msg.channel.send(`Pocket: **${economy.formatMoney(user.pocket)}** coins | Safe: **${economy.formatMoney(user.bank)}** coins`);
  }
};



