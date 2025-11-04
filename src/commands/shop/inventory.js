const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
  name: 'inventory',
  aliases: ['inv'],
  description: 'View your purchased items',
  async execute(msg, args) {
    const targetUser = msg.mentions.users.first() || msg.author;
    const user = await economy.getUser(targetUser.id);

    if (!user.inventory || user.inventory.length === 0) {
      const emptyEmbed = embeds.info(
        `${targetUser.username}'s Inventory`,
        `${targetUser.id === msg.author.id ? 'You have' : `${targetUser.username} has`} no items\n\nUse \`.shop\` to browse available items`
      );
      return msg.channel.send({ embeds: [emptyEmbed] });
    }

    // Group items by category
    const categories = {};
    for (const itemId of user.inventory) {
      const item = SHOP_ITEMS[itemId];
      if (item) {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push({
          id: itemId,
          description: item.description,
          price: item.price
        });
      }
    }

    const inventoryEmbed = embeds.info(
      `${targetUser.username}'s Inventory`,
      `**Total Items:** ${user.inventory.length}`
    );

    // Add fields for each category
    for (const [category, items] of Object.entries(categories)) {
      const itemList = items
        .map(item => {
          const shopItem = SHOP_ITEMS[item.id];
          const displayName = shopItem?.displayName || item.id;
          return `${displayName}`;
        })
        .join('\n');
      
      inventoryEmbed.addFields({
        name: category,
        value: itemList,
        inline: false
      });
    }

    // Calculate total value
    const totalValue = user.inventory.reduce((sum, itemId) => {
      const item = SHOP_ITEMS[itemId];
      return sum + (item ? item.price : 0);
    }, 0);

    inventoryEmbed.setFooter({ 
      text: `Total inventory value: ${economy.formatMoney(totalValue)} coins` 
    });

    msg.channel.send({ embeds: [inventoryEmbed] });
  }
};