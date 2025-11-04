/**
 * General planning system commands
 * Handles help, settings, and system management
 */

module.exports = {
  name: 'planning',
  description: 'Planning system help and settings',
  async execute(msg, args) {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'help':
        const helpText = `
🗓️ **Planning System Commands**

**Events:**
\`event create <title> <date> <time>\` - Create an event
\`event list\` - List upcoming events
\`event join <id>\` - Join an event
\`event info <id>\` - Get event details

**Reminders:**
\`remind <time> <message>\` - Set a reminder
\`remind list\` - View your reminders
\`remind cancel <id>\` - Cancel a reminder

**Tournaments:**
\`tournament create <name> <type>\` - Create tournament
\`tournament join <id>\` - Join tournament
\`tournament bracket <id>\` - View bracket

**Challenges:**
\`challenge create <title> <goal>\` - Create challenge
\`challenge join <id>\` - Join challenge
\`challenge progress <id>\` - View progress

**Schedule:**
\`schedule\` - View your schedule
\`schedule today\` - Today's events
\`schedule week\` - This week's events

**Settings:**
\`planning settings\` - View/change settings
        `;
        return msg.channel.send(helpText);

      case 'settings':
        // Implementation will be added in later tasks
        return msg.channel.send('Planning settings not yet implemented');

      case 'stats':
        // Implementation will be added in later tasks
        return msg.channel.send('Planning statistics not yet implemented');

      default:
        return msg.channel.send('Use `planning help` for available commands');
    }
  }
};



