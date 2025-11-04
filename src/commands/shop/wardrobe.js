const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const SHOP_ITEMS = require('../../utils/shopItems');

// Discord role IDs for name styles (these need to be created in your server)
const STYLE_ROLES = {
    'flame-style': '1431735280079208600', // Replace with actual role ID
    'cyan-style': '1431734932476002467',   // Replace with actual role ID
    'immo-style': '1431735564201365604',   // Replace with actual role ID
    'lavender-style': '1431735561458290760', // Replace with actual role ID
    'vip-style': '1430841152520847452'      // Replace with actual role ID
};

module.exports = {
    name: 'wardrobe',
    aliases: ['styles'],
    description: 'Manage your purchased styles and cosmetics',
    async execute(msg) {
        try {
            const user = await User.findOne({ userId: msg.author.id });
            if (!user) {
                const errorEmbed = embeds.error('No Profile', 'You need to use an economy command first to create your profile');
                return msg.channel.send({ embeds: [errorEmbed] });
            }

            if (!user.inventory || user.inventory.length === 0) {
                const errorEmbed = embeds.error('Empty Wardrobe', 'You haven\'t purchased any styles yet!\n\nUse `.shop` to browse and buy cosmetic items.');
                return msg.channel.send({ embeds: [errorEmbed] });
            }

            // Get owned name style items
            const ownedStyles = [];

            user.inventory.forEach(itemId => {
                const item = SHOP_ITEMS[itemId];
                if (item && item.category === 'Styles') {
                    ownedStyles.push({ id: itemId, ...item });
                }
            });

            // Create wardrobe display
            let wardrobeText = '';

            // if (ownedStyles.length > 0) {
            //     wardrobeText += '**Available Name Styles:**\n';
            //     ownedStyles.forEach(item => {
            //         const isActive = user.activeStyles?.nameColor === item.id;
            //         const status = isActive ? '✅ **ACTIVE**' : '⚪ Available';
            //         wardrobeText += `${status} ${item.displayName}\n`;
            //     });
            //     wardrobeText += '\n';
            // } else {
            //     wardrobeText = 'No name styles found in your wardrobe.\n\nPurchase name styles from `.shop` → Styles category to add them to your wardrobe.';
            // }

            // Show style selection immediately
            if (ownedStyles.length > 0) {
                // Create select menu options
                const options = [];

                // Always add remove option first
                options.push({
                    label: 'No Style',
                    value: 'remove',
                    description: 'Stop wearing your current style',
                    emoji: '🚫'
                });

                // Add owned styles
                ownedStyles.forEach(item => {
                    const isActive = user.activeStyles?.nameColor === item.id;
                    options.push({
                        label: item.displayName,
                        value: item.id,
                        description: item.description,
                        emoji: isActive ? '✅' : '🎨'
                    });
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`wardrobe_select_style_${msg.author.id}`)
                    .setPlaceholder(options[0].emoji + options[0].label)
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const wardrobeEmbed = embeds.info(
                    'Your Wardrobe',
                    `Choose which style to wear:\n\n${wardrobeText}`
                );

                msg.channel.send({ embeds: [wardrobeEmbed], components: [row] });
            } else {
                const wardrobeEmbed = embeds.info(
                    'Your Wardrobe',
                    wardrobeText
                );
                msg.channel.send({ embeds: [wardrobeEmbed] });
            }

        } catch (error) {
            console.error('Wardrobe command error:', error);
            const errorEmbed = embeds.error('Command Error', 'An error occurred while accessing your wardrobe.');
            msg.channel.send({ embeds: [errorEmbed] });
        }
    },


};

// Handle select menu interactions
async function handleSelectMenu(interaction) {
    const [, , category, userId] = interaction.customId.split('_');

    if (interaction.user.id !== userId) {
        return interaction.reply({ content: 'This selection is not for you', flags: 64 });
    }

    const user = await User.findOne({ userId });
    if (!user) {
        return interaction.reply({ content: 'User profile not found', flags: 64 });
    }

    const selectedValue = interaction.values[0];

    if (category === 'style') {
        await applyNameColorStyle(interaction, user, selectedValue);
    }
}

async function applyNameColorStyle(interaction, user, styleId) {
    try {
        const member = await interaction.guild.members.fetch(user.userId);

        // Remove current style role if exists
        if (user.activeStyles?.nameColor && STYLE_ROLES[user.activeStyles.nameColor]) {
            const oldRoleId = STYLE_ROLES[user.activeStyles.nameColor];
            if (member.roles.cache.has(oldRoleId)) {
                await member.roles.remove(oldRoleId);
            }
        }

        if (styleId === 'remove') {
            user.activeStyles.nameColor = null;
            await user.save();

            return interaction.reply({ content: '🚫 You have removed your name style.', ephemeral: true });
        }

        // Apply new style role
        const roleId = STYLE_ROLES[styleId];
        if (!roleId || roleId.includes('_HERE')) {
            return interaction.reply({ content: 'This style role is not configured on this server. Please contact an admin.', flags: 64 });
        }

        await member.roles.add(roleId);

        // Update user's active style
        user.activeStyles.nameColor = styleId;
        await user.save();

        const item = SHOP_ITEMS[styleId];

        interaction.reply({
            content: `✅ You are now wearing **${item.displayName}**! Your name will now appear with the ${item.displayName} in the server.`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Apply name style error:', error);
        interaction.reply({ content: 'An error occurred while applying the name style. Make sure the bot has permission to manage roles.', flags: 64 });
    }
}



module.exports.handleSelectMenu = handleSelectMenu;