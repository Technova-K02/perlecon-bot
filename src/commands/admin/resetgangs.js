const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'resetgangs',
  description: 'Disband all gangs in the server (Admin/Owner only)',
  async execute(message, args) {
    // Check if user is bot owner or has admin permissions
    const isOwner = message.author.id === process.env.OWNER_ID;
    const isAdmin = message.member && message.member.permissions.has('ADMINISTRATOR');
    
    if (!isOwner && !isAdmin) {
      const errorEmbed = embeds.error('Permission Denied', 'Only administrators or the bot owner can use this command.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    try {
      // Get all gangs
      const allGangs = await Gang.find({});
      
      if (allGangs.length === 0) {
        const infoEmbed = embeds.info('No Gangs Found', 'There are no gangs to disband.');
        return message.channel.send({ embeds: [infoEmbed] });
      }

      // Count total members across all gangs
      let totalMembers = 0;
      allGangs.forEach(gang => {
        totalMembers += gang.members.length;
      });

      // Remove gang reference from all users
      await User.updateMany(
        { gang: { $exists: true } },
        { $unset: { gang: 1 } }
      );

      // Delete all gangs
      const deleteResult = await Gang.deleteMany({});

      const successEmbed = embeds.success(
        'All Gangs Reset',
        // `Successfully disbanded **${deleteResult.deletedCount}** gangs.\n`
        `**Total Members Affected:** ${totalMembers}\n`
        // `**Action:** All gang data has been permanently deleted\n` +
        // `**Status:** All users can now create or join new gangs\n\n` +
        // `⚠️ **Note:** This action cannot be undone. All gang progress, vaults, and upgrades have been lost.`
      );

      message.channel.send({ embeds: [successEmbed] });

      // Log the action
      console.log(`Gang reset performed by ${message.author.username} (${message.author.id})`);
      // console.log(`Disbanded ${deleteResult.deletedCount} gangs affecting ${totalMembers} members`);

    } catch (error) {
      console.error('Reset gangs error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while resetting gangs. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};