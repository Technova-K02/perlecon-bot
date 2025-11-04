const embeds = require('../../utils/embeds');

module.exports = {
  name: 'levelhelp',
  description: 'Show leveling system commands',
  async execute(msg) {
    const helpEmbed = embeds.info(
      'Leveling System Commands',
      '**Experience & Levels:**\n' +
      '• `.level <user>` - View user\'s level and XP\n' +
      '• `.rank <user>` - View user\'s server ranking position\n' +
      '• `.levellb` - Top users by level\n' +
      '• `.lb` - Weekly activity leaderboard\n' +
      '• `.coinslb` - Richest users leaderboard\n' +
      '• `.richest` - Richest user in the server\n\n' +
      
      '**How XP Works:**\n' +
      '• **Text Messages:** 15 ~ 25 XP per message (60 second cooldown)\n' +
      '• **Voice Activity:** 5 XP per 5 minutes in voice channels\n' +
      '• **Weekly Reset:** Activity stats reset every Sunday\n\n' 
      // '**Level Benefits:**\n' +
      // '• Higher levels unlock gang features\n' +
      // '• Some gangs have minimum level requirements\n' +
      // '• Level up notifications in chat'
    );

    msg.channel.send({ embeds: [helpEmbed] });
  }
};