const Gang = require('../../models/Gang');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');
const { getBaseName, getGuardTrainingBonus, getMedicTrainingBonus } = require('../../utils/gangUpgrades');

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

module.exports = {
  name: 'army',
  description: 'View guard and medic stats (count, levels, percentages)',
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

      // Ensure all gang objects exist (for older gangs)
      if (!gang.base) {
        gang.base = {
          level: 1,
          vault: 0,
          guards: 4,
          defenses: 0,
          hp: 250,
          lastRaid: null
        };
      }
      if (!gang.upgrades) {
        gang.upgrades = {
          weapons: 1,
          walls: 1,
          guardsTraining: 1,
          medicTraining: 1
        };
      }
      if (!gang.army) {
        gang.army = {
          guards: 0,
          medics: 0
        };
      }
      // Save if any initialization was needed
      await gang.save();

      const baseStats = getBaseStats(gang.base.level);
      const maxGuards = baseStats.maxGuards;
      const maxMedics = baseStats.maxMedics;
      const currentGuards = gang.army.guards || 0;
      const currentMedics = gang.army.medics || 0;
      
      // Initialize level arrays if they don't exist
      if (!gang.army.guardLevels) gang.army.guardLevels = [];
      if (!gang.army.medicLevels) gang.army.medicLevels = [];
      
      // Ensure level arrays match counts
      while (gang.army.guardLevels.length < currentGuards) {
        gang.army.guardLevels.push(1);
      }
      while (gang.army.medicLevels.length < currentMedics) {
        gang.army.medicLevels.push(1);
      }
      gang.army.guardLevels.splice(currentGuards);
      gang.army.medicLevels.splice(currentMedics);
      
      // Save any changes to level arrays
      if (gang.isModified()) {
        await gang.save();
      }
      
      // Get upgrade levels
      const guardTrainingLevel = gang.upgrades?.guardsTraining || 1;
      const medicTrainingLevel = gang.upgrades?.medicTraining || 1;
      
      // Calculate effectiveness
      const baseGuardProtection = 5; // Level 1 guards protect 5%
      const guardTrainingBonus = getGuardTrainingBonus(guardTrainingLevel);
      const totalGuardProtection = baseGuardProtection + guardTrainingBonus;
      
      const baseMedicHealing = 5; // Level 1 medics heal 5% of base HP
      const medicTrainingBonus = getMedicTrainingBonus(medicTrainingLevel);
      const totalMedicEfficiency = baseMedicHealing + medicTrainingBonus;
      
      // Calculate actual healing per medic
      const healingPerMedic = Math.floor(baseStats.maxHP * (totalMedicEfficiency / 100));

      let armyInfo = `**${gang.name} Army Status**\n\n`;
      
      // Guards section
      armyInfo += `🛡️ **Guards: ${currentGuards}/${maxGuards}**\n`;
      if (currentGuards > 0) {
        const guardLevels = gang.army.guardLevels.slice().sort((a, b) => b - a);
        armyInfo += `├ Levels: [${guardLevels.join(', ')}]\n`;
        armyInfo += `├ Training Bonus: ${guardTrainingLevel} (+${guardTrainingBonus}%)\n`;
        armyInfo += `├ Base Protection: ${baseGuardProtection}% per guard\n`;
        armyInfo += `├ Total Protection: ${totalGuardProtection}% per guard\n`;
        armyInfo += `└ Total Defense: ${currentGuards * totalGuardProtection}%\n\n`;
      } else {
        armyInfo += `└ No guards hired\n\n`;
      }
      
      // Medics section
      armyInfo += `🏥 **Medics: ${currentMedics}/${maxMedics}**\n`;
      if (currentMedics > 0) {
        const medicLevels = gang.army.medicLevels.slice().sort((a, b) => b - a);
        armyInfo += `├ Levels: [${medicLevels.join(', ')}]\n`;
        armyInfo += `├ Training Bonus: ${medicTrainingLevel} (+${medicTrainingBonus}%)\n`;
        armyInfo += `├ Base Healing: ${baseMedicHealing}% of base HP per medic\n`;
        armyInfo += `├ Total Efficiency: ${totalMedicEfficiency}% per medic\n`;
        armyInfo += `├ Healing per Medic: ${healingPerMedic} HP\n`;
        armyInfo += `└ Total Healing: ${currentMedics * healingPerMedic} HP per repair\n\n`;
      } else {
        armyInfo += `└ No medics hired\n\n`;
      }
      
      // Base info
      armyInfo += `🏠 **Base: ${getBaseName(gang.base.level)} (Level ${gang.base.level})**\n`;
      armyInfo += `├ Max Guards: ${maxGuards}\n`;
      armyInfo += `├ Max Medics: ${maxMedics}\n`;
      armyInfo += `└ Current HP: ${gang.base.hp || baseStats.maxHP}/${baseStats.maxHP}\n\n`;
      
      // Hiring info
      if (currentGuards < maxGuards || currentMedics < maxMedics) {
        armyInfo += `**Hiring:**\n`;
        armyInfo += `Use \`.hire guard\` (6,000 coins) or \`.hire medic\` (7,000 coins)\n`;
        armyInfo += `*Must be outside base to hire personnel*\n\n`;
      }
      
      // Upgrade info
      armyInfo += `**Individual Upgrades:**\n`;
      armyInfo += `\`.upgrade guard\` - Upgrade one guard (12,000 coins)\n`;
      armyInfo += `\`.upgrade guards\` - Upgrade all lowest level guards\n`;
      armyInfo += `\`.upgrade medic\` - Upgrade one medic (15,000 coins)\n`;
      armyInfo += `\`.upgrade medics\` - Upgrade all lowest level medics\n\n`;
      armyInfo += `**Training Upgrades:**\n`;
      armyInfo += `\`.upgrade guardstraining\` or \`.upgrade medictraining\` for global bonuses`;

      const embed = embeds.info('Gang Army', armyInfo);

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Army command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while viewing army stats.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};