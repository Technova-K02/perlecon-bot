const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'ganglb',
  // aliases: ['glb', 'ganglb', 'gangtop'],
  description: 'View the top gangs leaderboard',
  async execute(message, args) {
    try {
      const gangs = await Gang.find().sort({ vault: -1 }).limit(10);

      if (gangs.length === 0) {
        const embed = embeds.info('Gang Leaderboard', 'No gangs found Be the first to create one');
        return message.channel.send({ embeds: [embed] });
      }

      let leaderboard = '';
      for (let i = 0; i < gangs.length; i++) {
        const gang = gangs[i];
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

        // Get leader name
        let leaderName = 'Unknown';
        try {
          const leader = await message.client.users.fetch(gang.leaderId);
          leaderName = leader.username;
        } catch (error) {
          // Keep default name
        }

        // const winRate = (gang.wins + gang.losses) > 0 ? Math.round((gang.wins / (gang.wins + gang.losses)) * 100) : 0;

        leaderboard += `${i}. **${gang.name}** - ${gang.vault} coins\n`;
        // leaderboard += `   ${leaderName} | ${gang.vault} coins\n\n`;
      }

      const embed = embeds.info('Gang Leaderboard', leaderboard);
      embed.setFooter({ text: 'Rankings based on gang coins' });

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang leaderboard error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting the leaderboard.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





