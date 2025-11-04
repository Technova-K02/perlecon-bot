const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'listgang',
  aliases: ['glist', 'allgangs'],
  description: 'View all gangs in the server',
  async execute(message, args) {
    try {
      const page = parseInt(args[0]) || 1;
      const gangsPerPage = 10;
      const skip = (page - 1) * gangsPerPage;

      const totalGangs = await Gang.countDocuments();
      const gangs = await Gang.find()
        .sort({ power: -1 })
        .skip(skip)
        .limit(gangsPerPage);

      if (gangs.length === 0) {
        const embed = embeds.info('📋 All Gangs', 'No gangs found Be the first to create one');
        return message.channel.send({ embeds: [embed] });
      }

      let gangList = '';
      for (let i = 0; i < gangs.length; i++) {
        const gang = gangs[i];
        const rank = skip + i + 1;
        
        // Get leader name
        let leaderName = 'Unknown';
        try {
          const leader = await message.client.users.fetch(gang.leaderId);
          leaderName = leader.username;
        } catch (error) {
          // Keep default name
        }

        const winRate = (gang.wins + gang.losses) > 0 ? Math.round((gang.wins / (gang.wins + gang.losses)) * 100) : 0;
        
        gangList += `**${rank}.** ${gang.name} | ${gang.members.length}\n`;
        // gangList += `${leaderName} | ${gang.members.length}\n`;
      }

      const totalPages = Math.ceil(totalGangs / gangsPerPage);
      
      const embed = embeds.info('📋 All Gangs', gangList);
      embed.setFooter({ text: `Page ${page}/${totalPages} | Total gangs: ${totalGangs}` });

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang list error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting the gang list.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





