const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'kickgang',
  aliases: ['gkick'],
  description: 'Kick a member from your gang',
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

      if (gang.leaderId !== message.author.id) {
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can kick members');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to kick');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Action', 'You cannot kick yourself Use `.gangleave` instead.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!gang.members.includes(targetUser.id)) {
        const errorEmbed = embeds.error('Not a Member', 'This user is not in your gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Remove user from gang
      gang.members = gang.members.filter(memberId => memberId == targetUser.id);
      await gang.save();

      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (targetUserData) {
        targetUserData.gang = null;
        await targetUserData.save();
      }

      const successEmbed = embeds.success(
        'Member Kicked',
        `${targetUser.username} has been kicked from **${gang.name}**`
      );
      message.channel.send({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Gang kick error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while kicking the user.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





