const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'coinslb',
  description: 'Show the coins leaderboard (based on safe/bank coins)',
  async execute(msg) {
    try {
      // Get top 10 users by bank amount
      const topUsers = await User.find()//{ bank: { $gt: 0 } })
        .sort({ bank: -1 })
        .limit(10)
        .populate('gang');

      if (topUsers.length === 0) {
        const errorEmbed = embeds.error('No Data', 'No users have coins in their safe yet');
        return msg.channel.send({ embeds: [errorEmbed] });
      }

      let leaderboardText = '';
      
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        let displayUser;
        
        try {
          displayUser = await msg.client.users.fetch(user.userId);
        } catch (error) {
          displayUser = { username: 'Unknown User' };
        }

        const position = i + 1;
        const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        const gangName = user.gang ? user.gang.name : 'No Gang';
        
        leaderboardText += `${position}. **${displayUser.username}** - ${economy.formatMoney(user.bank)} coins\n`;
        // leaderboardText += `└ Gang: ${gangName}\n\n`;
      }

      const embed = embeds.info(
        'Coins Leaderboard (Safe)',
        `${leaderboardText} `
      );

      // Add user's position if they're not in top 10
      const currentUser = await User.findOne({ userId: msg.author.id });
      if (currentUser && currentUser.bank > 0) {
        const userRank = await User.countDocuments({ bank: { $gt: currentUser.bank } }) + 1;
        if (userRank > 10) {
          embed.addFields({
            name: 'Your Position',
            value: `**#${userRank}** - ${economy.formatMoney(currentUser.bank)} coins`,
            inline: false
          });
        }
      }

      embed.setFooter({ text: 'Based on coins in safe • Use .put to deposit coins' });

      msg.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Coins leaderboard error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while fetching the coins leaderboard.');
      msg.channel.send({ embeds: [errorEmbed] });
    }
  }
};