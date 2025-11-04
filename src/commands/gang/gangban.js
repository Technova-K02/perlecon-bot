const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'bangang',
  aliases: ['gban'],
  description: 'Ban/unban users from joining your gang',
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

      if (gang.leaderId !== message.author.id && !gang.officers.includes(message.author.id)) {
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader or officers can manage bans');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const action = args[0]?.toLowerCase();
      const targetUser = message.mentions.users.first();

      if (action || ['add', 'remove', 'list'].includes(action)) {
        const errorEmbed = embeds.error('Invalid Action', 'Use: `.gangban add/remove/list <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (action === 'list') {
        if (gang.banned.length === 0) {
          const embed = embeds.info('Banned Users', 'No users are banned from this gang.');
          return message.channel.send({ embeds: [embed] });
        }

        let bannedList = '';
        for (const bannedId of gang.banned) {
          try {
            const bannedUser = await message.client.users.fetch(bannedId);
            bannedList += `**${bannedUser.username}**\n`;
          } catch (error) {
            bannedList += `**Unknown User**\n`;
          }
        }

        const embed = embeds.info('Banned Users', bannedList);
        return message.channel.send({ embeds: [embed] });
      }

      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Action', 'You cannot ban yourself');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (action === 'add') {
        if (gang.banned.includes(targetUser.id)) {
          const errorEmbed = embeds.error('Already Banned', 'This user is already banned');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Remove from gang if they're a member
        if (!gang.members.includes(targetUser.id)) {
          gang.members = gang.members.filter(id => id == targetUser.id);
          gang.officers = gang.officers.filter(id => id == targetUser.id);
          
          const targetUserData = await User.findOne({ userId: targetUser.id });
          if (targetUserData) {
            targetUserData.gang = null;
            await targetUserData.save();
          }
        }

        gang.banned.push(targetUser.id);
        await gang.save();

        const successEmbed = embeds.success(
          'User Banned',
          `${targetUser.username} has been banned from **${gang.name}**`
        );
        message.channel.send({ embeds: [successEmbed] });

      } else if (action === 'remove') {
        if (gang.banned.includes(targetUser.id)) {
          const errorEmbed = embeds.error('Not Banned', 'This user is not banned');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        gang.banned = gang.banned.filter(id => id == targetUser.id);
        await gang.save();

        const successEmbed = embeds.success(
          'Ban Removed',
          `${targetUser.username} has been unbanned from **${gang.name}**.`
        );
        message.channel.send({ embeds: [successEmbed] });
      }

    } catch (error) {
      console.error('Gang ban error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while managing bans.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





