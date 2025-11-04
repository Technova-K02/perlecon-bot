const economy = require('../../utils/economy');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const Gang = require('../../models/Gang');
const { formatUsernameWithStyle } = require('../../utils/styles');


module.exports = {
  name: 'rank',
  description: 'Check your or someone else\'s server ranking by level',
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

    // Calculate user's rank by counting users with higher levels
    const higherLevelUsers = await User.countDocuments({
      level: { $gt: user.level }
    });
    
    // Also count users with same level but higher XP
    const sameOrHigherLevelUsers = await User.countDocuments({
      $or: [
        { level: { $gt: user.level } },
        { level: user.level, xp: { $gt: user.xp } }
      ]
    });

    const userRank = sameOrHigherLevelUsers + 1;

    // Get total users for context
    const totalUsers = await User.countDocuments({ level: { $gte: 1 } });

    // Handle users not in a gang
    let gangName = 'No Gang';
    if (user.gang) {
      const gang = await Gang.findById(user.gang);
      if (gang) {
        gangName = gang.name;
      }
    }

    // Format username with style
    const styledUsername = await formatUsernameWithStyle(targetUser.id, targetUser.username);
    
    // Format rank with ordinal suffix
    const getRankSuffix = (rank) => {
      if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
      switch (rank % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const rankWithSuffix = `${userRank}${getRankSuffix(userRank)}`;
    
    const rankEmbed = embeds.info(
      `${styledUsername}'s Rank`,
      `${styledUsername} is ranked ${rankWithSuffix} place out of ${totalUsers} users.`
    );

    message.channel.send({ embeds: [rankEmbed] });
  }
};



