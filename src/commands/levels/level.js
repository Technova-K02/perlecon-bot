const economy = require('../../utils/economy');
const leveling = require('../../utils/leveling');
const embeds = require('../../utils/embeds');
const Gang = require('../../models/Gang');
const { formatUsernameWithStyle } = require('../../utils/styles');

module.exports = {
  name: 'level',
  aliases: ['xp'],
  description: 'Check your or someone else\'s level and XP',
  async execute(message, args) {
    let targetUser = message.author;

    // Check for mentioned user
    if (message.mentions.users.first()) {
      targetUser = message.mentions.users.first();
    }
    // Check for user ID in args
    else if (args[0] && !isNaN(args[0])) {
      try {
        targetUser = await message.client.users.fetch(args[0]);
      } catch (error) {
        const errorEmbed = embeds.error('User Not Found', 'Could not find a user with that ID');
        return message.channel.send({ embeds: [errorEmbed] });
      }
    }
    // Check for username in args
    else if (args[0]) {
      const username = args.join(' ').toLowerCase();
      const guild = message.guild;
      const member = guild.members.cache.find(m =>
        m.user.username.toLowerCase().includes(username) ||
        m.displayName.toLowerCase().includes(username)
      );
      if (member) {
        targetUser = member.user;
      } else {
        const errorEmbed = embeds.error('User Not Found', `Could not find a user with username containing "${args.join(' ')}"`);
        return message.channel.send({ embeds: [errorEmbed] });
      }
    }

    const user = await economy.getUser(targetUser.id);
    const progress = leveling.getXpProgress(user);
    const nextLevelXp = leveling.calculateXpForLevel(user.level + 1);

    // Get gang info if user is in a gang
    let gangName = 'No Gang';
    if (user.gang) {
      const gang = await Gang.findById(user.gang);
      if (gang) {
        gangName = gang.name;
      }
    }

    // Format username with style
    const styledUsername = await formatUsernameWithStyle(targetUser.id, targetUser.username);

    // Create progress bar
    const progressBar = '█'.repeat(Math.floor(progress.percentage / 10)) + '░'.repeat(10 - Math.floor(progress.percentage / 10));

    const levelEmbed = embeds.info(
      `${styledUsername}'s Level`,
      `**Level:** ${user.level}\n` +
      `**XP:** ${economy.formatNumber(user.xp)}\n` +
      `**Progress:** ${progress.current}/${progress.needed} (${progress.percentage.toFixed(0)}%)\n`
      // `\`${progressBar}\`\n` +
      // `**Next Level:** ${economy.formatNumber(nextLevelXp)} XP`
    );

    message.channel.send({ embeds: [levelEmbed] });
  }
};