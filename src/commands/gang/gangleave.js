const Gang = require('../../models/Gang');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');

// Helper function to get user's gang
async function getUserGang(userId) {
  const gang = await Gang.findOne({ members: userId });
  return gang || null;
}

module.exports = {
  name: 'leavegang',
  description: 'Leave your current gang',
  async execute(message) {
    try {
      const gang = await getUserGang(message.author.id);

      if (!gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (gang.leaderId === message.author.id) {
        const errorEmbed = embeds.error('Cannot Leave', 'You cannot leave your own gang. Use `!gangdisband` to disband it, or `!gangpromote <@user>` to transfer leadership first.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Remove user from gang
      gang.members = gang.members.filter(id => id !== message.author.id);
      await gang.save();

      // Update user's gang reference
      await User.updateOne({ userId: message.author.id }, { $unset: { gang: 1 } });

      message.channel.send(`👋 You have left the gang **${gang.name}**`);
    } catch (error) {
      console.error('Gang leave error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while leaving the gang.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};






