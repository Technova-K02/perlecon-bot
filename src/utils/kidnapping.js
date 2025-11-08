const User = require('../models/User');

/**
 * Check if a user is currently kidnapped
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>} - True if user is kidnapped, false otherwise
 */
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

/**
 * Get remaining kidnap time for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<number>} - Remaining time in milliseconds, 0 if not kidnapped
 */
async function getRemainingKidnapTime(userId) {
  const user = await User.findOne({ userId });
  if (!user || user.status !== 'kidnapped' || !user.kidnappedUntil) {
    return 0;
  }
  
  const remaining = user.kidnappedUntil.getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format remaining kidnap time as human readable string
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} - Formatted time string
 */
function formatKidnapTime(milliseconds) {
  if (milliseconds <= 0) return '0 minutes';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Check if user is kidnapped and return error embed with release timer
 * @param {string} userId - Discord user ID
 * @param {string} action - Action they're trying to perform
 * @returns {Promise<Object|null>} - Error embed object or null if not kidnapped
 */
async function getKidnapErrorEmbed(userId, action) {
  const user = await User.findOne({ userId });
  if (!user) return null;
  
  // Check if user is kidnapped and still within kidnap duration
  if (user.status === 'kidnapped' && user.kidnappedUntil && user.kidnappedUntil > new Date()) {
    const remainingTime = await getRemainingKidnapTime(userId);
    const timeString = formatKidnapTime(remainingTime);
    const releaseTimestamp = Math.floor(user.kidnappedUntil.getTime() / 1000);
    
    const embeds = require('./embeds');
    return embeds.error(
      'Kidnapped', 
      `You are kidnapped and cannot ${action}\n\n` +
      // `**Release Time:** <t:${releaseTimestamp}:F>\n` +
      `**Time Remaining:** ${timeString}`
    );
  }
  
  // If kidnap time has expired, update status
  if (user.status === 'kidnapped' && user.kidnappedUntil && user.kidnappedUntil <= new Date()) {
    user.status = 'base';
    user.kidnappedUntil = null;
    user.kidnappedBy = null;
    await user.save();
    return null;
  }
  
  return user.status === 'kidnapped' ? embeds.error('Kidnapped', `You are kidnapped and cannot ${action}`) : null;
}

module.exports = {
  isUserKidnapped,
  getRemainingKidnapTime,
  formatKidnapTime,
  getKidnapErrorEmbed
};