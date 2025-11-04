const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'descriptiongang',
  aliases: ['gdesc', 'gangdesc'],
  description: 'Set or view your gang description',
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

      // If no args, show current description
      if (args.length === 0) {
        const embed = embeds.info(
          `${gang.name} Description`,
          gang.description
        );
        return message.channel.send({ embeds: [embed] });
      }

      // Only leader and officers can change description
      if (gang.leaderId !== message.author.id && !gang.officers.includes(message.author.id)) {
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader or officers can change the description');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const newDescription = args.join(' ');
      if (newDescription.length > 200) {
        const errorEmbed = embeds.error('Too Long', 'Gang description must be 200 characters or less');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      gang.description = newDescription;
      await gang.save();

      const successEmbed = embeds.success(
        'Description Updated',
        `Gang description has been updated to:\n\n"${newDescription}"`
      );
      message.channel.send({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Gang description error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while updating the description.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





