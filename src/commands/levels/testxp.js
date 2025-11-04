const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'testxp',
  description: 'Test XP system - shows your current XP',
  async execute(message) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      
      if (!user) {
        const embed = embeds.info('XP Test', 'You have no data yet. Send some messages to gain XP');
        return message.channel.send({ embeds: [embed] });
      }

      const embed = embeds.info('XP Test Results', 
        `**Your Stats:**\n` +
        `Total XP: ${economy.formatNumber(user.xp)}\n` +
        `Level: ${user.level}\n` +
        `Messages: ${user.messageCount}\n` +
        `Weekly Messages: ${user.weeklyTextMessages}\n` +
        `Weekly Voice Minutes: ${user.weeklyVoiceMinutes}`
      );
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Test XP error:', error);
      const errorEmbed = embeds.error('Error', 'Failed to get XP data');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};


