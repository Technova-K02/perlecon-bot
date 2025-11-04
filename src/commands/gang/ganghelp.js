const embeds = require('../../utils/embeds');

module.exports = {
  name: 'helpgang',
  aliases: ['ganghelp'],
  description: 'Show all gang-related commands',
  async execute(msg) {
    const gangHelpEmbed = embeds.info(
      'Gang Help',
      '> Create and level up your own gang\n'+'> Earn 20,000 coins for every server boost\n')
      .addFields(
        {
          name: '**🏗️ Gang Management**',
          value: '`.makegang <name>` ' +
            '`.gang <name/@user>`  ' +
            '`.leavegang` ' +
            '`.disgang` ',
          inline: true
        },
        {
          name: '**👥 Members**',
          value: '`.addgang <@user>` ' +
            '`.kick <@user>` ' +
            '`.promote <@user>` ' +
            '`.members` ',
          inline: true
        },
        {
          name: '**💰 Safe& Money**',
          value: '`.putgang <amount>` ' +
            '`.takegang <amount>` ' +
            '`.safegang` ',
          inline: true
        },
        {
          name: '🧩**Base & Upgrades**',
          value: '' +
            '`.upgrade <type>` ' +
            '`.upgrades` ' +
            '`.repair` ',
          inline: true
        },
        {
          name: '⚔️ **Army & Personnel**',
          value: '`.hire guard/medic` ' +
            '`.army`  ' +
            '`.leavebase [guards]`  ' +
            '`.return` ',
          inline: true
        },
        {
          name: '👥 **Combat Actions**',
          value: ' `.raid <gang>` ' +
            '`.rob <gang>` ' +
            '`.kidnap <@user>`  ' +
            '`.hostages` ',
          inline: true
        },
        {
          name: '🛠️ **Tools & Items**',
          value: '`.buy <tool>` ' +
            '`.tools` ' +
            '`.info <item>` ',
          inline: true
        },
        {
          name: '📜 **Information**',
          value:
            // '`.statsgang` ' +
            '`.ganglb` ' +
            // '`.searchgang <name>` ' +
            '`.listgang` ',
          inline: true
        }
      )
      .setFooter({ text: 'Start with .makegang <name> to form your gang • Leaders/Officers have special permissions' });

    msg.channel.send({ embeds: [gangHelpEmbed] });
  }
};






