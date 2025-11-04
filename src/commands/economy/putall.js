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
  name: 'putall',
  description: 'Put all money to your safe',
  async execute(message, args) {
    // Check if user is kidnapped
    if (await isUserKidnapped(message.author.id)) {
      const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot access your safe');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const user = await economy.getUser(message.author.id);

    if (user.pocket === 0) {
      const errorEmbed = embeds.error('No Funds', 'You have no money to put');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const amount = user.pocket;
    const updatedUser = await economy.depositMoney(message.author.id, amount);
    if (!updatedUser) {
      const errorEmbed = embeds.error('Transaction Failed', 'Transaction failed. Please try again.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    message.channel.send(`You put all **${economy.formatMoney(amount)}** coins to your safe.`);
  }
};



