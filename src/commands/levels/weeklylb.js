const User = require('../../models/User');

module.exports = {
  name: 'lb',
  // aliases: ['wlb', 'weeklyboard'],
  description: 'View weekly activity leaderboard',
  async execute(message) {
    try {
      // Get top 10 users by combined score
      const users = await User.find({
        $or: [
          { weeklyTextMessages: { $gt: 0 } },
          { weeklyVoiceMinutes: { $gt: 0 } }
        ]
      });

      if (users.length === 0) {
        return message.channel.send('No weekly activity yet Start chatting and join voice channels to compete');
      }

      // Calculate XP (1 XP per message + 1 XP per voice minute) and sort
      const rankedUsers = users.map(user => ({
        ...user.toObject(),
        weeklyXP: user.weeklyTextMessages + user.weeklyVoiceMinutes
      })).sort((a, b) => b.weeklyXP - a.weeklyXP).slice(0, 10);

      let leaderboard = '**Weekly Activity Leaderboard**\n*1 XP per message + 1 XP per voice minute*\n*Resets every Sunday night*\n\n';
      
      for (let i = 0; i < rankedUsers.length; i++) {
        const user = rankedUsers[i];
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        
        try {
          const discordUser = await message.client.users.fetch(user.userId);
          leaderboard += `${medal} **${discordUser.username}** - ${user.weeklyXP} XP\n`;
        } catch (error) {
          leaderboard += `${medal} **Unknown User** - ${user.weeklyXP} XP\n`;
        }
      }

      // Calculate next reset
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(0, 0, 0, 0);
      
      leaderboard += `\n**Next Reset:** ${nextSunday.toLocaleDateString()}`;
      leaderboard += `\n\nUse \`.weeklyrank\` to see your personal stats`;

      message.channel.send(leaderboard);
    } catch (error) {
      console.error('Weekly leaderboard error:', error);
      message.channel.send('❌ An error occurred while getting the weekly leaderboard.');
    }
  }
};


