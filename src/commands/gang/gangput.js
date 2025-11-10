const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const gangs = require('../../utils/gangs');

// Helper function to get user's gang
async function getUserGang(userId) {
  const user = await User.findOne({ userId }).populate('gang');
  return user?.gang || null;
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

// Base progression table
function getBaseStats(level) {
  const baseData = {
    1: { name: 'Trailer', maxHP: 250, safeCapacity: 10000, maxGuards: 4, maxMedics: 2, upgradeCost: 0 },
    2: { name: 'Cabin', maxHP: 500, safeCapacity: 20000, maxGuards: 6, maxMedics: 3, upgradeCost: 10000 },
    3: { name: 'Warehouse', maxHP: 900, safeCapacity: 35000, maxGuards: 8, maxMedics: 4, upgradeCost: 20000 },
    4: { name: 'Bunker', maxHP: 1400, safeCapacity: 55000, maxGuards: 10, maxMedics: 5, upgradeCost: 35000 },
    5: { name: 'Compound', maxHP: 2000, safeCapacity: 80000, maxGuards: 12, maxMedics: 6, upgradeCost: 55000 },
    6: { name: 'Fortress', maxHP: 2800, safeCapacity: 110000, maxGuards: 14, maxMedics: 7, upgradeCost: 80000 },
    7: { name: 'Citadel', maxHP: 3800, safeCapacity: 150000, maxGuards: 16, maxMedics: 8, upgradeCost: 110000 },
    8: { name: 'Kingdom', maxHP: 5000, safeCapacity: 200000, maxGuards: 18, maxMedics: 9, upgradeCost: 150000 }
  };

  return baseData[level] || baseData[1];
}

module.exports = {
  name: 'putgang',
  description: 'Deposit money to Gang Safe',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot transfer money to the Gang Safe');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await getUserGang(message.author.id);
      
      if (!gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      let amount = parseInt(args[0]);
      if (!amount || isNaN(amount) || amount <= 0) {
        const errorEmbed = embeds.error('Invalid Amount', 'Please enter a valid positive amount\nUsage: `.putgang <amount>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (amount < 30) {
        const errorEmbed = embeds.error('Amount Too Small', 'Minimum deposit amount is 30 coins');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const user = await economy.getUser(message.author.id);
      if (user.pocket < amount) {
        const errorEmbed = embeds.error('Insufficient Funds', `You only have ${economy.formatMoney(user.pocket)} coins in your pocket`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check Safelimit based on base level
      const baseLevel = gang.base?.level || 1;
      const vaultLimit = getBaseStats(baseLevel).safeCapacity;
      if (gang.vault + amount > vaultLimit) {
        const maxDeposit = vaultLimit - gang.vault;
        if (maxDeposit <= 0) {
          const errorEmbed = embeds.error(
            'SafeFull', 
            `Gang Safe is at maximum capacity (${economy.formatMoney(vaultLimit)} coins)\n\n` +
            `Upgrade your base level to increase Safecapacity!`
          );
          return message.channel.send({ embeds: [errorEmbed] });
        }
        amount = maxDeposit;
      }

      // Transfer money from user to Gang Safe
      user.pocket -= amount;
      gang.vault += amount;
      
      await user.save();
      await gang.save();

      const embed = embeds.success(
        'Gang Deposit',
        `You deposited **${economy.formatMoney(amount)} coins** to **${gang.name}**'s safe\n\n` +
        `**Gang Safe:** ${economy.formatMoney(gang.vault)} coins\n` +
        `**Your Pocket:** ${economy.formatMoney(user.pocket)} coins`
      );
      
      message.channel.send({ embeds: [embed] });
    
    } catch (error) {
      console.error('Gang put error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while depositing to Gang Safe.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





