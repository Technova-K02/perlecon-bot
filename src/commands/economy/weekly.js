const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');

const WEEKLY_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days
const WEEKLY_BASE_AMOUNT = 3000; // Base weekly reward

module.exports = {
  name: 'weekly',
  description: 'Claim your weekly reward',
  async execute(message) {
    try {
      const userId = message.author.id;
      const user = await economy.getUser(userId);

      const now = Date.now();
      const lastWeekly = user.cooldowns?.get('weekly') || 0;
      
      // Check if user is still on cooldown
      if (now < lastWeekly + WEEKLY_COOLDOWN) {
        const remaining = lastWeekly + WEEKLY_COOLDOWN - now;
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const errorEmbed = embeds.error('⏰ Weekly Reward Not Ready', `You can claim your weekly reward in **${days}d ${hours}h ${minutes}m**\n\nCome back next week for your big reward`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate level bonus (user level affects weekly reward)
      const levelBonus = Math.floor(WEEKLY_BASE_AMOUNT * (user.level * 0.1)); // 10% per level
      
      // Calculate daily streak bonus for weekly (if user has been consistent)
      let consistencyBonus = 0;
      const dailyStreak = user.dailyStreak || 0;
      if (dailyStreak >= 7) {
        consistencyBonus = Math.floor(WEEKLY_BASE_AMOUNT * 0.5); // 50% bonus for 7+ day streak
      } else if (dailyStreak >= 3) {
        consistencyBonus = Math.floor(WEEKLY_BASE_AMOUNT * 0.25); // 25% bonus for 3+ day streak
      }

      // Calculate gang bonus (if user is in a gang)
      let gangBonus = 0;
      if (user.gang) {
        gangBonus = Math.floor(WEEKLY_BASE_AMOUNT * 0.2); // 20% bonus for gang members
      }

      const totalReward = WEEKLY_BASE_AMOUNT + levelBonus + consistencyBonus + gangBonus;

      // Give the weekly reward
      const updatedUser = await economy.addMoney(userId, totalReward, 'weekly');

      // Update cooldown
      updatedUser.cooldowns.set('weekly', now);
      await updatedUser.save();

      // Create detailed reward breakdown
      let rewardMessage = `You claimed your weekly reward\n\n`;
      rewardMessage += `💰 **Base Reward:** ${economy.formatMoney(WEEKLY_BASE_AMOUNT)} coins\n`;
      
      if (levelBonus > 0) {
        rewardMessage += `📈 **Level Bonus:** +${economy.formatMoney(levelBonus)} coins (Level ${user.level})\n`;
      }
      
      if (consistencyBonus > 0) {
        const streakText = dailyStreak >= 7 ? '7+ day streak' : '3+ day streak';
        rewardMessage += `🔥 **Consistency Bonus:** +${economy.formatMoney(consistencyBonus)} coins (${streakText})\n`;
      }
      
      if (gangBonus > 0) {
        rewardMessage += `⚔️ **Gang Bonus:** +${economy.formatMoney(gangBonus)} coins (Gang member)\n`;
      }
      
      rewardMessage += `\n**Total Earned:** ${economy.formatMoney(totalReward)} coins`;
      rewardMessage += `\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`;

      // Add tips for maximizing rewards
      let tips = '\n\n💡 **Tips to maximize your weekly reward:**\n';
      if (levelBonus === 0 || user.level < 5) {
        tips += '• Chat more to gain XP and level up for bigger bonuses\n';
      }
      if (consistencyBonus === 0) {
        tips += '• Claim daily rewards consistently for consistency bonuses\n';
      }
      if (gangBonus === 0) {
        tips += '• Join a gang for gang member bonuses\n';
      }
      if (levelBonus > 0 && consistencyBonus > 0 && gangBonus > 0) {
        tips = '\n\n🏆 **You\'re maximizing all bonuses Great job**';
      }

      message.channel.send(`🎊 **Weekly Reward Claimed**\n\n${rewardMessage}${tips}`);

    } catch (error) {
      console.error('Weekly command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while claiming your weekly reward. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



