const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const config = require('../../config/config');

const DAILY_AMOUNT = config.economy.dailyAmount; // 1000 coins

// Get next 4pm EST reset time
function getNextDailyReset(lastClaimTime) {
  const now = new Date();
  const estOffset = -5 * 60; // EST is UTC-5

  // Convert current time to EST
  const estNow = new Date(now.getTime() + (estOffset * 60 * 1000));

  // Get today's 4pm EST
  const todayReset = new Date(estNow);
  todayReset.setHours(16, 0, 0, 0); // 4pm EST

  // If we haven't hit 4pm EST today, use today's reset
  // Otherwise use tomorrow's reset
  if (estNow < todayReset) {
    return todayReset.getTime() - (estOffset * 60 * 1000); // Convert back to UTC
  } else {
    const tomorrowReset = new Date(todayReset);
    tomorrowReset.setDate(tomorrowReset.getDate() + 1);
    return tomorrowReset.getTime() - (estOffset * 60 * 1000); // Convert back to UTC
  }
}

module.exports = {
  name: 'daily',
  description: 'Claim your daily reward (resets at 4pm EST)',
  async execute(message) {
    try {
      const userId = message.author.id;
      const user = await economy.getUser(userId);

      const now = Date.now();
      const lastDaily = user.cooldowns?.get('daily') || 0;
      const nextReset = getNextDailyReset(lastDaily);

      // Check if user is still on cooldown (hasn't reached next 4pm EST)
      if (now < nextReset && lastDaily > 0) {
        const remaining = nextReset - now;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        const errorEmbed = embeds.error('⏰ Daily Reward Not Ready', `You can claim your daily reward in **${hours}h ${minutes}m ${seconds}s**\n\nCome back at 4pm EST for your ${economy.formatMoney(DAILY_AMOUNT)} coins`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate streak bonus (optional feature)
      let streakBonus = 0;
      let currentStreak = user.dailyStreak || 0;

      // Check if user claimed yesterday (within last 48 hours)
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const twoDaysAgo = now - (48 * 60 * 60 * 1000);

      if (lastDaily >= twoDaysAgo && lastDaily < oneDayAgo) {
        currentStreak += 1;
      } else if (lastDaily < twoDaysAgo) {
        currentStreak = 1; // Reset streak if more than 2 days
      } else {
        currentStreak = 1; // First time or reset
      }

      // Calculate streak bonus (100 coins per day of streak)
      if (currentStreak > 1) {
        streakBonus = (currentStreak - 1) * 100;
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
        rewardMessage += `\n**Streak Bonus:** +${economy.formatMoney(streakBonus)} coins (${currentStreak} day streak)`;
      }

      // rewardMessage += `\n**Total Earned:** ${economy.formatMoney(totalReward)} coins`;

      message.channel.send(`🎁 **Daily Reward Claimed**\n${rewardMessage}`);

    } catch (error) {
      console.error('Daily command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while claiming your daily reward. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



