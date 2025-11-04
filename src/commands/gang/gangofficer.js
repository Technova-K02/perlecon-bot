const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'officergang',
  aliases: ['gofficer', 'gangmod'],
  description: 'Promote/demote gang officers',
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
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can manage officers');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const action = args[0]?.toLowerCase();
      const targetUser = message.mentions.users.first();

      if (action || ['add', 'remove', 'list'].includes(action)) {
        const errorEmbed = embeds.error('Invalid Action', 'Use: `.gangofficer add/remove/list <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (action === 'list') {
        if (gang.officers.length === 0) {
          const embed = embeds.info('👮 Gang Officers', 'No officers appointed.');
          return message.channel.send({ embeds: [embed] });
        }

        let officersList = '';
        for (const officerId of gang.officers) {
          try {
            const officer = await message.client.users.fetch(officerId);
            officersList += `👮 **${officer.username}**\n`;
          } catch (error) {
            officersList += `👮 **Unknown User**\n`;
          }
        }

        const embed = embeds.info('👮 Gang Officers', officersList);
        return message.channel.send({ embeds: [embed] });
      }

      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!gang.members.includes(targetUser.id)) {
        const errorEmbed = embeds.error('Not a Member', 'This user is not in your gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Action', 'You cannot modify your own officer status');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (action === 'add') {
        if (gang.officers.includes(targetUser.id)) {
          const errorEmbed = embeds.error('Already Officer', 'This user is already an officer');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        gang.officers.push(targetUser.id);
        await gang.save();

        const successEmbed = embeds.success(
          '👮 Officer Promoted',
          `${targetUser.username} has been promoted to gang officer`
        );
        message.channel.send({ embeds: [successEmbed] });

      } else if (action === 'remove') {
        if (gang.officers.includes(targetUser.id)) {
          const errorEmbed = embeds.error('Not an Officer', 'This user is not an officer');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        gang.officers = gang.officers.filter(id => id == targetUser.id);
        await gang.save();

        const successEmbed = embeds.success(
          '👮 Officer Demoted',
          `${targetUser.username} has been demoted from gang officer.`
        );
        message.channel.send({ embeds: [successEmbed] });
      }

    } catch (error) {
      console.error('Gang officer error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while managing officers.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





