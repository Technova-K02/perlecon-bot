const User = require('../../models/User');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'weeklylb',
  aliases: ['weeklyrank', 'wr', 'wrank'],
  description: 'View weekly activity leaderboard',
  async execute(message) {
    try {
      return await showWeeklyRankings(message);
    } catch (error) {
      console.error('Weekly rank error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting weekly rankings.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

async function showWeeklyRankings(message) {
  // Get all users with activity and calculate their XP (1 XP per message + 1 XP per voice minute)
  const users = await User.find({
    $or: [
      { weeklyTextMessages: { $gt: 0 } },
      { weeklyVoiceMinutes: { $gt: 0 } }
    ]
  });

  if (users.length === 0) {
    return message.channel.send('No activity this week yet.');
  }

  // Calculate XP and sort users
  const rankedUsers = users.map(user => ({
    ...user.toObject(),
    weeklyXP: user.weeklyTextMessages + user.weeklyVoiceMinutes
  })).sort((a, b) => b.weeklyXP - a.weeklyXP);

  // Get top 10 users
  const top10 = rankedUsers.slice(0, 10);

  // Find current user's rank
  const currentUser = await User.findOne({ userId: message.author.id });
  let userRank = null;
  let userXP = 0;

  if (currentUser) {
    userXP = currentUser.weeklyTextMessages + currentUser.weeklyVoiceMinutes;
    userRank = rankedUsers.findIndex(user => user.userId === message.author.id) + 1;
  }

  // Build leaderboard embed
  const embed = embeds.info('Weekly Leaderboard', 'Top 10 users by weekly XP (1 XP per message + 1 XP per voice minute)');

  let description = '';
  for (let i = 0; i < top10.length; i++) {
    const user = top10[i];
    const rank = i + 1;
    const medal = `${rank}.`;

    try {
      const discordUser = await message.client.users.fetch(user.userId);
      description += `${medal} **${discordUser.username}** - ${user.weeklyXP} XP\n`;
    } catch (error) {
      description += `${medal} **Unknown User** - ${user.weeklyXP} XP\n`;
    }
  }

  embed.setDescription(description);
  embed.addFields({ name: 'Resets', value: getNextSundayDate(), inline: true });

  // Add user's rank in footer
  if (userRank) {
    embed.setFooter({ text: `Your rank: #${userRank} with ${userXP} XP` });
  } else {
    embed.setFooter({ text: 'You have no activity this week yet' });
  }

  message.channel.send({ embeds: [embed] });
}

function getNextSundayDate() {
  const now = new Date();
  const nextSunday = new Date();
  nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday.toLocaleDateString();
}


