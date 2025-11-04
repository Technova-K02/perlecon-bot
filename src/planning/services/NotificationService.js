const { Notification } = require('../models');
const planningConfig = require('../config/planningConfig');

/**
 * Notification Service - Handles all notification delivery and management
 * Provides smart notification delivery, batching, and user preference handling
 */
class NotificationService {
  constructor() {
    this.name = 'NotificationService';
    this.client = null; // Will be set during initialization
    this.userPreferences = new Map(); // Cache for user preferences
  }

  /**
   * Initialize the notification service
   * @param {Client} discordClient - Discord client instance
   */
  async initialize(discordClient) {
    this.client = discordClient;
    console.log('🔔 NotificationService initialized');
  }

  /**
   * Create and schedule a notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Notification>} Created notification
   */
  async createNotification(notificationData) {
    try {
      // Validate required fields
      if (!notificationData.userId || !notificationData.title || !notificationData.message) {
        throw new Error('Missing required notification fields');
      }

      // Create notification
      const notification = new Notification({
        userId: notificationData.userId,
        guildId: notificationData.guildId,
        type: notificationData.type || 'custom',
        subType: notificationData.subType,
        title: notificationData.title.substring(0, planningConfig.notifications.maxTitleLength),
        message: notificationData.message.substring(0, planningConfig.notifications.maxMessageLength),
        scheduledTime: notificationData.scheduledTime || new Date(),
        deliveryMethod: notificationData.deliveryMethod || 'dm',
        channelId: notificationData.channelId,
        priority: notificationData.priority || 'normal',
        relatedId: notificationData.relatedId,
        relatedType: notificationData.relatedType,
        embed: notificationData.embed,
        actions: notificationData.actions,
        userPreferences: notificationData.userPreferences || {},
        metadata: notificationData.metadata || {}
      });

      await notification.save();
      return notification;
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Process due notifications for delivery
   * @returns {Promise<number>} Number of notifications processed
   */
  async processDueNotifications() {
    try {
      const dueNotifications = await Notification.findDue(planningConfig.performance.processingBatchSize);
      let processedCount = 0;

      for (const notification of dueNotifications) {
        try {
          const success = await this.sendNotification(notification);
          if (success) {
            await notification.markAsSent();
            processedCount++;
          } else {
            await notification.markAsFailed('Delivery failed');
          }
        } catch (error) {
          console.error(`Failed to process notification ${notification.notificationId}: ${error.message}`);
          await notification.markAsFailed(error.message);
        }
      }

      return processedCount;
    } catch (error) {
      throw new Error(`Failed to process due notifications: ${error.message}`);
    }
  }

  /**
   * Send notification via Discord
   * @param {Notification} notification - Notification to send
   * @returns {Promise<boolean>} Success status
   */
  async sendNotification(notification) {
    try {
      if (!this.client) {
        throw new Error('Discord client not initialized');
      }

      const user = await this.client.users.fetch(notification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create message content
      const messageOptions = {
        content: `**${notification.title}**\n${notification.message}`
      };

      // Add embed if provided
      if (notification.embed) {
        messageOptions.embeds = [notification.createEmbed()];
      }

      // Send based on delivery method
      switch (notification.deliveryMethod) {
        case 'dm':
          await user.send(messageOptions);
          break;

        case 'channel':
          if (notification.channelId) {
            const channel = await this.client.channels.fetch(notification.channelId);
            if (channel) {
              await channel.send(messageOptions);
            } else {
              throw new Error('Channel not found');
            }
          } else {
            throw new Error('Channel ID required for channel delivery');
          }
          break;

        case 'both':
          // Send to both DM and channel
          await user.send(messageOptions);
          if (notification.channelId) {
            const channel = await this.client.channels.fetch(notification.channelId);
            if (channel) {
              await channel.send(messageOptions);
            }
          }
          break;

        default:
          throw new Error('Invalid delivery method');
      }

      return true;
    } catch (error) {
      console.error(`Failed to send notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Batch similar notifications for a user
   * @param {string} userId - User ID
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Promise<string>} Batch ID
   */
  async batchNotifications(userId, timeWindow = 300000) {
    try {
      const notifications = await Notification.findForBatching(userId, timeWindow);
      
      if (notifications.length < 2) {
        return null; // Not enough notifications to batch
      }

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update notifications with batch ID
      for (const notification of notifications) {
        await notification.addToBatch(batchId);
      }

      // Create batched notification
      const batchedContent = notifications.map(n => `• ${n.title}: ${n.message}`).join('\n');
      
      const batchNotification = await this.createNotification({
        userId,
        type: 'system',
        subType: 'batched',
        title: `📦 Batched Notifications (${notifications.length})`,
        message: batchedContent,
        scheduledTime: new Date(),
        priority: 'normal'
      });

      return batchId;
    } catch (error) {
      throw new Error(`Failed to batch notifications: ${error.message}`);
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelNotification(notificationId) {
    try {
      const notification = await Notification.findOne({ notificationId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.status !== 'scheduled') {
        throw new Error('Can only cancel scheduled notifications');
      }

      await notification.cancel();
      return true;
    } catch (error) {
      throw new Error(`Failed to cancel notification: ${error.message}`);
    }
  }

  /**
   * Retry failed notification delivery
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  async retryNotification(notificationId) {
    try {
      const notification = await Notification.findOne({ notificationId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.deliveryAttempts >= planningConfig.notifications.maxDeliveryAttempts) {
        throw new Error('Maximum retry attempts reached');
      }

      // Reset status and try again
      notification.status = 'scheduled';
      notification.scheduledTime = new Date();
      await notification.save();

      return await this.sendNotification(notification);
    } catch (error) {
      throw new Error(`Failed to retry notification: ${error.message}`);
    }
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    try {
      // Check cache first
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId);
      }

      // For now, return default preferences
      // In a full implementation, this would query a UserPreferences model
      const defaultPrefs = planningConfig.defaultUserPreferences.notifications;
      
      this.userPreferences.set(userId, defaultPrefs);
      return defaultPrefs;
    } catch (error) {
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      // Validate preferences
      const validKeys = ['enabled', 'respectDND', 'batchSimilar', 'preferredDeliveryMethod', 'quietHours'];
      const filteredPrefs = {};
      
      for (const key of validKeys) {
        if (preferences.hasOwnProperty(key)) {
          filteredPrefs[key] = preferences[key];
        }
      }

      // Update cache
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedPrefs = { ...currentPrefs, ...filteredPrefs };
      
      this.userPreferences.set(userId, updatedPrefs);
      
      // In a full implementation, this would save to a UserPreferences model
      return updatedPrefs;
    } catch (error) {
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  /**
   * Create event notification
   * @param {Object} eventData - Event data
   * @param {string} userId - User ID
   * @param {string} subType - Notification subtype
   * @param {Date} scheduledTime - When to send
   * @returns {Promise<Notification>} Created notification
   */
  async createEventNotification(eventData, userId, subType, scheduledTime) {
    return await Notification.createEventNotification(eventData, userId, subType, scheduledTime);
  }

  /**
   * Create tournament notification
   * @param {Object} tournamentData - Tournament data
   * @param {string} userId - User ID
   * @param {string} subType - Notification subtype
   * @param {Date} scheduledTime - When to send
   * @returns {Promise<Notification>} Created notification
   */
  async createTournamentNotification(tournamentData, userId, subType, scheduledTime) {
    return await Notification.createTournamentNotification(tournamentData, userId, subType, scheduledTime);
  }

  /**
   * Create challenge notification
   * @param {Object} challengeData - Challenge data
   * @param {string} userId - User ID
   * @param {string} subType - Notification subtype
   * @param {Date} scheduledTime - When to send
   * @returns {Promise<Notification>} Created notification
   */
  async createChallengeNotification(challengeData, userId, subType, scheduledTime) {
    return await Notification.createChallengeNotification(challengeData, userId, subType, scheduledTime);
  }

  /**
   * Cleanup old notifications
   * @returns {Promise<number>} Number of notifications cleaned up
   */
  async cleanup() {
    try {
      const result = await Notification.cleanup(planningConfig.notifications.cleanupAfterDays);
      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(`Failed to cleanup notifications: ${error.message}`);
    }
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Notification statistics
   */
  async getStats(userId = null) {
    try {
      const matchQuery = userId ? { userId } : {};
      
      const stats = await Notification.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: 0,
        scheduled: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        batched: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get notification statistics: ${error.message}`);
    }
  }
}

module.exports = NotificationService;
