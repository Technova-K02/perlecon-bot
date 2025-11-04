const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'View the top users by level and XP',
  async execute(msg, args) {
    try {
      // Get top 10 users by level, then by XP
      const topUsers = await User.find({})
        .sort({ level: -1, xp: -1 })
        .limit(10);

      if (topUsers.length === 0) {
        const noUsersEmbed = embeds.info(
          'Leaderboard',
          'No users found in the database'
        );
        return msg.channel.send({ embeds: [noUsersEmbed] });
      }

      let leaderboardText = '';
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        let username = 'Unknown User';
        
        try {
          const discordUser = await msg.client.users.fetch(user.userId);
          username = discordUser.username;
        } catch (error) {
          // Keep default username
        }

        const position = i + 1;
        const medal = `${position}.`;
        
        leaderboardText += `${medal} **${username}** - Level ${user.level} (${economy.formatNumber(user.xp)} XP)\n`;
      }

      // Find current user's position
      const currentUserRank = await User.countDocuments({
        $or: [
          { level: { $gt: (await User.findOne({ userId: msg.author.id }))?.level || 0 } },
          { 
            level: (await User.findOne({ userId: msg.author.id }))?.level || 0,
            xp: { $gt: (await User.findOne({ userId: msg.author.id }))?.xp || 0 }
          }
        ]
      }) + 1;

      const leaderboardEmbed = embeds.info(
        'Level Leaderboard',
        leaderboardText
      );

      if (currentUserRank > 10) {
        leaderboardEmbed.setFooter({ text: `Your rank: #${currentUserRank}` });
      }

      msg.channel.send({ embeds: [leaderboardEmbed] });
    } catch (error) {
      console.error('Leaderboard error:', error);
      const errorEmbed = embeds.error(
        'Error',
        'Failed to fetch leaderboard data'
      );
      msg.channel.send({ embeds: [errorEmbed] });
    }
  }
};