const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'disgang',
  description: 'Permanently disband your gang',
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
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can disband the gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }



      // Distribute vault money to leader
      if (gang.vault > 0) {
        user.pocket += gang.vault;
        await user.save();
      }

      // Remove gang from all members
      await User.updateMany(
        { gang: gang._id },
        { $unset: { gang: 1 } }
      );

      // Delete the gang
      await Gang.findByIdAndDelete(gang._id);

      const successEmbed = embeds.success(
        'Gang Disbanded',
        `**${gang.name}** has been permanently disbanded.\n\n` +
        `${gang.vault > 0 ? `${economy.formatMoney(gang.vault)} coins from the vault have been added to your pocket.\n` : ''}` +
        `All ${gang.members.length} members have been removed from the gang.`
      );
      message.channel.send({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Gang disband error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while disbanding the gang.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





