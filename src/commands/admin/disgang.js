const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'deletegang',
  description: 'Disband a specific gang by name or user mention (Admin/Owner only)',
  async execute(message, args) {
    // Check if user is bot owner or has admin permissions
    const isOwner = message.author.id === process.env.OWNER_ID;
    const isAdmin = message.member && message.member.permissions.has('ADMINISTRATOR');
    
    if (!isOwner && !isAdmin) {
      const errorEmbed = embeds.error('Permission Denied', 'Only administrators or the bot owner can use this command.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Check if gang name or user mention was provided
    if (!args.length) {
      const helpEmbed = embeds.info(
        'Disband Gang Command',
        '**Usage:** `.deletegang <gang name>` or `.deletegang <@user>`\n\n' +
        '**Examples:**\n' +
        '• `.deletegang BadGangName` - Delete gang by name\n' +
        '• `.deletegang @username` - Delete the gang of mentioned user\n\n' +
        'This will disband the specified gang and remove all members from it.'
      );
      return message.channel.send({ embeds: [helpEmbed] });
    }

    try {
      let gang;
      
      // Check if user was mentioned
      const mentionedUser = message.mentions.users.first();
      
      if (mentionedUser) {
        // Find user's gang
        const user = await User.findOne({ userId: mentionedUser.id });
        
        if (!user || !user.gang) {
          const errorEmbed = embeds.error(
            'No Gang Found',
            `${mentionedUser.username} is not in any gang.`
          );
          return message.channel.send({ embeds: [errorEmbed] });
        }
        
        // Find the gang by user's gang ID
        gang = await Gang.findById(user.gang);
        
        if (!gang) {
          const errorEmbed = embeds.error(
            'Gang Not Found',
            'Could not find the gang data. It may have been deleted.'
          );
          return message.channel.send({ embeds: [errorEmbed] });
        }
      } else {
        // Find the gang by name (case-insensitive)
        const gangName = args.join(' ');
        gang = await Gang.findOne({ 
          name: { $regex: new RegExp(`^${gangName}$`, 'i') }
        });

        if (!gang) {
          const errorEmbed = embeds.error(
            'Gang Not Found',
            `No gang found with the name "${gangName}".\n\n` +
            'Make sure you spelled the gang name correctly or mention a gang member.'
          );
          return message.channel.send({ embeds: [errorEmbed] });
        }
      }

      // Get gang leader info
      let leaderName = 'Unknown User';
      try {
        const leader = await message.client.users.fetch(gang.leaderId);
        leaderName = leader.username;
      } catch (error) {
        // Keep default name
      }

      // Create confirmation embed
      const confirmEmbed = embeds.warning(
        'Confirm Gang Disbandment',
        `⚠️ **Are you sure you want to disband this gang?**\n\n` +
        `**Gang Name:** ${gang.name}\n` +
        `**Leader:** ${leaderName}\n` +
        `**Members:** ${gang.members.length}\n` +
        `**Power:** ${gang.power}\n` +
        `**Vault:** ${gang.safe} coins\n\n` +
        `**This action will:**\n` +
        `• Permanently delete the gang\n` +
        `• Remove all members from the gang\n` +
        `• Delete all gang progress and upgrades\n` +
        `• Cannot be undone\n\n` +
        `Click **Yes** to confirm or **No** to cancel.`
      );

      // Create buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('disgang_yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('✅');

      const cancelButton = new ButtonBuilder()
        .setCustomId('disgang_no')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const row = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

      const confirmMessage = await message.channel.send({
        embeds: [confirmEmbed],
        components: [row]
      });

      // Create collector for button interactions
      const collector = confirmMessage.createMessageComponentCollector({
        time: 30000 // 30 seconds timeout
      });

      collector.on('collect', async (interaction) => {
        // Check if the person clicking is the same as who ran the command
        if (interaction.user.id !== message.author.id) {
          await interaction.reply({
            content: '❌ Only the person who ran this command can confirm it.',
            ephemeral: true
          });
          return;
        }

        if (interaction.customId === 'disgang_yes') {
          await interaction.deferUpdate();

          try {
            // Remove gang reference from all members
            await User.updateMany(
              { gang: gang._id },
              { $unset: { gang: 1 } }
            );

            // Delete the gang
            await Gang.findByIdAndDelete(gang._id);

            const successEmbed = embeds.success(
              'Gang Disbanded',
              `Successfully disbanded the gang **${gang.name}**.\n\n` +
              `**Members affected:** ${gang.members.length}\n` +
              `**Action performed by:** ${message.author.username}\n\n` +
              `The gang and all its data have been permanently deleted.`
            );

            await confirmMessage.edit({
              embeds: [successEmbed],
              components: []
            });

            // Log the action
            console.log(`Gang "${gang.name}" disbanded by ${message.author.username} (${message.author.id})`);
            console.log(`Gang had ${gang.members.length} members and ${gang.safe} coins in vault`);

          } catch (error) {
            console.error('Disband gang error:', error);
            const errorEmbed = embeds.error('Command Error', 'An error occurred while disbanding the gang. Please try again.');
            await confirmMessage.edit({
              embeds: [errorEmbed],
              components: []
            });
          }

        } else if (interaction.customId === 'disgang_no') {
          await interaction.deferUpdate();

          const cancelEmbed = embeds.info(
            'Gang Disbandment Cancelled',
            `The disbandment of gang **${gang.name}** has been cancelled.`
          );

          await confirmMessage.edit({
            embeds: [cancelEmbed],
            components: []
          });
        }

        collector.stop();
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          // Timeout - disable buttons
          const timeoutEmbed = embeds.error(
            'Command Timeout',
            `The gang disbandment confirmation timed out. Gang **${gang.name}** was not affected.`
          );

          await confirmMessage.edit({
            embeds: [timeoutEmbed],
            components: []
          });
        }
      });

    } catch (error) {
      console.error('Disband gang error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while preparing the gang disbandment. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};
