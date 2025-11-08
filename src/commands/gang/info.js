const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');
const { getTool, getToolList } = require('../../utils/gangTools');

module.exports = {
  name: 'info',
  description: 'Learn what a tool does',
  async execute(message, args) {
    try {
      if (!args[0]) {
        const errorEmbed = embeds.error('Missing Item', `Please specify an item to get information about\nUsage: \`.info <item>\`\n\n**Available tools:** ${getToolList()}\n**Available upgrades:** weapons, walls, guards, medics`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if it's an upgrade type
      const { getAllUpgrades } = require('../../utils/gangUpgrades');
      const upgrades = getAllUpgrades();
      const upgradeMap = {
        'weapons': 'weapons',
        'weapon': 'weapons',
        'walls': 'walls',
        'wall': 'walls',
        'guards': 'guardsTraining',
        'guard': 'guardsTraining',
        'guardstraining': 'guardsTraining',
        'medics': 'medicTraining',
        'medic': 'medicTraining',
        'medictraining': 'medicTraining',
        'bases': 'bases',
        'base': 'bases'
      };

      const upgradeType = upgradeMap[args[0].toLowerCase()];
      if (upgradeType && upgrades[upgradeType]) {
        const upgrade = upgrades[upgradeType];
        const { getUpgradeCost, getBaseName } = require('../../utils/gangUpgrades');

        // Generate level-based pricing display
        let levelPricing = '';
        
        // Special handling for base upgrades
        if (upgradeType === 'bases') {
          // Base upgrade costs are stored in the base stats table
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
          
          for (let level = 1; level <= upgrade.maxLevel; level++) {
            const stats = baseData[level];
            const baseName = getBaseName(level);
            levelPricing += `lvl ${level} - ${baseName} - ${economy.formatMoney(stats.upgradeCost)} coins\n`;
            levelPricing += `  └ HP: ${stats.maxHP} | Safe: ${economy.formatMoney(stats.safeCapacity)} | Guards: ${stats.maxGuards} | Medics: ${stats.maxMedics}\n`;
            if (level < upgrade.maxLevel) {
              levelPricing += ' ';
            }
          }
        } else {
          // Standard upgrade pricing
          for (let level = 1; level <= Math.min(upgrade.maxLevel, 9); level++) {
            const cost = getUpgradeCost(upgradeType, level);
            levelPricing += `lvl ${level} - ${economy.formatMoney(cost)} coins\n`;
            if (level < Math.min(upgrade.maxLevel, 10)) {
              levelPricing += ' ';
            }
          }
        }

        const embed = embeds.info(
          `🔧 ${upgrade.name} Upgrade`,
          `${upgrade.description}\n\n**Pricing:\n** ${levelPricing}`
        ).addFields(
          { name: 'Max Level', value: `${upgrade.maxLevel}`, inline: true },
          { name: 'Effect per Level', value: upgrade.effectPerLevel, inline: false },
          { name: 'Purchase', value: `Use \`.upgrade ${args[0].toLowerCase()}\` to upgrade\n`, inline: false }
        );

        return message.channel.send({ embeds: [embed] });
      }

      const tool = getTool(args[0]);
      if (!tool) {
        const errorEmbed = embeds.error('Invalid Item', `Item "${args[0]}" not found.\n\n**Available tools:** ${getToolList()}\n**Available upgrades:** weapons, walls, guards, medics`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const toolKey = args[0].toLowerCase();

      const embed = embeds.info(
        `🔧 ${tool.name}`,
        tool.description
      ).addFields(
        { name: 'Price', value: `${economy.formatMoney(tool.price)} coins`, inline: true },
        { name: 'Type', value: tool.type, inline: true },
        { name: 'Used For', value: tool.usedFor, inline: true },
        { name: 'Effect', value: tool.effect, inline: false },
        { name: 'Purchase', value: `Use \`.buy ${toolKey}\` to purchase this tool\n*Must be outside your base to buy*`, inline: false }
      );

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Info command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting tool information.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};