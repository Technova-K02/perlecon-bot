const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'searchgang132',
  aliases: ['gsearch', 'findgang'],
  description: 'Search for gangs by name',
  async execute(message, args) {
    try {
      const searchTerm = args.join(' ');
      if (!searchTerm) {
        const errorEmbed = embeds.error('Invalid Search', 'Please provide a gang name to search for');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gangs = await Gang.find({ 
        name: { $regex: new RegExp(searchTerm, 'i') } 
      }).sort({ power: -1 }).limit(10);

      if (gangs.length === 0) {
        const embed = embeds.info('🔍 Gang Search', `No gangs found matching "${searchTerm}"`);
        return message.channel.send({ embeds: [embed] });
      }

      let results = '';
      for (const gang of gangs) {
        // Get leader name
        let leaderName = 'Unknown';
        try {
          const leader = await message.client.users.fetch(gang.leaderId);
          leaderName = leader.username;
        } catch (error) {
          // Keep default name
        }

        const winRate = (gang.wins + gang.losses) > 0 ? Math.round((gang.wins / (gang.wins + gang.losses)) * 100) : 0;
        
        results += `**${gang.name}**\n`;
        results += `👑 ${leaderName} | 💪 ${gang.power} | 👥 ${gang.members.length} | 📈 ${winRate}%\n\n`;
      }

      const embed = embeds.info(`🔍 Search Results for "${searchTerm}"`, results);
      embed.setFooter({ text: `Found ${gangs.length} gang(s)` });

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang search error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while searching for gangs.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





