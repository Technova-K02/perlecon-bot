const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
  name: 'shop',
  description: 'Browse and buy items from the shop',
  async execute(msg, args) {
    // Show main shop with category buttons
    const shopEmbed = embeds.info(
      'Shop',
      '> Browse items and customize your experience\n\nSelect a category below to view available items:'
    );

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_cats_${msg.author.id}`)
          .setLabel('Cats')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`shop_styles_${msg.author.id}`)
          .setLabel('Styles')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`shop_tools_${msg.author.id}`)
          .setLabel('Tools')
          .setStyle(ButtonStyle.Success)
      );
    msg.channel.send({ embeds: [shopEmbed], components: [buttons] });
  },

  async handleButton(interaction) {
    const [action, category, userId] = interaction.customId.split('_');
    
    // Debug logging to help troubleshoot button issues
    console.log(`🔍 Shop button pressed: ${interaction.customId}`);
    console.log(`📊 Parsed: action="${action}", category="${category}", userId="${userId}"`);

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'This shop interface is not for you', flags: 64 });
    }

    if (action === 'shop') {
      // Show category items (exclude special roles)
      const categoryItems = Object.entries(SHOP_ITEMS)
        .filter(([id, item]) =>
          item.category === category.charAt(0).toUpperCase() + category.slice(1) &&
          !item.special
        );

      let categoryDescription = 'Click on an item below to purchase it:';

      if (category === 'styles' || category === 'cats') {
        categoryDescription = 'Click on an item below to purchase it:\n\n';

        // const emojis = message.guild.emojis.cache.map(emoji => `${emoji.name}: <:${emoji.name}:${emoji.id}>`).join('\n');
        // message.channel.send(`Here are the emojis:\n${emojis}`);

        // const emojiID = '1434922372225302528';
        categoryItems.forEach(([itemId, item]) => {
          categoryDescription += `**<:${item.emoji}:${item.emoji_id}>** **${item.displayName}** - ${economy.formatMoney(item.price)} coins\n`;
          // categoryDescription += `   ${item.description}\n`;
        });
      }

      // Add special description for Tools category
      if (category === 'tools') {
        categoryDescription = '🛠️ **Gang Tools & Equipment**\n' +
          'Permanently upgrade your gang operations!\n\n' +
          '**Lockpicks** - Permanent robbing success upgrades\n' +
          '**Breach Charges** - Consumable raiding boosters\n\n' +
          '⚠️ **Note:** Lockpicks are one-time purchases that permanently upgrade your gang.\n' +
          'Click on an item below to purchase it:';
      }

      const categoryEmbed = embeds.info(
        `Shop - ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        categoryDescription
      );

      // Create buttons for items (max 5 per row, max 25 total)
      const buttons = [];
      let currentRow = new ActionRowBuilder();
      let buttonCount = 0;
      let totalButtons = 0;

      for (const [itemId, item] of categoryItems) {
        if (totalButtons >= 25) break; // Max 25 buttons (5 rows of 5)

        if (buttonCount === 5) {
          buttons.push(currentRow);
          currentRow = new ActionRowBuilder();
          buttonCount = 0;
        }

        // Create enhanced label for tools
        let buttonLabel = `${item.displayName}`;
        if (item.category === 'Tools') {
          buttonLabel = `${item.displayName} (${item.type}) - ${economy.formatMoney(item.price)}`;
        }

        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${itemId}_${userId}`)
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Success)
        );
        buttonCount++;
        totalButtons++;
      }

      if (buttonCount > 0) {
        buttons.push(currentRow);
      }

      // No back button - users can use .shop command to return to categories
      interaction.update({ embeds: [categoryEmbed], components: buttons });
    } else if (action === 'buy') {
      const itemId = category; // In buy buttons, category is actually the itemId
      const item = SHOP_ITEMS[itemId];

      if (!item) {
        return interaction.reply({ content: 'Item not found', flags: 64 });
      }

      // Prevent purchasing special roles
      if (item.special) {
        return interaction.reply({ content: 'This is a special role that cannot be purchased', flags: 64 });
      }

      const user = await economy.getUser(userId);

      // Check if user has enough money
      if (user.pocket < item.price) {
        return interaction.reply({
          content: `You need ${economy.formatMoney(item.price)} coins to buy this item. You have ${economy.formatMoney(user.pocket)} coins.`,
          flags: 64
        });
      }

      // Check if user already owns this item
      if (item.category === 'Tools') {
        // For tools, check if user is in a gang
        if (!user.gang) {
          return interaction.reply({ content: 'You must be in a gang to purchase tools', flags: 64 });
        }

        // Check if gang already owns this tool (one-time purchase)
        const Gang = require('../../models/Gang');
        const gang = await Gang.findById(user.gang);
        if (!gang) {
          return interaction.reply({ content: 'Gang not found', flags: 64 });
        }

        const toolFieldMap = {
          'basic-lockpick': 'basicLockpick',
          'steel-lockpick': 'steelLockpick',
          'titan-lockpick': 'titanLockpick',
          'breach-charge': 'breachCharge'
        };

        const toolField = toolFieldMap[itemId];
        if (toolField && gang.tools[toolField] > 0) {
          return interaction.reply({ content: 'Your gang already owns this tool', flags: 64 });
        }
      } else {
        // For non-tools, check personal inventory
        if (!user.inventory) user.inventory = [];
        if (user.inventory.includes(itemId)) {
          return interaction.reply({ content: 'You already own this item', flags: 64 });
        }
      }

      // Purchase the item
      await economy.removeMoney(userId, item.price, 'shop');

      if (item.category === 'Tools') {
        // For tools, add to gang inventory instead of personal inventory
        const Gang = require('../../models/Gang');
        const gang = await Gang.findById(user.gang);

        if (!gang) {
          return interaction.reply({ content: 'You must be in a gang to purchase tools', flags: 64 });
        }

        // Map item IDs to gang tool fields
        const toolFieldMap = {
          'basic-lockpick': 'basicLockpick',
          'steel-lockpick': 'steelLockpick',
          'titan-lockpick': 'titanLockpick',
          'breach-charge': 'breachCharge'
        };

        const toolField = toolFieldMap[itemId];
        if (toolField) {
          gang.tools[toolField] = 1; // Set to 1 (one-time purchase)
          await gang.save();
        }
      } else {
        // For non-tools, add to personal inventory
        user.inventory.push(itemId);
        await user.save();
      }

      // Log transaction
      const transaction = new Transaction({
        from: userId,
        amount: item.price,
        type: 'shop',
        description: `Shop Purchase: ${itemId} - ${item.description}`
      });
      await transaction.save();

      // Create enhanced success message for tools
      let successMessage = `You bought **${item.displayName}** for ${economy.formatMoney(item.price)} coins\n\n`;
        // `**Item:** ${item.description}\n` +
        // `**Category:** ${item.category}\n\n`;

      if (item.category === 'Tools') {
        successMessage = `You bought **${item.displayName}** for ${economy.formatMoney(item.price)} coins\n\n` +
          `**Description:** ${item.description}\n` +
          `**Type:** ${item.type}\n` +
          `**Used For:** ${item.usedFor}\n` +
          `**Effect:** ${item.effect}\n\n` +
          `🛠️ **This tool has been added to your gang's inventory!**\n` +
          `Use \`.tools\` to view all gang tools.\n\n`;
      }

      // successMessage += `**New Balance:** ${economy.formatMoney(user.pocket)} coins`;

      const successEmbed = embeds.success('Purchase Successful', successMessage);

      interaction.reply({ embeds: [successEmbed], flags: 64 });
    }
  }
};