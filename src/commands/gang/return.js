const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'return',
  description: 'Return to your gang base (safe from raids and kidnaps)',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'kidnapped') {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot return to base');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'base') {
        const errorEmbed = embeds.error('Already at Base', 'You are already at your base');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Return guards to base
      const guardsReturning = user.guardsWithUser;
      if (guardsReturning > 0) {
        gang.base.guards += guardsReturning;
        await gang.save();
      }

      // Update user status
      user.status = 'base';
      user.guardsWithUser = 0;
      await user.save();

      const embed = embeds.success(
        'Returned to Base',
        `You have safely returned to your base.\n\n`
        // `**Guards returned:** ${guardsReturning}\n` +
        // `**Total base guards:** ${gang.base.guards}\n\n` +
        // `**Safe:** You are now protected from kidnapping and raids!`
      );

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Return error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while returning to base.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};