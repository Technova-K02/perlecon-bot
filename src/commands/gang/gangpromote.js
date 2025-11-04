const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'promotegang',
  aliases: ['promote'],
  description: 'Promote a member to gang leader',
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
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can promote members');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to promote');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Action', 'You are already the leader');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!gang.members.includes(targetUser.id)) {
        const errorEmbed = embeds.error('Not a Member', 'This user is not in your gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Transfer leadership
      gang.leaderId = targetUser.id;
      await gang.save();

      const successEmbed = embeds.success(
        '👑 Leadership Transferred',
        `${targetUser.username} is now the leader of **${gang.name}**\n\nYou are now a regular member.`
      );
      message.channel.send({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Gang promote error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while promoting the user.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





