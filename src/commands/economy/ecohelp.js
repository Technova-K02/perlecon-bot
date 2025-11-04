const embeds = require('../../utils/embeds');

module.exports = {
  name: 'ecohelp',
  description: 'Show all economy-related commands',
  async execute(msg) {
    const ecoHelpEmbed = embeds.info(
      'Economy Help',
      '> Build your wealth and become the richest user\n > Earn 20,000 coins for every server boost\n')
      .addFields(
        { name: 'Basic', value: '`.work`\n`.coins`\n`.p`\n`.s`\n`.daily`\n`.weekly`', inline: true },
        { name: 'Banking', value: '`.put <amount>`\n`.take <amount>`\n`.putall`\n`.takeall`', inline: true },
        { name: 'Transactions', value: '`.give <amount> <@user>`\n`.transactions`\n`.grant <amount> <@user>`', inline: true },
        { name: 'Risk', value: '`.steal <@user>`', inline: true },
        { name: 'Shopping', value: '`.shop`\n`.inventory(.inv)`', inline: true },
        { name: 'Leaderboards', value: '`.coinslb`\n`.richest`', inline: true },
      )
      .setFooter({ text: 'Start with .work to begin earning coins' });

    msg.channel.send({ embeds: [ecoHelpEmbed] });
  }
};
