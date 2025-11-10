const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');

const WEEKLY_BASE_AMOUNT = 3000; // Base weekly reward

// Get next Saturday 4pm EST reset time
function getNextWeeklyReset(lastClaimTime) {
  const now = new Date();
  const estOffset = -5 * 60; // EST is UTC-5
  
  // Convert current time to EST
  const estNow = new Date(now.getTime() + (estOffset * 60 * 1000));
  
  // Get current day of week (0 = Sunday, 6 = Saturday)
  const currentDay = estNow.getDay();
  
  // Calculate days until next Saturday
  let daysUntilSaturday = (6 - currentDay + 7) % 7;
  
  // Get this Saturday's 4pm EST
  const nextSaturday = new Date(estNow);
  nextSaturday.setDate(estNow.getDate() + daysUntilSaturday);
  nextSaturday.setHours(16, 0, 0, 0); // 4pm EST
  
  // If today is Saturday and we haven't hit 4pm EST yet, use today
  // Otherwise use next Saturday
  if (currentDay === 6 && estNow < nextSaturday) {
    return nextSaturday.getTime() - (estOffset * 60 * 1000); // Convert back to UTC
  } else if (daysUntilSaturday === 0) {
    // Already past 4pm on Saturday, go to next Saturday
    nextSaturday.setDate(nextSaturday.getDate() + 7);
  }
  
  return nextSaturday.getTime() - (estOffset * 60 * 1000); // Convert back to UTC
}

module.exports = {
  name: 'weekly',
  description: 'Claim your weekly reward (resets Saturday 4pm EST)',
  async execute(message) {
    try {
      const userId = message.author.id;
      const user = await economy.getUser(userId);

      const now = Date.now();
      const lastWeekly = user.cooldowns?.get('weekly') || 0;
      const nextReset = getNextWeeklyReset(lastWeekly);
      
      // Check if user is still on cooldown (hasn't reached next Saturday 4pm EST)
      if (now < nextReset && lastWeekly > 0) {
        const remaining = nextReset - now;
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const errorEmbed = embeds.error('⏰ Weekly Reward Not Ready', `You can claim your weekly reward in **${days}d ${hours}h ${minutes}m**\n\nCome back Saturday at 4pm EST for your big reward`);
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

      message.channel.send(`🎁 **Weekly Reward Claimed**\n${rewardMessage}`);

    } catch (error) {
      console.error('Weekly command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while claiming your weekly reward. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



