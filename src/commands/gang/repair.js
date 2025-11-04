const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const { getMedicTrainingBonus } = require('../../utils/gangUpgrades');

module.exports = {
  name: 'repair',
  description: 'Order medics to repair your base (2 minute cooldown per medic)',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.status === 'kidnapped') {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot repair the base');
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

      // Get medics from army
      const medics = gang.army?.medics || 0;
      if (medics === 0) {
        const errorEmbed = embeds.error('No Medics', 'Your gang has no medics available. Use `.hire medic` to hire medics for your gang.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check cooldown (2 minutes per user)
      const cooldownKey = 'repair';
      const cooldownTime = 2 * 60 * 1000; // 2 minutes in milliseconds
      const lastRepair = user.cooldowns.get(cooldownKey) || 0;
      const timeLeft = lastRepair + cooldownTime - Date.now();

      if (timeLeft > 0) {
        const minutes = Math.ceil(timeLeft / (60 * 1000));
        const errorEmbed = embeds.error('Cooldown Active', `You must wait ${minutes} minute(s) before repairing again`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate base stats from the progression table
      const baseStats = getBaseStats(gang.base.level);
      const currentHP = gang.base.hp || baseStats.maxHP;
      
      if (currentHP >= baseStats.maxHP) {
        const errorEmbed = embeds.error('Base Fully Repaired', 'Your base is already at full health');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate repair amount with medic training bonus
      const medicTrainingLevel = gang.upgrades?.medicTraining || 1;
      const medicTrainingBonus = getMedicTrainingBonus(medicTrainingLevel);
      
      // Level 1 medics heal 5% of base HP per medic
      // const baseStats = getBaseStats(gang.base.level);
      const baseMedicHealing = 5; // 5% base healing
      const totalMedicEfficiency = baseMedicHealing + medicTrainingBonus;
      const healingPerMedic = Math.floor(baseStats.maxHP * (totalMedicEfficiency / 100));
      const totalRepairAmount = medics * healingPerMedic;
      
      const newHP = Math.min(currentHP + totalRepairAmount, baseStats.maxHP);
      const actualRepair = newHP - currentHP;

      // Update base HP
      gang.base.hp = newHP;
      await gang.save();

      // Set cooldown
      user.cooldowns.set(cooldownKey, Date.now());
      await user.save();

      let repairMessage = `Your medics have repaired the base!\n\n` +
        `**Medics used:** ${medics}\n` +
        `**Base healing:** ${baseMedicHealing}% per medic\n`;
      
      if (medicTrainingBonus > 0) {
        repairMessage += `**Training bonus:** +${medicTrainingBonus}%\n`;
        repairMessage += `**Total efficiency:** ${totalMedicEfficiency}% per medic\n`;
      }
      
      repairMessage += `**Healing per medic:** ${healingPerMedic} HP\n` +
        `**Total repaired:** ${actualRepair} HP\n` +
        `**Current HP:** ${newHP}/${baseStats.maxHP}\n` +
        `**Base condition:** ${getBaseCondition(newHP, baseStats.maxHP)}\n\n` +
        `**Cooldown:** 2 minutes`;

      const embed = embeds.success('Base Repaired', repairMessage);

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Repair error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while repairing the base.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

// Base progression table from the image
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

function getBaseCondition(currentHP, maxHP) {
  const percentage = (currentHP / maxHP) * 100;
  if (percentage >= 90) return '🟢 Excellent';
  if (percentage >= 70) return '🟡 Good';
  if (percentage >= 50) return '🟠 Damaged';
  if (percentage >= 25) return '🔴 Heavily Damaged';
  return '💀 Critical';
}