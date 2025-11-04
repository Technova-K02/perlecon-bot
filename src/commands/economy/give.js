const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const User = require('../../models/User');

// Helper function to check if user is kidnapped
async function isUserKidnapped(userId) {
  const user = await User.findOne({ userId });
  if (!user) return false;
  
  // Check if user is kidnapped and still within kidnap duration
  if (user.status === 'kidnapped' && user.kidnappedUntil && user.kidnappedUntil > new Date()) {
    return true;
  }
  
  // If kidnap time has expired, update status
  if (user.status === 'kidnapped' && user.kidnappedUntil && user.kidnappedUntil <= new Date()) {
    user.status = 'base';
    user.kidnappedUntil = null;
    user.kidnappedBy = null;
    await user.save();
    return false;
  }
  
  return user.status === 'kidnapped';
}

module.exports = {
  name: 'give',
  aliases: ['send', 'pay'],
  description: 'Send money to another user',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot transfer money to other users');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get amount from arguments (now first argument)
      const amount = parseInt(args[0]);
      if (!amount || isNaN(amount) || amount <= 0) {
        const errorEmbed = embeds.error('Invalid Amount', 'Please enter a valid positive amount\nUsage: `.give <amount> <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user mentioned someone (now second argument)
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to send money to\nUsage: `.give <amount> <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user is trying to pay themselves
      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Transaction', 'You cannot send money to yourself');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is a bot
      if (targetUser.bot) {
        const errorEmbed = embeds.error('Invalid User', 'You cannot send money to bots');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if amount meets minimum requirement
      if (amount < 30) {
        const errorEmbed = embeds.error('Amount Too Small', 'Minimum transfer amount is 30 coins');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get sender's balance
      const senderUser = await economy.getUser(message.author.id);
      if (senderUser.pocket < amount) {
        const errorEmbed = embeds.error('Insufficient Funds', `You only have ${economy.formatMoney(senderUser.pocket)} coins in your pocket\nUse \`.take\` to get money from your safe.`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Perform the transfer
      const result = await economy.transferMoney(message.author.id, targetUser.id, amount);
      if (!result) {
        const errorEmbed = embeds.error('Transfer Failed', 'Transaction failed. Please try again.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Success message
      message.channel.send(`💸 You gave **${economy.formatMoney(amount)} coins** to ${targetUser.username}`);

      // Send notification to recipient
      try {
        // await targetUser.send(`💰 You received **${economy.formatMoney(amount)} coins** from ${message.author.username}`).catch(() => {
          // If DM fails, send in channel instead
          // message.channel.send(`${targetUser}, you received **${economy.formatMoney(amount)} coins** from ${message.author.username}`);
        // });
      } catch (error) {
        // Ignore notification errors
        console.log('Could not send payment notification:', error.message);
      }

    } catch (error) {
      console.error('Pay command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing your payment. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



