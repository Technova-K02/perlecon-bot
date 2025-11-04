const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const config = require('../../config/config');

const DAILY_COOLDOWN = config.economy.dailyCooldown; // 24 hours
const DAILY_AMOUNT = config.economy.dailyAmount; // 1000 coins

module.exports = {
  name: 'daily',
  description: 'Claim your daily reward',
  async execute(message) {
    try {
      const userId = message.author.id;
      const user = await economy.getUser(userId);

      const now = Date.now();
      const lastDaily = user.cooldowns?.get('daily') || 0;
      
      // Check if user is still on cooldown
      if (now < lastDaily + DAILY_COOLDOWN) {
        const remaining = lastDaily + DAILY_COOLDOWN - now;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        const errorEmbed = embeds.error('⏰ Daily Reward Not Ready', `You can claim your daily reward in **${hours}h ${minutes}m ${seconds}s**\n\nCome back tomorrow for your ${economy.formatMoney(DAILY_AMOUNT)} coins`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate streak bonus (optional feature)
      let streakBonus = 0;
      let currentStreak = user.dailyStreak || 0;
      
      // Check if user claimed yesterday (within 48 hours but after 24 hours)
      const yesterday = now - DAILY_COOLDOWN;
      const twoDaysAgo = now - (DAILY_COOLDOWN * 2);
      
      if (lastDaily >= twoDaysAgo && lastDaily <= yesterday + 3600000) { // 1 hour grace period
        currentStreak += 1;
      } else if (lastDaily < twoDaysAgo) {
        currentStreak = 1; // Reset streak if more than 2 days
      } else {
        currentStreak = 1; // First time or reset
      }

      // Calculate streak bonus (10% per day, max 100% at 10 days)
      if (currentStreak > 1) {
        const bonusPercent = Math.min(currentStreak - 1, 10) * 0.1;
        streakBonus = Math.floor(DAILY_AMOUNT * bonusPercent);
      }

      const totalReward = DAILY_AMOUNT + streakBonus;

      // Give the daily reward
      const updatedUser = await economy.addMoney(userId, totalReward, 'daily');

      // Update cooldown and streak
      updatedUser.cooldowns.set('daily', now);
      updatedUser.dailyStreak = currentStreak;
      await updatedUser.save();

      // Create success message
      let rewardMessage = `You claimed your daily reward of **${economy.formatMoney(DAILY_AMOUNT)} coins**`;
      
      if (streakBonus > 0) {
        rewardMessage += `\n\n🔥 **Streak Bonus:** +${economy.formatMoney(streakBonus)} coins (${currentStreak} day streak)`;
      }
      
      rewardMessage += `\n\n**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`;
      rewardMessage += `\n**Current Streak:** ${currentStreak} day${currentStreak == 1 ? 's' : ''}`;
      
      if (currentStreak < 10) {
        const nextBonusPercent = Math.min(currentStreak, 10) * 10;
        rewardMessage += `\n**Next Streak Bonus:** ${nextBonusPercent}% (+${economy.formatMoney(Math.floor(DAILY_AMOUNT * (nextBonusPercent / 100)))} coins)`;
      } else {
        rewardMessage += `\n🏆 **Maximum streak bonus reached**`;
      }

      message.channel.send(`🎁 **Daily Reward Claimed**\n\n${rewardMessage}`);

    } catch (error) {
      console.error('Daily command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while claiming your daily reward. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



