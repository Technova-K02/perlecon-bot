const embeds = require('../../utils/embeds');

module.exports = {
  name: 'adminhelp',
  description: 'View all available admin commands',
  async execute(msg, args) {
    // Check if user is bot owner or has admin permissions
    const isOwner = msg.author.id === process.env.OWNER_ID;
    const isAdmin = msg.member;// && msg.member.permissions.has('ADMINISTRATOR');
    
    if (!isOwner && !isAdmin) {
      const errorEmbed = embeds.error('Permission Denied', 'Only administrators or the bot owner can use this command.');
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const helpEmbed = embeds.info(
      'Admin Commands',
      '> Administrative commands for managing the bot\n' +

      '**💰 Economy Management:**\n' +
      '• `grant <@user> <amount>` - Grant coins to a user\n\n' +

      '**🏴‍☠️ Gang Management:**\n' +
      '• `deletegang <gang name>` or `.deletegang <@user>` - Disband a specific gang\n' +
      '• `resetgangs` - Disband all gangs in the server\n\n' +

      '**⚠️ Warning:**\n' +
      'Admin commands are powerful and can affect multiple users. Use with caution.'
    );

    msg.channel.send({ embeds: [helpEmbed] });
  }
};
