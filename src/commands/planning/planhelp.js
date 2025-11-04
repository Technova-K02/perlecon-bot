const embeds = require('../../utils/embeds');

module.exports = {
  name: 'planhelp',
  description: 'Show all planning system commands',
  async execute(msg) {
    const planHelpEmbed = embeds.info(
      'Planning Help',
      '> Stay organized and never miss important events\n')
      .addFields(
        { name: '📅 Events', value: '`.eventcreate <title> <date>`\n`.eventlist`\n`.eventinfo <eventId>`\n`.eventjoin <eventId>`\n`.eventleave <eventId>`\n`.eventcancel <eventId>`', inline: true },
        { name: '⏰ Reminders', value: '`.remind <time> <message>`\n`.remindlist`\n`.remindcancel <id>`', inline: true },
        { name: '📋 Schedule', value: '`.schedule`\n`.scheduletoday`\n`.scheduleweek`', inline: true },
        { name: '🏆 Tournaments', value: '`.tournamentcreate <name>`\n`.tournamentjoin <id>`\n`.tournamentinfo <id>`\n`.tournamentbracket <id>`\n`.tournamentlist`', inline: true },
        { name: '⚔️ Challenges', value: '`.challengecreate <@user>`\n`.challengeaccept <id>`\n`.challengedecline <id>`\n`.challengelist`', inline: true },
        { name: '⏱️ Time Formats', value: '`2h` - 2 hours\n`30m` - 30 minutes\n`1d` - 1 day\n`2024-12-25 20:00`', inline: true },
      )
      .setFooter({ text: 'Stay organized and never miss important events' });

    msg.channel.send({ embeds: [planHelpEmbed] });
  }
};



