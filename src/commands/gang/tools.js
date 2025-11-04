const Gang = require('../../models/Gang');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const { getAllTools } = require('../../utils/gangTools');

module.exports = {
  name: 'tools',
  description: 'View all tools your gang owns',
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

      let toolsList = '';
      let totalTools = 0;
      const allTools = getAllTools();

      // Check each tool type
      Object.entries(gang.tools).forEach(([field, owned]) => {
        if (owned > 0) {
          // Find tool by field name
          const tool = Object.values(allTools).find(t => t.field === field);
          if (tool) {
            toolsList += `✅ **${tool.name}** - Owned\n`;
            toolsList += `└ ${tool.type} • ${tool.usedFor}\n`;
            toolsList += `└ ${tool.effect}\n\n`;
            totalTools += 1;
          }
        }
      });

      if (totalTools === 0) {
        toolsList = 'No tools owned.\n\n🛒 **Purchase tools from the shop:**\nUse `.shop` and click the **Tools** tab to browse and buy gang tools!\n\nAvailable: Basic Lockpick, Steel Lockpick, Titan Lockpick, Breach Charge';
      }

      const embed = embeds.info(
        `${gang.name} Gang Tools`,
        `**Total Tools:** ${totalTools}\n\n${toolsList}`
      );

      if (totalTools > 0) {
        embed.addFields(
          { name: 'Purchase More', value: '🛒 Use `.shop` → **Tools** tab to buy more gang tools\nUse `.info <tool>` to learn about a specific tool', inline: false }
        );
      }

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Tools command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while viewing gang tools.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};