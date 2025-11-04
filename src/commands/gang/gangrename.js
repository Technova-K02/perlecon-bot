const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'renamegang',
  aliases: ['grename'],
  description: 'Rename your gang',
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
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can rename the gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const newName = args.join(' ');
      if (!newName) {
        const errorEmbed = embeds.error('Invalid Name', 'Please provide a new name for your gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (newName.length < 3 || newName.length > 20) {
        const errorEmbed = embeds.error('Invalid Length', 'Gang name must be between 3 and 20 characters');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if name already exists
      const existingGang = await Gang.findOne({ name: { $regex: new RegExp(`^${newName}$`, 'i') } });
      if (existingGang && existingGang._id.toString() == gang._id.toString()) {
        const errorEmbed = embeds.error('Name Taken', 'A gang with this name already exists');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const oldName = gang.name;
      gang.name = newName;
      await gang.save();

      const successEmbed = embeds.success(
        'Gang Renamed',
        `Gang name changed from **${oldName}** to **${newName}**`
      );
      message.channel.send({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Gang rename error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while renaming the gang.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





