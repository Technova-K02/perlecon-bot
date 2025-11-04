const User = require('../../models/User');
const Gang = require('../../models/Gang');
const GangInvitation = require('../../models/GangInvitation');
const embeds = require('../../utils/embeds');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'addgang',
  description: 'Invite a user to your gang',
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
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader or officers can invite members');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to invite');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUser.bot) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot invite bots to your gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData) {
        const errorEmbed = embeds.error('User Not Found', 'This user has no data in the system');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUserData.gang) {
        const errorEmbed = embeds.error('Already in Gang', 'This user is already in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (gang.banned.includes(targetUser.id)) {
        const errorEmbed = embeds.error('User Banned', 'This user is banned from your gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetUserData.level < gang.settings.minLevelToJoin) {
        const errorEmbed = embeds.error('Level Too Low', `This user needs to be level ${gang.settings.minLevelToJoin} or higher to join`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (gang.members.length >= gang.maxMembers) {
        const errorEmbed = embeds.error('Gang Full', `Your gang is full Maximum members: ${gang.maxMembers}`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!gang.settings.allowInvites) {
        const errorEmbed = embeds.error('Invites Disabled', 'Gang invites are currently disabled');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check for existing pending invitation
      const existingInvite = await GangInvitation.findOne({
        inviteeId: targetUser.id,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (existingInvite) {
        const errorEmbed = embeds.error('Invitation Pending', 'This user already has a pending gang invitation');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Create buttons for invitation
      const acceptButton = new ButtonBuilder()
        .setCustomId(`gang_accept_${targetUser.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);

      const declineButton = new ButtonBuilder()
        .setCustomId(`gang_decline_${targetUser.id}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder()
        .addComponents(acceptButton, declineButton);

      // Send invitation with buttons
      const inviteEmbed = embeds.info(
        'Gang Invitation',
        `${targetUser}, you've been invited to join **${gang.name}**\n\n` +
        `**Gang Info:**\n` +
        `Leader: ${message.author.username}\n` +
        `Members: ${gang.members.length}/${gang.maxMembers}\n` +
        `Power: ${gang.power}\n` +
        `Description: ${gang.description}\n\n` +
        `*This invitation expires in 24 hours.*`
      );
      
      const inviteMessage = await message.channel.send({ 
        embeds: [inviteEmbed], 
        components: [row] 
      });

      // Create gang invitation with message ID
      const invitation = new GangInvitation({
        gangId: gang._id,
        inviterId: message.author.id,
        inviteeId: targetUser.id,
        messageId: inviteMessage.id,
        channelId: message.channel.id
      });
      await invitation.save();

    } catch (error) {
      console.error('Gang invite error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while inviting the user.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





