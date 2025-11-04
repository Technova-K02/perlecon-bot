/**
 * Planning System Main Module
 * Provides centralized access to all planning system components
 */

const models = require('./models');
const services = require('./services');
const utils = require('./utils');

/**
 * Planning System Controller
 * Central coordination point for all planning operations
 */
class PlanningSystem {
  constructor() {
    this.models = models;
    this.services = {
      event: new services.EventService(),
      tournament: new services.TournamentService(),
      challenge: new services.ChallengeService(),
      reminder: new services.ReminderService(),
      notification: new services.NotificationService(),
      schedule: new services.ScheduleService()
    };
    this.utils = utils;
    this.initialized = false;
  }

  /**
   * Initialize the planning system
   * @param {Client} discordClient - Discord client instance
   * @returns {Promise<void>}
   */
  async initialize(discordClient = null) {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🗓️ Initializing Planning System...');
      
      // Initialize services
      for (const [serviceName, service] of Object.entries(this.services)) {
        if (service.initialize && typeof service.initialize === 'function') {
          if (serviceName === 'notification' && discordClient) {
            await service.initialize(discordClient);
          } else {
            await service.initialize();
          }
        }
        console.log(`✅ ${serviceName} service initialized`);
      }
      
      this.initialized = true;
      console.log('✅ Planning System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Planning System:', error);
      throw error;
    }
  }

  /**
   * Get service by name
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service instance
   */
  getService(serviceName) {
    if (!this.services[serviceName]) {
      throw new Error(`Service '${serviceName}' not found`);
    }
    return this.services[serviceName];
  }

  /**
   * Get model by name
   * @param {string} modelName - Name of the model
   * @returns {Object} Model class
   */
  getModel(modelName) {
    const modelKey = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    if (!this.models[modelKey]) {
      throw new Error(`Model '${modelKey}' not found`);
    }
    return this.models[modelKey];
  }

  /**
   * Get utility functions by category
   * @param {string} utilCategory - Category of utilities
   * @returns {Object} Utility functions
   */
  getUtils(utilCategory) {
    if (!this.utils[utilCategory]) {
      throw new Error(`Utility category '${utilCategory}' not found`);
    }
    return this.utils[utilCategory];
  }

  /**
   * Start background processing tasks
   * @returns {Promise<void>}
   */
  async startBackgroundTasks() {
    console.log('🔄 Starting planning system background tasks...');
    
    // Start recurring event processing
    this.eventProcessingInterval = setInterval(async () => {
      try {
        const generated = await this.services.event.processRecurringEvents();
        if (generated > 0) {
          console.log(`📅 Generated ${generated} recurring event instances`);
        }
      } catch (error) {
        console.error('❌ Error processing recurring events:', error);
      }
    }, 60000); // Every minute

    // Start reminder processing
    this.reminderProcessingInterval = setInterval(async () => {
      try {
        const processed = await this.services.reminder.processDueReminders();
        if (processed > 0) {
          console.log(`⏰ Processed ${processed} due reminders`);
        }
      } catch (error) {
        console.error('❌ Error processing reminders:', error);
      }
    }, 30000); // Every 30 seconds

    // Start notification processing
    this.notificationProcessingInterval = setInterval(async () => {
      try {
        const processed = await this.services.notification.processDueNotifications();
        if (processed > 0) {
          console.log(`🔔 Processed ${processed} notifications`);
        }
      } catch (error) {
        console.error('❌ Error processing notifications:', error);
      }
    }, 15000); // Every 15 seconds

    // Start cleanup tasks (every hour)
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.services.reminder.cleanupOldReminders();
        await this.services.notification.cleanup();
        console.log('🧹 Completed scheduled cleanup tasks');
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
      }
    }, 3600000); // Every hour

    console.log('✅ Background tasks started successfully');
  }

  /**
   * Stop background processing tasks
   * @returns {Promise<void>}
   */
  async stopBackgroundTasks() {
    console.log('⏹️ Stopping planning system background tasks...');
    
    // Clear all intervals
    if (this.eventProcessingInterval) {
      clearInterval(this.eventProcessingInterval);
      this.eventProcessingInterval = null;
    }
    
    if (this.reminderProcessingInterval) {
      clearInterval(this.reminderProcessingInterval);
      this.reminderProcessingInterval = null;
    }
    
    if (this.notificationProcessingInterval) {
      clearInterval(this.notificationProcessingInterval);
      this.notificationProcessingInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('✅ Background tasks stopped successfully');
  }

  /**
   * Get system health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      services: Object.keys(this.services).reduce((status, serviceName) => {
        status[serviceName] = {
          name: this.services[serviceName].name,
          status: 'ready' // Will be updated with actual health checks
        };
        return status;
      }, {}),
      models: Object.keys(this.models),
      utils: Object.keys(this.utils)
    };
  }
}

// Create singleton instance
const planningSystem = new PlanningSystem();

module.exports = {
  PlanningSystem,
  planningSystem,
  models,
  services,
  utils
};
