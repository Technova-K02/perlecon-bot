const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const {
  getUpgradeCost,
  getAllUpgrades,
  getWallName,
  getBaseName
} = require('../../utils/gangUpgrades');

module.exports = {
  name: 'upgrades',
  description: 'Check upgrade costs and current levels',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Ensure upgrades and base objects exist (for older gangs)
      if (!gang.upgrades) {
        gang.upgrades = {
          weapons: 1,
          walls: 1,
          guardsTraining: 1,
          medicTraining: 1
        };
      }
      if (!gang.base) {
        gang.base = {
          level: 1,
          guards: 4,
          defenses: 0,
          hp: 250,
          lastRaid: null
        };
      }
      if (!gang.upgrades || !gang.base) {
        await gang.save();
      }

      const upgrades = getAllUpgrades();
      let upgradesList = `**${gang.name} Upgrade Overview**\n\n`;

      // Add base information first
      const baseLevel = gang.base?.level || 1;
      const baseMaxed = baseLevel >= 8;
      const baseStats = getBaseStats(baseLevel);

      upgradesList += `**Base** - Level ${baseLevel}/8\n`;
      upgradesList += `├ Current: ${getBaseName(baseLevel)}\n`;
      upgradesList += `├ HP: ${gang.base.hp || baseStats.maxHP}/${baseStats.maxHP}\n`;
      upgradesList += `├ Safe Capacity: ${economy.formatMoney(baseStats.safeCapacity)} coins\n`;

      if (baseMaxed) {
        upgradesList += `└ **MAXED OUT**\n\n`;
      } else {
        const nextBaseStats = getBaseStats(baseLevel + 1);
        upgradesList += `├ Next: ${getBaseName(baseLevel + 1)}\n`;
        upgradesList += `└ Next upgrade: ${economy.formatMoney(nextBaseStats.upgradeCost)} coins\n\n`;
      }

      Object.entries(upgrades).forEach(([key, upgrade]) => {
        const currentLevel = gang.upgrades?.[key] || 1;
        const nextCost = getUpgradeCost(key, currentLevel);
        const maxed = currentLevel >= upgrade.maxLevel;

        upgradesList += `**${upgrade.name}** - Level ${currentLevel}/${upgrade.maxLevel}\n`;
        upgradesList += `├ Effect: ${upgrade.effectPerLevel}\n`;

        if (key === 'walls') {
          upgradesList += `├ Current: ${getWallName(currentLevel)}\n`;
          if (!maxed) {
            upgradesList += `├ Next: ${getWallName(currentLevel + 1)}\n`;
          }
        }

        if (maxed) {
          upgradesList += `└ **MAXED OUT**\n\n`;
        } else {
          upgradesList += `└ Next upgrade: ${economy.formatMoney(nextCost)} coins\n\n`;
        }
      });

      upgradesList += `**Gang Safe:** ${economy.formatMoney(gang.vault)} coins\n\n`;
      // upgradesList += `**Commands:**\n`;
      // upgradesList += `• \`.upgrade <type>\` - Purchase an upgrade (leaders only)\n`;
      // upgradesList += `• \`.info <upgrade>\` - View detailed upgrade information\n`;
      // upgradesList += `• \`.army\` - View current personnel stats\n\n`;
      // upgradesList += `**Available Upgrades:** weapons, walls, guards, medics`;

      const embed = embeds.info('Gang Upgrades', upgradesList);

      embed.setFooter({ text: '\`.upgrade base/weapons/walls/guards/medics\` \`.info <upgrade>\` \`.army\` ' });

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Upgrades command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while viewing upgrades.');
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