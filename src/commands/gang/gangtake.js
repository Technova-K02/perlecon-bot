const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');

// Helper function to get user's gang
async function getUserGang(userId) {
  const user = await User.findOne({ userId }).populate('gang');
  return user?.gang || null;
}

// Helper function to check if user is gang leader or officer
async function canWithdrawFromGang(userId, gang) {
  return gang && (gang.leaderId === userId || gang.officers.includes(userId));
}

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
  name: 'getgang',
  aliases: ['getg'],
  description: 'Withdraw money from Gang Safe (leaders and officers only)',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot withdraw money from the Gang Safe');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await getUserGang(message.author.id);

      if (!gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!await canWithdrawFromGang(message.author.id, gang)) {
        const errorEmbed = embeds.error('Permission Denied', 'Only gang leaders and officers can withdraw from the vault');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const amount = parseInt(args[0]);
      if (!amount || isNaN(amount) || amount <= 0) {
        const errorEmbed = embeds.error('Invalid Amount', 'Please enter a valid positive amount\nUsage: `.gangtake <amount>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (amount < 30) {
        const errorEmbed = embeds.error('Amount Too Small', 'Minimum withdrawal amount is 30 coins');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (gang.vault < amount) {
        const errorEmbed = embeds.error('Insufficient Funds', `Gang Safe only has ${economy.formatMoney(gang.vault)} coins`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Transfer money from Gang Safe to user
      const user = await economy.getUser(message.author.id);
      user.pocket += amount;
      gang.vault -= amount;

      await user.save();
      await gang.save();

      const userRole = gang.leaderId === message.author.id ? 'Leader' : 'Officer';
      const embed = embeds.success(
        'Gang Withdrawal',
        `You withdrew **${economy.formatMoney(amount)} coins** from **${gang.name}**'s vault\n\n` +
        `**Gang Safe:** ${economy.formatMoney(gang.vault)} coins\n` +
        `**Your Pocket:** ${economy.formatMoney(user.pocket)} coins\n\n` +
        `*Withdrawn as ${userRole}*`
      );

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Gang take error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while withdrawing from Gang Safe.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};






