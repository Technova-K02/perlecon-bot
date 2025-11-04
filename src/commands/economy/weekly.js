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

      // Calculate weekly streak bonus
      let weeklyStreak = user.weeklyStreak || 0;
      
      // Check if this is a consecutive weekly claim (within 8 days of last claim)
      const lastWeeklyClaim = user.lastWeeklyClaim || 0;
      const daysSinceLastClaim = Math.floor((now - lastWeeklyClaim) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastClaim <= 8 && lastWeeklyClaim > 0) {
        weeklyStreak += 1;
      } else {
        weeklyStreak = 1; // Reset streak
      }
      
      // Calculate streak bonus (100 coins per week of streak)
      const streakBonus = (weeklyStreak - 1) * 100;
      const totalReward = WEEKLY_BASE_AMOUNT + streakBonus;

      // Give the weekly reward
      const updatedUser = await economy.addMoney(userId, totalReward, 'weekly');

      // Update cooldown and streak
      updatedUser.cooldowns.set('weekly', now);
      updatedUser.weeklyStreak = weeklyStreak;
      updatedUser.lastWeeklyClaim = now;
      await updatedUser.save();

      // Create simple reward message
      let rewardMessage = `You earned **${economy.formatMoney(totalReward)} coins**`;
      
      if (streakBonus > 0) {
        rewardMessage += `\n**Weekly Streak Bonus:** +${economy.formatMoney(streakBonus)} coins (${weeklyStreak} week streak)`;
      }

      message.channel.send(`**Weekly Reward Claimed**\n${rewardMessage}`);

    } catch (error) {
      console.error('Weekly command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while claiming your weekly reward. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



