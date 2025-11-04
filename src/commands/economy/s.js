const User = require('../../models/User');
const economy = require('../../utils/economy');

module.exports = {
  name: 's',
  aliases: ['safe'],
  description: 'Check your or someone else\'s safe balance',
  async execute(msg, args) {
    let targetUser = msg.author;

    // Check for mentioned user
    if (msg.mentions.users.first()) {
      targetUser = msg.mentions.users.first();
    }
    // Check for user ID in args
    else if (args[0] && !isNaN(args[0])) {
      try {
        targetUser = await msg.client.users.fetch(args[0]);
      } catch (error) {
        return msg.channel.send('Could not find a user with that ID.');
      }
    }
    // Check for username in args
    else if (args[0]) {
      const username = args.join(' ').toLowerCase();
      const guild = msg.guild;
      const member = guild.members.cache.find(m =>
        m.user.username.toLowerCase().includes(username) ||
        m.displayName.toLowerCase().includes(username)
      );
      if (member) {
        targetUser = member.user;
      } else {
        return msg.channel.send(`Could not find a user with username containing "${args.join(' ')}".`);
      }
    }

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id });
      await user.save();
    }

    const isOwn = targetUser.id === msg.author.id;
    const pronoun = isOwn ? 'You have' : `${targetUser.username} has`;
    const possessive = isOwn ? 'your' : 'their';

    msg.channel.send(`${pronoun} **${economy.formatMoney(user.bank)}** coins in ${possessive} safe.`);
  }
};



