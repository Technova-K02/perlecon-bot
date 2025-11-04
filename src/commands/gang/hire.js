const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const { isUserKidnapped } = require('../../utils/kidnapping');
const { getBaseName } = require('../../utils/gangUpgrades');

// Personnel costs and limits from the image
const PERSONNEL = {
  guard: {
    name: 'Guard',
    cost: 6000,
    effect: 'Protects base and reduces chance of being robbed',
    description: 'Guards protect your base from robberies and provide base defense'
  },
  medic: {
    name: 'Medic', 
    cost: 7000,
    effect: 'Repairs base damage when .repair is used',
    description: 'Medics can repair base damage and heal your base HP'
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

module.exports = {
  name: 'hire',
  description: 'Hire guards or medics for your gang (must be outside base)',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot hire personnel');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get user data
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user is outside base
      if (user.status === 'base') {
        const errorEmbed = embeds.error('Inside Base', 'You must be outside your base to hire personnel. Use `.leavebase` first.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get gang data
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

      // Check if user is leader or officer
      if (gang.leaderId !== message.author.id && !gang.officers.includes(message.author.id)) {
        const errorEmbed = embeds.error('Permission Denied', 'Only gang leaders and officers can hire personnel');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const personnelType = args[0]?.toLowerCase();

      if (!personnelType) {
        const baseStats = getBaseStats(gang.base.level);
        const currentGuards = gang.army?.guards || 0;
        const currentMedics = gang.army?.medics || 0;
        
        const embed = embeds.info(
          'Gang Personnel Hiring',
          `**Current Army:**\n` +
          `Guards: ${currentGuards}/${baseStats.maxGuards}\n` +
          `Medics: ${currentMedics}/${baseStats.maxMedics}\n\n` +
          `**Available to Hire:**\n` +
          `**Guard** - ${economy.formatMoney(PERSONNEL.guard.cost)} coins\n` +
          `└ ${PERSONNEL.guard.effect}\n\n` +
          `**Medic** - ${economy.formatMoney(PERSONNEL.medic.cost)} coins\n` +
          `└ ${PERSONNEL.medic.effect}\n\n` +
          `**Usage:**\n` +
          `\`.hire guard\` - Hire a guard\n` +
          `\`.hire medic\` - Hire a medic\n\n` +
          `**Note:** You must be outside your base to hire personnel\n` +
          `**Base Level:** ${getBaseName(gang.base.level)} (Guards: ${baseStats.maxGuards}, Medics: ${baseStats.maxMedics})`
        );

        return message.channel.send({ embeds: [embed] });
      }

      // Validate personnel type
      if (!PERSONNEL[personnelType]) {
        const errorEmbed = embeds.error('Invalid Personnel', 'Available personnel: guard, medic');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const personnel = PERSONNEL[personnelType];
      const baseStats = getBaseStats(gang.base.level);
      
      // Initialize army if not exists
      if (!gang.army) {
        gang.army = { guards: 0, medics: 0 };
      }

      const currentCount = gang.army[personnelType + 's'] || 0;
      const maxCount = personnelType === 'guard' ? baseStats.maxGuards : baseStats.maxMedics;

      // Check if at max capacity
      if (currentCount >= maxCount) {
        const errorEmbed = embeds.error('Max Capacity', `You already have the maximum number of ${personnelType}s (${maxCount}) for your base level.\nUpgrade your base to hire more personnel.`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user has enough money
      if (user.pocket < personnel.cost) {
        const errorEmbed = embeds.error('Insufficient Funds', `You need ${economy.formatMoney(personnel.cost)} coins to hire a ${personnel.name}.\nYou have ${economy.formatMoney(user.pocket)} coins in your pocket.`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Initialize level arrays if they don't exist
      if (!gang.army.guardLevels) gang.army.guardLevels = [];
      if (!gang.army.medicLevels) gang.army.medicLevels = [];

      // Hire the personnel
      user.pocket -= personnel.cost;
      gang.army[personnelType + 's'] += 1;
      
      // Add level 1 to the appropriate level array
      if (personnelType === 'guard') {
        gang.army.guardLevels.push(1);
      } else if (personnelType === 'medic') {
        gang.army.medicLevels.push(1);
      }

      await user.save();
      await gang.save();

      const embed = embeds.success(
        'Personnel Hired',
        `You hired a **${personnel.name}** for your gang!\n\n` +
        `**Effect:** ${personnel.effect}\n\n`
      );

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Hire command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while hiring personnel.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};