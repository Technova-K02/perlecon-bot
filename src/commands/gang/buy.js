const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const { isUserKidnapped } = require('../../utils/kidnapping');
const SHOP_ITEMS = require('../../utils/shopItems');
const { getTool, getToolList } = require('../../utils/gangTools');

module.exports = {
  name: 'buy',
  description: 'Buy a tool for your gang or an item from the shop',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot buy anything');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!args[0]) {
        const errorEmbed = embeds.error('Missing Item', `Please specify an item to buy\nUsage: \`.buy <item>\`\n\n**Gang Tools:** ${getToolList()}\n**Shop Items:** Use \`.shop\` to browse available items`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get user data
      const user = await User.findOne({ userId: message.author.id });
      if (!user) {
        const errorEmbed = embeds.error('User Error', 'User data not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const itemName = args[0].toLowerCase();

      // Check if it's personnel (guard/medic)
      if (itemName === 'guard' || itemName === 'medic') {
        const errorEmbed = embeds.error('Use Hire Command', `To hire ${itemName}s, use \`.hire ${itemName}\` instead.\n\n*Personnel must be hired while outside your base*`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if it's a gang tool
      const tool = getTool(itemName);
      if (tool) {
        // Handle gang tool purchase
        if (!user.gang) {
          const errorEmbed = embeds.error('No Gang', 'You need to be in a gang to buy tools');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Check if user is outside base
        if (user.status === 'base') {
          const errorEmbed = embeds.error('Inside Base', 'You must be outside your base to buy tools. Use `.leavebase` first.');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Check if user has enough money
        if (user.pocket < tool.price) {
          const errorEmbed = embeds.error('Insufficient Funds', `You need ${economy.formatMoney(tool.price)} coins to buy ${tool.name}.\nYou have ${economy.formatMoney(user.pocket)} coins in your pocket.`);
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Get gang data
        const gang = await Gang.findById(user.gang);
        if (!gang) {
          const errorEmbed = embeds.error('Gang Error', 'Gang not found');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Purchase the tool
        user.pocket -= tool.price;
        gang.tools[tool.field] += 1;

        await user.save();
        await gang.save();

        const embed = embeds.success(
          'Tool Purchased',
          `You bought a **${tool.name}** for your gang!\n\n` +
          `**Cost:** ${economy.formatMoney(tool.price)} coins\n` +
          `**Type:** ${tool.type}\n` +
          `**Used For:** ${tool.usedFor}\n` +
          `**Effect:** ${tool.effect}\n\n` +
          `**Your Pocket:** ${economy.formatMoney(user.pocket)} coins\n` +
          `**Gang now has:** ${gang.tools[tool.field]} ${tool.name}(s)`
        );

        return message.channel.send({ embeds: [embed] });
      }

      // Check if it's a shop item
      const shopItem = SHOP_ITEMS[itemName];
      if (shopItem) {
        // Handle shop item purchase
        // Check if user has enough money
        if (user.pocket < shopItem.price) {
          const errorEmbed = embeds.error('Insufficient Funds', `You need ${economy.formatMoney(shopItem.price)} coins to buy ${shopItem.displayName}.\nYou have ${economy.formatMoney(user.pocket)} coins in your pocket.`);
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Check if user already owns this item
        if (!user.inventory) user.inventory = [];
        if (user.inventory.includes(itemName)) {
          const errorEmbed = embeds.error('Already Owned', 'You already own this item');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        // Purchase the item
        await economy.removeMoney(message.author.id, shopItem.price, 'shop');
        user.inventory.push(itemName);
        await user.save();

        // Log transaction
        const transaction = new Transaction({
          from: message.author.id,
          amount: shopItem.price,
          type: 'shop',
          description: `Shop Purchase: ${itemName} - ${shopItem.description}`
        });
        await transaction.save();

        const embed = embeds.success(
          'Item Purchased',
          `You bought **${shopItem.displayName}** from the shop!\n\n` +
          `**Cost:** ${economy.formatMoney(shopItem.price)} coins\n` +
          `**Category:** ${shopItem.category}\n` +
          `**Description:** ${shopItem.description}\n\n` +
          `**Your Pocket:** ${economy.formatMoney(user.pocket - shopItem.price)} coins`
        );

        return message.channel.send({ embeds: [embed] });
      }

      // Item not found
      const errorEmbed = embeds.error('Item Not Found', `Item "${args[0]}" not found.\n\n**Gang Tools:** ${getToolList()}\n**Shop Items:** Use \`.shop\` to browse available items`);
      return message.channel.send({ embeds: [errorEmbed] });

    } catch (error) {
      console.error('Buy command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while buying the item.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};