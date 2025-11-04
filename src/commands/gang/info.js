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
        'medictraining': 'medicTraining'
      };

      const upgradeType = upgradeMap[args[0].toLowerCase()];
      if (upgradeType && upgrades[upgradeType]) {
        const upgrade = upgrades[upgradeType];
        const embed = embeds.info(
          `🔧 ${upgrade.name} Upgrade`,
          upgrade.description
        ).addFields(
          { name: 'Base Cost', value: `${economy.formatMoney(upgrade.baseCost)} coins`, inline: true },
          { name: 'Cost Growth', value: `×${upgrade.costMultiplier} per level`, inline: true },
          { name: 'Max Level', value: `${upgrade.maxLevel}`, inline: true },
          { name: 'Effect per Level', value: upgrade.effectPerLevel, inline: false },
          { name: 'Purchase', value: `Use \`.upgrade ${args[0].toLowerCase()}\` to upgrade\n*Leaders only*`, inline: false }
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