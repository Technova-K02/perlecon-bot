const embeds = require('../../utils/embeds');

module.exports = {
  name: 'shophelp',
  description: 'Show shop system commands',
  async execute(msg) {
    const shopHelpEmbed = embeds.info(
      'Shop System Help',
      '> Purchase items and customize your experience\n')
      .addFields(
        { name: 'Browse', value: '`.shop`\n', inline: true },
        // { name: 'Purchase', value: '`.shop buy <item-id>`', iline: true },
        { name: 'Inventory', value: '`.inventory(.inv) <user>`\n', inline: true },
        { name: 'Styles', value: '`.wardrobe`', inline: true }
      )
      .setFooter({ text: 'Start with .shop to browse available items' });

    msg.channel.send({ embeds: [shopHelpEmbed] });
  }
};