const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'return',
  description: 'Return to your gang base (safe from raids and kidnaps)',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'kidnapped') {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot return to base');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'base') {
        const errorEmbed = embeds.error('Already at Base', 'You are already at your base');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const baseStats = getBaseStats(gang.base.level);
      const maxCount = baseStats.maxGuards;

      // Return guards to base
      const guardsReturning = user.guardsWithUser;
      if (guardsReturning > 0) {
        gang.army.guards += guardsReturning > maxCount - gang.army.guards ? maxCount - gang.army.guards : guardsReturning;
        await gang.save();
      }

      // Update user status
      user.status = 'base';
      user.guardsWithUser = 0;
      await user.save();

      const embed = embeds.success(
        'Returned to Base',
        `You have safely returned to your base.\n\n`
        // `**Guards returned:** ${guardsReturning}\n` +
        // `**Total base guards:** ${gang.base.guards}\n\n` +
        // `**Safe:** You are now protected from kidnapping and raids!`
      );

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Return error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while returning to base.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

// Base progression table
function getBaseStats(level) {
  const baseData = {
    1: { name: 'Trailer', maxHP: 250, safeCapacity: 10000, maxGuards: 4, maxMedics: 2, upgradeCost: 0 },
    2: { name: 'Cabin', maxHP: 500, safeCapacity: 20000, maxGuards: 6, maxMedics: 3, upgradeCost: 10000 },
    3: { name: 'Warehouse', maxHP: 900, safeCapacity: 35000, maxGuards: 8, maxMedics: 4, upgradeCost: 20000 },
    4: { name: 'Bunker', maxHP: 1400, safeCapacity: 55000, maxGuards: 10, maxMedics: 5, upgradeCost: 35000 },
    5: { name: 'Compound', maxHP: 2000, safeCapacity: 80000, maxGuards: 12, maxMedics: 6, upgradeCost: 55000 },
    6: { name: 'Fortress', maxHP: 2800, safeCapacity: 110000, maxGuards: 14, maxMedics: 7, upgradeCost: 80000 },
    7: { name: 'Citadel', maxHP: 3800, safeCapacity: 150000, maxGuards: 16, maxMedics: 8, upgradeCost: 110000 },
    8: { name: 'Kingdom', maxHP: 5000, safeCapacity: 200000, maxGuards: 18, maxMedics: 9, upgradeCost: 150000 }
  };

  return baseData[level] || baseData[1];
}