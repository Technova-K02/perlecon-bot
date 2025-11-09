const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const { isUserKidnapped } = require('../../utils/kidnapping');
const {
  getUpgradeCost,
  getUpgradeInfo,
  getAllUpgrades,
  getWallName,
  getWeaponDamageBonus,
  getWeaponSuccessBonus,
  getWallDefenseBonus,
  getGuardTrainingBonus,
  getMedicTrainingBonus
} = require('../../utils/gangUpgrades');

module.exports = {
  name: 'upgrade',
  description: 'Upgrade your gang\'s weapons, walls, or training',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      const { getKidnapErrorEmbed } = require('../../utils/kidnapping');
      const kidnapError = await getKidnapErrorEmbed(message.author.id, 'purchase upgrades');
      if (kidnapError) {
        return message.channel.send({ embeds: [kidnapError] });
      }

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

      // Ensure upgrades object exists (for older gangs)
      if (!gang.upgrades) {
        gang.upgrades = {
          weapons: 1,
          walls: 1,
          guardsTraining: 1,
          medicTraining: 1
        };
        await gang.save();
      }

      // Check if user is leader only (not officers)
      // if (gang.leaderId !== message.author.id) {
      //   const errorEmbed = embeds.error('Permission Denied', 'Only gang leaders can purchase upgrades');
      //   return message.channel.send({ embeds: [errorEmbed] });
      // }

      const upgradeType = args[0]?.toLowerCase();

      if (!upgradeType) {
        // Show all upgrades
        const upgrades = getAllUpgrades();
        let upgradesList = '';

        // Add base upgrade info first
        const { getBaseName } = require('../../utils/gangUpgrades');
        const baseLevel = gang.base?.level || 1;
        const baseMaxed = baseLevel >= 8;
        upgradesList += `**Base** - Level ${baseLevel}/8\n`;
        upgradesList += `└ Current: ${getBaseName(baseLevel)}\n`;
        if (baseMaxed) {
          upgradesList += `└ ✅ **MAXED OUT**\n\n`;
        } else {
          const nextBaseStats = getBaseStats(baseLevel + 1);
          upgradesList += `└ Next upgrade: ${economy.formatMoney(nextBaseStats.upgradeCost)} coins\n\n`;
        }

        Object.entries(upgrades).forEach(([key, upgrade]) => {
          const currentLevel = gang.upgrades[key] || 1;
          const cost = getUpgradeCost(key, currentLevel);
          const maxed = currentLevel >= upgrade.maxLevel;

          upgradesList += `**${upgrade.name}** - Level ${currentLevel}/${upgrade.maxLevel}\n`;
          upgradesList += `└ ${upgrade.effectPerLevel}\n`;

          if (key === 'walls') {
            upgradesList += `└ Current: ${getWallName(currentLevel)}\n`;
          }

          if (maxed) {
            upgradesList += `└ ✅ **MAXED OUT**\n\n`;
          } else {
            upgradesList += `└ Next upgrade: ${economy.formatMoney(cost)} coins\n\n`;
          }
        });

        const embed = embeds.info(
          `${gang.name} Gang Upgrades`,
          upgradesList +
          `**Pocket:** ${economy.formatMoney(user.pocket)} coins\n\n` +
          `**Individual Personnel:**\n` +
          `\`.upgrade guard\` - Upgrade one guard (12,000 coins)\n` +
          `\`.upgrade guards\` - Upgrade all lowest level guards\n` +
          `\`.upgrade medic\` - Upgrade one medic (15,000 coins)\n` +
          `\`.upgrade medics\` - Upgrade all lowest level medics`
        );

        embed.setFooter({ text: '`.upgrade <type>` - base, weapons, walls, guardstraining, medictraining, guard, guards, medic, medics' });

        return message.channel.send({ embeds: [embed] });
      }

      // Handle base upgrade separately
      if (upgradeType === 'base') {
        return await handleBaseUpgrade(message, gang, user);
      }

      // Handle individual guard/medic upgrades
      if (upgradeType === 'guard') {
        return await handleIndividualUpgrade(message, gang, user, 'guard');
      }
      if (upgradeType === 'guards') {
        return await handleBulkUpgrade(message, gang, user, 'guards');
      }
      if (upgradeType === 'medic') {
        return await handleIndividualUpgrade(message, gang, user, 'medic');
      }
      if (upgradeType === 'medics') {
        return await handleBulkUpgrade(message, gang, user, 'medics');
      }

      // Map command aliases to upgrade types
      const upgradeMap = {
        'weapons': 'weapons',
        'weapon': 'weapons',
        'walls': 'walls',
        'wall': 'walls',
        'guardstraining': 'guardsTraining',
        'medictraining': 'medicTraining'
      };

      const actualUpgradeType = upgradeMap[upgradeType];
      if (!actualUpgradeType) {
        const errorEmbed = embeds.error('Invalid Upgrade', 'Available upgrades: base, weapons, walls, guardstraining, medictraining, guard, guards, medic, medics');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const upgradeInfo = getUpgradeInfo(actualUpgradeType);
      const currentLevel = gang.upgrades[actualUpgradeType] || 1;

      if (currentLevel >= upgradeInfo.maxLevel) {
        const errorEmbed = embeds.error('Max Level', `${upgradeInfo.name} is already at maximum level (${upgradeInfo.maxLevel})`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const upgradeCost = getUpgradeCost(actualUpgradeType, currentLevel);

      if (user.pocket < upgradeCost) {
        const errorEmbed = embeds.error('Insufficient Funds', `${upgradeInfo.name} upgrade costs ${economy.formatMoney(upgradeCost)} coins.\nYou have only ${economy.formatMoney(user.pocket)} coins in your pocket.`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Perform the upgrade
      user.pocket -= upgradeCost;
      gang.upgrades[actualUpgradeType] = currentLevel + 1;

      await gang.save();
      await user.save(); // FIXED: Save user to persist pocket changes

      let upgradeMessage = `You paid ${upgradeCost} and ${upgradeInfo.name} upgraded to level **${currentLevel + 1}**!`;
      // `**Cost:** ${economy.formatMoney(upgradeCost)} coins\n` +
      // `**Effect:** ${upgradeInfo.effectPerLevel}\n`;

      // Add specific upgrade effects
      // if (actualUpgradeType === 'weapons') {
      // const damageBonus = getWeaponDamageBonus(currentLevel + 1);
      // const successBonus = getWeaponSuccessBonus(currentLevel + 1);
      // upgradeMessage += `**Current Bonuses:** +${damageBonus}% raid damage, +${successBonus}% raid success\n`;
      // } else if (actualUpgradeType === 'walls') {
      // const defenseBonus = getWallDefenseBonus(currentLevel + 1);
      // upgradeMessage += `**New Wall:** ${getWallName(currentLevel + 1)}\n`;
      // upgradeMessage += `**Defense Bonus:** -${defenseBonus}% chance of being raided\n`;
      // } else if (actualUpgradeType === 'guardsTraining') {
      // const guardBonus = getGuardTrainingBonus(currentLevel + 1);
      // upgradeMessage += `**Defense Bonus:** -${guardBonus}% chance of robbery/kidnapping\n`;
      // } else if (actualUpgradeType === 'medicTraining') {
      // const medicBonus = getMedicTrainingBonus(currentLevel + 1);
      // upgradeMessage += `**Healing Bonus:** +${medicBonus}% base repair efficiency\n`;
      // }

      // upgradeMessage += `\n**Remaining Vault:** ${economy.formatMoney(gang.vault)} coins`;

      const embed = embeds.success('Upgrade Complete', upgradeMessage);
      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Upgrade command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing the upgrade.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

// Base upgrade handler
async function handleBaseUpgrade(message, gang, user) {
  // Ensure base object exists (for older gangs)
  if (!gang.base) {
    gang.base = {
      level: 1,
      guards: 4,
      defenses: 0,
      hp: 250,
      lastRaid: null
    };
    await gang.save();
  }

  // Check if user is leader or officer
  // if (gang.leaderId !== message.author.id && !gang.officers.includes(message.author.id)) {
  //   const errorEmbed = embeds.error('Permission Denied', 'Only gang leaders and officers can upgrade the base');
  //   return message.channel.send({ embeds: [errorEmbed] });
  // }

  if (gang.base.level >= 8) {
    const errorEmbed = embeds.error('Max Level', 'Your base is already at maximum level (Kingdom)');
    return message.channel.send({ embeds: [errorEmbed] });
  }

  const nextLevelStats = getBaseStats(gang.base.level + 1);
  const upgradeCost = nextLevelStats.upgradeCost;

  if (user.pocket < upgradeCost) {
    const errorEmbed = embeds.error('Insufficient Funds', `Base upgrade costs ${economy.formatMoney(upgradeCost)} coins. You have ${economy.formatMoney(user.pocket)}.`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  const oldStats = getBaseStats(gang.base.level);
  gang.base.level += 1;
  user.pocket -= upgradeCost; // FIXED: Deduct from user pocket, not gang vault
  gang.base.guards = nextLevelStats.maxGuards;
  gang.base.hp = nextLevelStats.maxHP; // Restore to full HP on upgrade

  await gang.save();
  await user.save(); // FIXED: Save user to persist pocket changes

  const { getBaseName } = require('../../utils/gangUpgrades');
  const embed = embeds.success(
    'Base Upgraded',
    `Base upgraded to ${getBaseName(gang.base.level)} (Level ${gang.base.level})!\n` +
    // `**Cost:** ${economy.formatMoney(upgradeCost)} coins\n` +
    // `**Max HP:** ${oldStats.maxHP} → ${nextLevelStats.maxHP}\n` +
    // `**Max Guards:** ${oldStats.maxGuards} → ${nextLevelStats.maxGuards}\n` +
    // `**Safe Capacity:** ${economy.formatMoney(oldStats.safeCapacity)} → ${economy.formatMoney(nextLevelStats.safeCapacity)}\n` +
    // `**Remaining Gang Safe:** ${economy.formatMoney(gang.vault)}\n\n` +
    `Base fully repaired to ${nextLevelStats.maxHP} HP!`
  );
  return message.channel.send({ embeds: [embed] });
}

// Individual guard/medic upgrade costs
const INDIVIDUAL_UPGRADE_COSTS = {
  guard: 12000,
  medic: 15000
};

// Handle individual guard/medic upgrade (upgrades one lowest level unit)
async function handleIndividualUpgrade(message, gang, user, type) {
  // Initialize army arrays if they don't exist
  if (!gang.army.guardLevels) gang.army.guardLevels = [];
  if (!gang.army.medicLevels) gang.army.medicLevels = [];

  const levels = type === 'guard' ? gang.army.guardLevels : gang.army.medicLevels;
  const count = type === 'guard' ? gang.army.guards : gang.army.medics;

  // Ensure levels array matches count
  while (levels.length < count) {
    levels.push(1);
  }
  levels.splice(count); // Remove excess levels

  if (count === 0) {
    const errorEmbed = embeds.error('No Personnel', `You don't have any ${type}s to upgrade. Hire some first with \`.hire ${type}\`.`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  // Find the lowest level
  const minLevel = Math.min(...levels);
  if (minLevel >= 10) {
    const errorEmbed = embeds.error('Max Level', `All your ${type}s are already at maximum level (10).`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  const cost = INDIVIDUAL_UPGRADE_COSTS[type];
  if (user.pocket < cost) {
    const errorEmbed = embeds.error('Insufficient Funds', `${type.charAt(0).toUpperCase() + type.slice(1)} upgrade costs ${economy.formatMoney(cost)} coins.\nYou have ${economy.formatMoney(user.pocket)} coins.`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  // Upgrade one of the lowest level units
  const upgradeIndex = levels.findIndex(level => level === minLevel);
  levels[upgradeIndex] += 1;
  user.pocket -= cost;

  await gang.save();
  await user.save();

  const embed = embeds.success(
    'Personnel Upgraded',
    `Upgraded one ${type} from level ${minLevel} to level ${minLevel + 1}!\n\n` +
    `**Cost:** ${economy.formatMoney(cost)} coins\n` +
    `**Remaining Pocket:** ${economy.formatMoney(user.pocket)} coins`
  );
  return message.channel.send({ embeds: [embed] });
}

// Handle bulk upgrade (upgrades all lowest level units to match the next level)
async function handleBulkUpgrade(message, gang, user, type) {
  const unitType = type === 'guards' ? 'guard' : 'medic';

  // Initialize army arrays if they don't exist
  if (!gang.army.guardLevels) gang.army.guardLevels = [];
  if (!gang.army.medicLevels) gang.army.medicLevels = [];

  const levels = type === 'guards' ? gang.army.guardLevels : gang.army.medicLevels;
  const count = type === 'guards' ? gang.army.guards : gang.army.medics;

  // Ensure levels array matches count
  while (levels.length < count) {
    levels.push(1);
  }
  levels.splice(count); // Remove excess levels

  if (count === 0) {
    const errorEmbed = embeds.error('No Personnel', `You don't have any ${unitType}s to upgrade. Hire some first with \`.hire ${unitType}\`.`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  // Find the lowest level and count how many are at that level
  const minLevel = Math.min(...levels);
  if (minLevel >= 10) {
    const errorEmbed = embeds.error('Max Level', `All your ${unitType}s are already at maximum level (10).`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  const unitsToUpgrade = levels.filter(level => level === minLevel).length;
  const cost = INDIVIDUAL_UPGRADE_COSTS[unitType] * unitsToUpgrade;

  if (user.pocket < cost) {
    const errorEmbed = embeds.error('Insufficient Funds', `Upgrading ${unitsToUpgrade} ${unitType}s costs ${economy.formatMoney(cost)} coins.\nYou have ${economy.formatMoney(user.pocket)} coins.`);
    return message.channel.send({ embeds: [errorEmbed] });
  }

  // Upgrade all units at the lowest level
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] === minLevel) {
      levels[i] += 1;
    }
  }
  user.pocket -= cost;

  await gang.save();
  await user.save();

  const embed = embeds.success(
    'Personnel Upgraded',
    `Upgraded ${unitsToUpgrade} ${unitType}s from level ${minLevel} to level ${minLevel + 1}!\n\n` +
    `**Cost:** ${economy.formatMoney(cost)} coins\n` +
    `**Remaining Pocket:** ${economy.formatMoney(user.pocket)} coins`
  );
  return message.channel.send({ embeds: [embed] });
}

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