const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'members',
  aliases: ['gmembers', 'ganglist'],
  description: 'View your gang members',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      let membersList = '';
      
      // Add leader
      try {
        const leader = await message.client.users.fetch(gang.leaderId);
        membersList += `👑 **${leader.username}** (Leader)\n`;
      } catch (error) {
        membersList += `👑 **Unknown User** (Leader)\n`;
      }

      // Add members
      for (const memberId of gang.members) {
        if (memberId == gang.leaderId) {
          try {
            const member = await message.client.users.fetch(memberId);
            membersList += `👤 **${member.username}**\n`;
          } catch (error) {
            membersList += `👤 **Unknown User**\n`;
          }
        }
      }

      const embed = embeds.info(
        `👥 ${gang.name} Gang Members`,
        membersList || 'No members found'
      );
      
      embed.addFields(
        { name: 'Total Members', value: `${gang.members.length}`, inline: true },
        // { name: 'Gang Power', value: `${gang.power}`, inline: true },
        { name: 'W/L Record', value: `${gang.wins}/${gang.losses}`, inline: true }
      );

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang members error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting gang members.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





