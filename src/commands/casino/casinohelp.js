const embeds = require('../../utils/embeds');

module.exports = {
  name: 'luckhelp',
  description: 'View all available casino games',
  async execute(msg, args) {
    const helpEmbed = embeds.info(
      'Luck Games',
      '> Test your luck with our available luck games!\n > Earn 20,000 coins for every server boost\n' +

      '**🎰 Slot Machine:**\n' +
      '• `slots <amount>` - Spin the reels and match symbols\n' +
      '• `slotshelp` - Learn how to play slots\n\n' +

      '**🪙 Coin Flip:**\n' +
      '• `coinflip <amount>` - A rigged 40/60 chance game\n\n' +

      '**🎲 Luck Machines:**\n' +
      '• `lucky <machine> <amount>` - Choose from 6 different machines (a-f)\n' +
      '• `lucky` - View all machine odds and payouts\n\n' +

      '**📊 Statistics:**\n' +
      '• `luckstats <user>` - View luck statistics'
    );

    // helpEmbed.addFields(
    //   {
    //     name: '💡 Tips',
    //     value: '• Start with smaller bets to learn the games\n• Each game has different odds and risk levels\n• Use `slotshelp` or `luck` for detailed game information',
    //     inline: false
    //   },
    //   {
    //     name: '⚠️ Responsible Gaming',
    //     value: 'Remember to luck responsibly and never bet more than you can afford to lose!',
    //     inline: false
    //   }
    // );

    msg.channel.send({ embeds: [helpEmbed] });
  }
};
