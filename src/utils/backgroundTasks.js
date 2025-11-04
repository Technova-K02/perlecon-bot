const { cleanupExpiredKidnappings } = require('./combatUtils');

/**
 * Start background tasks for the bot
 */
function startBackgroundTasks() {
  // Clean up expired kidnappings every 5 minutes
  setInterval(async () => {
    try {
      await cleanupExpiredKidnappings();
    } catch (error) {
      console.error('Background task error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('Background tasks started');
}

module.exports = {
  startBackgroundTasks
};