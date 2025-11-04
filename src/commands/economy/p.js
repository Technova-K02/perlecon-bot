const User = require('../../models/User');
const economy = require('../../utils/economy');

module.exports = {
  name: 'p',
  aliases: ['pocket'],
  description: 'Check your pocket balance',
  async execute(msg) {
    let user = await User.findOne({ userId: msg.author.id });
    if (!user) {
      user = new User({ userId: msg.author.id });
      await user.save();
    }
    msg.channel.send(`You have **${economy.formatMoney(user.pocket)}** coins in your pocket.`);
  }
};



