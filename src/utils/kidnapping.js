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

module.exports = {
  isUserKidnapped,
  getRemainingKidnapTime,
  formatKidnapTime
};