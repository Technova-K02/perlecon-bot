const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const { formatKidnapTime } = require('../../utils/kidnapping');

module.exports = {
  name: 'hostages',
  description: 'See who your gang is holding and how long remains',
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

      // Find all users kidnapped by gang members
      const kidnappedUsers = await User.find({
        status: 'kidnapped',
        kidnappedUntil: { $gt: new Date() } // Still kidnapped
      });

      // Filter to only show users kidnapped by this gang's members
      const gangMembers = gang.members;
      const gangHostages = [];

      for (const kidnappedUser of kidnappedUsers) {
        if (gangMembers.includes(kidnappedUser.kidnappedBy)) {
          try {
            const kidnapper = await message.client.users.fetch(kidnappedUser.kidnappedBy);
            const victim = await message.client.users.fetch(kidnappedUser.userId);
            const timeRemaining = kidnappedUser.kidnappedUntil.getTime() - Date.now();
            
            gangHostages.push({
              victim: victim.username,
              kidnapper: kidnapper.username,
              timeRemaining: timeRemaining,
              releaseTime: kidnappedUser.kidnappedUntil
            });
          } catch (error) {
            // Skip if user not found
            continue;
          }
        }
      }

      let hostagesList = '';
      if (gangHostages.length === 0) {
        hostagesList = 'No active hostages.\n\nUse `.kidnap <@user>` to kidnap someone who is outside their base.';
      } else {
        hostagesList = `**Active Hostages (${gangHostages.length}):**\n\n`;
        
        gangHostages.forEach((hostage, index) => {
          const timeLeft = formatKidnapTime(hostage.timeRemaining);
          hostagesList += `**${index + 1}.** ${hostage.victim}\n`;
          hostagesList += `└ Kidnapped by: ${hostage.kidnapper}\n`;
          hostagesList += `└ Time remaining: ${timeLeft}\n`;
          // hostagesList += `└ Released at: <t:${Math.floor(hostage.releaseTime.getTime() / 1000)}:R>\n\n`;
        });
      }

      const embed = embeds.info(
        `${gang.name} Hostages`,
        hostagesList
      );

      if (gangHostages.length > 0) {
        embed.addFields(
          { name: 'Gang Stats', value: `**Total Kidnaps:** ${gang.kidnaps}`, inline: true }
          // { name: 'Kidnapping', value: 'Use `.kidnap <@user>` to kidnap more people\n*Targets must be outside their base*', inline: true }
        );
      }

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Hostages error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while viewing hostages.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





