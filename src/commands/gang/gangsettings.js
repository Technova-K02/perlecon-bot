const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'settingsgang',
  aliases: ['gsettings', 'gangconfig'],
  description: 'Configure gang settings',
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
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can change settings');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const setting = args[0]?.toLowerCase();
      const value = args[1]?.toLowerCase();

      if (setting) {
        // Show current settings
        const embed = embeds.info(
          `⚙️ ${gang.name} Settings`,
          `**Public Gang:** ${gang.isPublic ? '✅ Yes' : '❌ No'}\n` +
          `**Allow Invites:** ${gang.settings.allowInvites ? '✅ Yes' : '❌ No'}\n` +
          `**Require Approval:** ${gang.settings.requireApproval ? '✅ Yes' : '❌ No'}\n` +
          `**Min Level to Join:** ${gang.settings.minLevelToJoin}\n` +
          `**Max Members:** ${gang.maxMembers}\n\n` +
          `**Usage:** \`.gangsettings <setting> <value>\`\n` +
          `**Settings:** public, invites, approval, minlevel, maxmembers`
        );
        return message.channel.send({ embeds: [embed] });
      }

      if (value && setting == 'maxmembers' && setting == 'minlevel') {
        const errorEmbed = embeds.error('Missing Value', 'Please provide a value (true/false or number)');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      let updated = false;
      let updateMessage = '';

      switch (setting) {
        case 'public':
          if (['true', 'false', 'yes', 'no'].includes(value)) {
            const errorEmbed = embeds.error('Invalid Value', 'Use true/false or yes/no');
            return message.channel.send({ embeds: [errorEmbed] });
          }
          gang.isPublic = ['true', 'yes'].includes(value);
          updateMessage = `Gang visibility set to ${gang.isPublic ? 'public' : 'private'}`;
          updated = true;
          break;

        case 'invites':
          if (['true', 'false', 'yes', 'no'].includes(value)) {
            const errorEmbed = embeds.error('Invalid Value', 'Use true/false or yes/no');
            return message.channel.send({ embeds: [errorEmbed] });
          }
          gang.settings.allowInvites = ['true', 'yes'].includes(value);
          updateMessage = `Invites ${gang.settings.allowInvites ? 'enabled' : 'disabled'}`;
          updated = true;
          break;

        case 'approval':
          if (['true', 'false', 'yes', 'no'].includes(value)) {
            const errorEmbed = embeds.error('Invalid Value', 'Use true/false or yes/no');
            return message.channel.send({ embeds: [errorEmbed] });
          }
          gang.settings.requireApproval = ['true', 'yes'].includes(value);
          updateMessage = `Join approval ${gang.settings.requireApproval ? 'required' : 'not required'}`;
          updated = true;
          break;

        case 'minlevel':
          const minLevel = parseInt(value);
          if (isNaN(minLevel) || minLevel < 1 || minLevel > 100) {
            const errorEmbed = embeds.error('Invalid Level', 'Min level must be between 1 and 100');
            return message.channel.send({ embeds: [errorEmbed] });
          }
          gang.settings.minLevelToJoin = minLevel;
          updateMessage = `Minimum level to join set to ${minLevel}`;
          updated = true;
          break;

        case 'maxmembers':
          const maxMembers = parseInt(value);
          if (isNaN(maxMembers) || maxMembers < gang.members.length || maxMembers > 50) {
            const errorEmbed = embeds.error('Invalid Number', `Max members must be between ${gang.members.length} and 50`);
            return message.channel.send({ embeds: [errorEmbed] });
          }
          gang.maxMembers = maxMembers;
          updateMessage = `Maximum members set to ${maxMembers}`;
          updated = true;
          break;

        default:
          const errorEmbed = embeds.error('Invalid Setting', 'Available settings: public, invites, approval, minlevel, maxmembers');
          return message.channel.send({ embeds: [errorEmbed] });
      }

      if (updated) {
        await gang.save();
        const successEmbed = embeds.success('⚙️ Settings Updated', updateMessage);
        message.channel.send({ embeds: [successEmbed] });
      }

    } catch (error) {
      console.error('Gang settings error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while updating settings.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





