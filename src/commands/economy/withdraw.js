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
  name: 'take',
  description: 'Take money from your safe',
  async execute(message, args) {
    // Check if user is kidnapped
    if (await isUserKidnapped(message.author.id)) {
      const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot access your safe');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const user = await economy.getUser(message.author.id);

    if (!args[0]) {
      const errorEmbed = embeds.error('Invalid Amount', 'Please specify an amount to take');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    let amount;
    if (args[0].toLowerCase() === 'all') {
      amount = user.bank;
    } else {
      amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) {
        const errorEmbed = embeds.error('Invalid Amount', 'Please enter a valid positive number');
        return message.channel.send({ embeds: [errorEmbed] });
      }
      if (amount < 30) {
        const errorEmbed = embeds.error('Amount Too Small', 'Minimum withdrawal amount is 30 coins');
        return message.channel.send({ embeds: [errorEmbed] });
      }
    }

    if (amount === 0) {
      const errorEmbed = embeds.error('No Funds', 'You have no money to take');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const updatedUser = await economy.withdrawMoney(message.author.id, amount);
    if (!updatedUser) {
      const errorEmbed = embeds.error('Transaction Failed', 'Insufficient funds or transaction failed. Please try again.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    message.channel.send(`You took **${economy.formatMoney(amount)}** coins from your safe.`);
  }
};



