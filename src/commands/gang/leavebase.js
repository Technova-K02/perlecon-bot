const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'leavebase',
  description: 'Leave your gang base (makes you vulnerable to kidnapping)',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'kidnapped') {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot leave the base');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'outside') {
        const errorEmbed = embeds.error('Already Outside', 'You are already outside the base');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      let guardsToTake = 0;
      if (args[0]) {
        guardsToTake = parseInt(args[0]);
        if (isNaN(guardsToTake) || guardsToTake < 0) {
          const errorEmbed = embeds.error('Invalid Number', 'Please specify a valid number of guards');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        if (guardsToTake > gang.army.guards) {
          const errorEmbed = embeds.error('Not Enough Guards', `Your base only has ${gang.army.guards} guards available`);
          return message.channel.send({ embeds: [errorEmbed] });
        }
      }

      // Update user status
      user.status = 'outside';
      user.guardsWithUser = guardsToTake;
      await user.save();

      // Remove guards from base temporarily
      if (guardsToTake > 0) {
        gang.army.guards -= guardsToTake;
        await gang.save();
      }

      const embed = embeds.success(
        'Left Base',
        `You have left the base with **${user.guardsWithUser}** guards.\n`
      );

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Leave base error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while leaving the base.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};