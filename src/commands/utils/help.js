const embeds = require('../../utils/embeds');

module.exports = {
  name: 'help',
  description: 'Show all available commands',
  async execute(msg, args) {
    // If specific command help is requested
    // if (args[0]) {
    //   const command = args[0].toLowerCase();

    // Gang command help
    // if (['gang', 'gangs'].includes(command)) {
    //   const gangEmbed = embeds.info(
    //     'Gang Commands',
    //     'Quick reference for gang commands'
    //   ).addFields(
    //     { name: '**Basic Commands**', value: '`.makegang <name>` - Create gang\n`.gang <name/@user>` - View gang\n`.leavegang` - Leave gang', inline: false },
    //     { name: '**Management**', value: '`.ganginvite <@user>` - Invite\n`.gangkick <@user>` - Kick\n`.gangpromote <@user>` - Promote', inline: true },
    //     { name: '**Money**', value: '`.gangput <amount>` - Deposit\n`.gangtake <amount>` - Withdraw\n`.gangvault` - Check vault', inline: true },
    //     { name: '**Combat**', value: '`.raid <gang>` - Raid base\n`.rob <gang>` - Rob vault\n`.kidnap <@user>` - Kidnap', inline: true },
    //     { name: '**More Help**', value: 'Use `.helpgang` for complete gang command list', inline: false }
    //   );
    //   return msg.channel.send({ embeds: [gangEmbed] });
    // }

    // // Economy command help
    // if (['economy', 'eco', 'money'].includes(command)) {
    //   const ecoEmbed = embeds.info(
    //     'Economy Commands',
    //     'Quick reference for economy commands'
    //   ).addFields(
    //     { name: '**Basic**', value: '`.work` - Earn money\n`.account` - Check balance\n`.daily` - Daily bonus', inline: true },
    //     { name: '**Banking**', value: '`.put <amount>` - Deposit\n`.take <amount>` - Withdraw\n`.putall` / `.takeall`', inline: true },
    //     { name: '**Trading**', value: '`.give <amount> <@user>` - Send money\n`.steal <@user>` - Steal money', inline: true },
    //     { name: '**More Help**', value: 'Use `.ecohelp` for complete economy command list', inline: false }
    //   );
    //   return msg.channel.send({ embeds: [ecoEmbed] });
    // }
    // }

    // Main help menu
    const helpEmbed = embeds.info(
      'Help',
      '> This is the main help menu.\n')
      .addFields(
        {
          name: '🏴‍☠️ **Gangs**',
          value: '`.helpgang` ' +
            '`.makegang <name>` ' +
            '`.gang <name/@user>` ' +
            '',
          inline: true
        },
        {
          name: '💰 **Economy**',
          value: '`.ecohelp`  ' +
            '`.work` ' +
            '`.coins` ' +
            '',
          inline: true
        }, 
        {
          name: '🛒 **Shop**',
          value: '`.shop` ' +
            '`.inventory(.inv)` ' +
            '`.buy <item>` ',
          inline: true
        },
        {
          name: '🍀 **Luck**',
          value: '`.luckhelp` ' +
            '`.toss <amount>` ' +
            '`.slots <amount>` ' +
            '`.lucky` ',
          inline: true
        },
        {
          name: '📊 **Levels & Leaderboard**',
          value: '`.level` ' +
            '`.level <user>` ' +
            '`.rank` ' +
            '`.rank <user>` ' +
            '`.richest` ' +
            '`.lb` ' +
            '`.levellb` ' +
            '`.coinslb` ' +
            '`.ganglb` ',
          inline: true
        },
        // { 
        //   name: '**Planning**', 
        //   value: '`.planhelp` - Planning commands\n' +
        //          '`.plan` - Create events\n' +
        //          '`.events` - View events', 
        //   inline: true 
        // }
      )
      // .addFields(
      //   { 
      //     name: '⚡ **Quick Commands**', 
      //     value: '💰 **Money:** `.work`, `.account`, `.give`\n' +
      //            '🏴‍☠️ **Gang:** `.gang`, `.raid`, `.hire`\n' +
      //            '🛒 **Shop:** `.shop`, `.buy`\n' +
      //            ' ', 
      //     inline: false 
      //   }
      // )
      // .setFooter({ text: 'Use .help <category> for detailed help • Prefix: . (dot)' });
      ;
    msg.channel.send({ embeds: [helpEmbed] });
  }
};



