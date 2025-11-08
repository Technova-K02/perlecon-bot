const User = require('../../models/User');
const Gang = require('../../models/Gang');
const GangInvitation = require('../../models/GangInvitation');
const embeds = require('../../utils/embeds');
const gangInvitations = require('../../utils/gangInvitations');

module.exports = {
  name: 'invitations',
  aliases: ['ginvitations', 'ganginvites', 'myinvites'],
  description: 'View your pending gang invitations',
  async execute(message) {
    try {
      // Find all pending invitations for the user
      const invitations = await gangInvitations.getUserPendingInvitations(message.author.id);

      if (invitations.length === 0) {
        const embed = embeds.info('📨 Gang Invitations', 'You have no pending gang invitations.');
        return message.channel.send({ embeds: [embed] });
      }

      let invitesList = '';
      for (let i = 0; i < invitations.length; i++) {
        const invitation = invitations[i];
        const gang = invitation.gangId;
        
        if (!gang) continue; // Skip if gang was deleted
        
        let inviterName = 'Unknown User';
        try {
          const inviter = await message.client.users.fetch(invitation.inviterId);
          inviterName = inviter.username;
        } catch (error) {
          // Keep default name
        }

        const timeLeft = Math.ceil((invitation.expiresAt - new Date()) / (1000 * 60 * 60)); // Hours left
        
        invitesList += `**${i + 1}.** ${gang.name}\n`;
        invitesList += `   👑 Leader: ${inviterName}\n`;
        invitesList += `   👥 Members: ${gang.members.length}/${gang.maxMembers}\n`;

        invitesList += `   ⏰ Expires in: ${timeLeft}h\n\n`;
      }

      const embed = embeds.info(
        '📨 Your Gang Invitations',
        invitesList + 
        `React with ✅ to accept or ❌ to decline on the invitation messages.\n` +
        `*You can only accept one invitation at a time.*`
      );
      
      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang invitations error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting your invitations.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





