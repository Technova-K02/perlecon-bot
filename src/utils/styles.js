const User = require('../models/User');
const SHOP_ITEMS = require('./shopItems');

/**
 * Get user's active display emoji for bot commands
 * @param {string} userId - Discord user ID
 * @returns {string|null} - Emoji string or null
 */
async function getUserDisplayEmoji(userId) {
  try {
    const user = await User.findOne({ userId });
    if (!user || !user.activeStyles?.displayEmoji) {
      return null;
    }

    const emojiItem = SHOP_ITEMS[user.activeStyles.displayEmoji];
    if (!emojiItem) {
      return null;
    }

    // Map emoji items to actual emojis
    const emojiMap = {
      'cute-cat': '😺',
      'orange-cat': '🧡',
      'l-cat': '😹',
      'w-cat': '😸',
      'galaxy-cat': '🌌',
      'trippin-cat': '😵‍💫',
      'zoom-cat': '💨',
      'cat-gradient': '🌈'
    };

    return emojiMap[user.activeStyles.displayEmoji] || '🐱';
  } catch (error) {
    console.error('Error getting user display emoji:', error);
    return null;
  }
}

/**
 * Format username for bot displays (no special formatting since styles are Discord roles)
 * @param {string} userId - Discord user ID
 * @param {string} username - User's display name
 * @returns {string} - Username (unchanged since styling is handled by Discord roles)
 */
async function formatUsernameWithStyle(userId, username) {
  // Since name styles are now Discord roles, no special formatting needed in bot messages
  // The styling is handled by Discord itself through role colors
  return username;
}

/**
 * Check if user has an active name color style
 * @param {string} userId - Discord user ID
 * @returns {string|null} - Style ID or null
 */
async function getUserNameColorStyle(userId) {
  try {
    const user = await User.findOne({ userId });
    return user?.activeStyles?.nameColor || null;
  } catch (error) {
    console.error('Error getting user name color style:', error);
    return null;
  }
}

/**
 * Get style information for display
 * @param {string} styleId - Style item ID
 * @returns {object|null} - Style information or null
 */
function getStyleInfo(styleId) {
  return SHOP_ITEMS[styleId] || null;
}

module.exports = {
  getUserDisplayEmoji,
  formatUsernameWithStyle,
  getUserNameColorStyle,
  getStyleInfo
};