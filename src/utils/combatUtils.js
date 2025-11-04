const User = require('../models/User');
const Gang = require('../models/Gang');

/**
 * Clean up expired kidnappings and update gang hostage counts
 */
async function cleanupExpiredKidnappings() {
  try {
    // Find all expired kidnappings
    const expiredKidnappings = await User.find({
      status: 'kidnapped',
      kidnappedUntil: { $lte: new Date() }
    });

    if (expiredKidnappings.length > 0) {
      console.log(`Cleaning up ${expiredKidnappings.length} expired kidnappings`);
      
      // Release all expired hostages
      await User.updateMany(
        {
          status: 'kidnapped',
          kidnappedUntil: { $lte: new Date() }
        },
        {
          $set: { status: 'base' },
          $unset: { kidnappedUntil: 1, kidnappedBy: 1 }
        }
      );
    }

    // Update gang hostage counts
    const gangs = await Gang.find({});
    for (const gang of gangs) {
      const activeHostages = await User.countDocuments({
        status: 'kidnapped',
        kidnappedBy: { $in: gang.members },
        kidnappedUntil: { $gt: new Date() }
      });

      if (gang.hostages !== activeHostages) {
        gang.hostages = activeHostages;
        await gang.save();
      }
    }

  } catch (error) {
    console.error('Error cleaning up kidnappings:', error);
  }
}

/**
 * Check if a gang is on raid cooldown
 * @param {Object} gang - Gang object
 * @returns {boolean} - True if on cooldown
 */
function isGangOnRaidCooldown(gang) {
  if (!gang.lastRaidTime) return false;
  
  const raidCooldown = 60 * 1000; // 1 minute
  return Date.now() - gang.lastRaidTime < raidCooldown;
}

/**
 * Get remaining raid cooldown time in seconds
 * @param {Object} gang - Gang object
 * @returns {number} - Remaining cooldown in seconds
 */
function getRaidCooldownRemaining(gang) {
  if (!gang.lastRaidTime) return 0;
  
  const raidCooldown = 60 * 1000; // 1 minute
  const remaining = gang.lastRaidTime.getTime() + raidCooldown - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Calculate combat success rate with modifiers
 * @param {number} baseRate - Base success rate percentage
 * @param {Object} modifiers - Object containing modifiers
 * @returns {number} - Final success rate (5-95%)
 */
function calculateSuccessRate(baseRate, modifiers = {}) {
  let successRate = baseRate;
  
  // Apply positive modifiers
  if (modifiers.weaponLevels) successRate += modifiers.weaponLevels * 5;
  if (modifiers.toolBonus) successRate += modifiers.toolBonus;
  if (modifiers.nonGangBonus) successRate += modifiers.nonGangBonus;
  
  // Apply negative modifiers
  if (modifiers.defenses) successRate -= modifiers.defenses * 2;
  if (modifiers.guards) successRate -= modifiers.guards * 3;
  
  // Ensure success rate is between 5% and 95%
  return Math.max(5, Math.min(95, successRate));
}

/**
 * Generate random kidnap duration (1-3 hours)
 * @returns {Object} - Object with hours and milliseconds
 */
function generateKidnapDuration() {
  const hours = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 hours
  const milliseconds = hours * 60 * 60 * 1000;
  return { hours, milliseconds };
}

module.exports = {
  cleanupExpiredKidnappings,
  isGangOnRaidCooldown,
  getRaidCooldownRemaining,
  calculateSuccessRate,
  generateKidnapDuration
};