const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'richest',
  description: 'Show the richest user in the server (based on safe coins)',
  async execute(msg) {
    try {
      // Find the richest user in the entire server
      const richestUser = await User.findOne({ bank: { $gt: 0 } }).sort({ bank: -1 });

      if (!richestUser) {
        const embed = embeds.info(
          'No Rich Users',
          'No users have coins in their safe yet.'
        );
        return msg.channel.send({ embeds: [embed] });
      }

      let displayUser;
      
      try {
        displayUser = await msg.client.users.fetch(richestUser.userId);
      } catch (error) {
        displayUser = { username: 'Unknown User' };
      }

      // Get user's gang if they have one
      let gangInfo = 'No Gang';
      if (richestUser.gang) {
        const gang = await Gang.findById(richestUser.gang);
        if (gang) {
          gangInfo = gang.name;
        }
      }

      const embed = embeds.success(
        'Richest User in Server',
        `**${displayUser.username}** is the richest user in the server.\n\n` +
        `Safe Balance: ${economy.formatMoney(richestUser.bank)} coins\n`
        // `Gang: ${gangInfo}`
      );

      // Add top 3 richest users
      const topUsers = await User.find({ bank: { $gt: 0 } }).sort({ bank: -1 }).limit(3);
      
      if (topUsers.length > 1) {
        let topUsersText = '';
        
        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          let userDisplay;
          
          try {
            userDisplay = await msg.client.users.fetch(user.userId);
          } catch (error) {
            userDisplay = { username: 'Unknown User' };
          }

          const position = i + 1;
          const medal = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd';
          
          topUsersText += `${medal} **${userDisplay.username}** - ${economy.formatMoney(user.bank)} coins\n`;
        }

        embed.addFields({
          name: 'Top 3 Richest Users',
          value: topUsersText,
          inline: false
        });
      }

      embed.setFooter({ text: 'Based on safe coins' });

      msg.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Richest command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while finding the richest gang member.');
      msg.channel.send({ embeds: [errorEmbed] });
    }
  }
};