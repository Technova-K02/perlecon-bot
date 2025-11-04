const { Reminder } = require('../models');
const { validationUtils, dateUtils } = require('../utils');
const planningConfig = require('../config/planningConfig');

/**
 * Reminder Service - Handles all reminder-related operations
 * Provides reminder management, scheduling, and delivery coordination
 */
class ReminderService {
  constructor() {
    this.name = 'ReminderService';
  }

  /**
   * Create a new reminder
   * @param {Object} reminderData - Reminder creation data
   * @param {string} userId - User ID creating the reminder
   * @param {string} guildId - Guild ID (optional for DM reminders)
   * @returns {Promise<Reminder>} Created reminder
   */
  async createReminder(reminderData, userId, guildId = null) {
    try {
      // Validate input data
      const validation = validationUtils.validateReminderData(reminderData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check user reminder limit
      const userReminderCount = await Reminder.countDocuments({ 
        userId, 
        status: { $in: ['scheduled'] } 
      });
      
      if (userReminderCount >= planningConfig.reminders.maxUserReminders) {
        throw new Error(`Maximum reminder limit reached (${planningConfig.reminders.maxUserReminders})`);
      }

      // Parse and validate scheduled time
      let scheduledTime;
      if (typeof reminderData.scheduledTime === 'string') {
        // Try to parse natural language time
        scheduledTime = dateUtils.parseNaturalTime(reminderData.scheduledTime);
        if (!scheduledTime) {
          scheduledTime = new Date(reminderData.scheduledTime);
        }
      } else {
        scheduledTime = new Date(reminderData.scheduledTime);
      }

      if (isNaN(scheduledTime.getTime())) {
        throw new Error('Invalid scheduled time');
      }

      // Sanitize message
      const sanitizedMessage = validationUtils.sanitizeText(
        reminderData.message, 
        planningConfig.reminders.maxMessageLength
      );

      // Create reminder
      const reminder = new Reminder({
        userId,
        guildId,
        message: sanitizedMessage,
        scheduledTime,
        reminderType: reminderData.reminderType || 'personal',
        recurring: reminderData.recurring || false,
        recurrencePattern: reminderData.recurrencePattern,
        priority: reminderData.priority || 'normal',
        tags: reminderData.tags || [],
        channelId: reminderData.channelId,
        mentionUsers: reminderData.mentionUsers || []
      });

      await reminder.save();
      return reminder;
    } catch (error) {
      throw new Error(`Failed to create reminder: ${error.message}`);
    }
  }

  /**
   * Get reminders for a user
   * @param {string} userId - User ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Reminder[]>} User's reminders
   */
  async getRemindersByUser(userId, status = null) {
    try {
      const query = { userId };
      if (status) {
        query.status = status;
      }

      const reminders = await Reminder.find(query)
        .sort({ scheduledTime: 1 })
        .limit(100); // Reasonable limit

      return reminders;
    } catch (error) {
      throw new Error(`Failed to get user reminders: ${error.message}`);
    }
  }

  /**
   * Update a reminder
   * @param {string} reminderId - Reminder ID
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User making the update
   * @returns {Promise<Reminder>} Updated reminder
   */
  async updateReminder(reminderId, updates, userId) {
    try {
      const reminder = await Reminder.findOne({ reminderId });
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      // Check ownership
      if (reminder.userId !== userId) {
        throw new Error('You can only update your own reminders');
      }

      // Can't update sent or cancelled reminders
      if (['sent', 'cancelled'].includes(reminder.status)) {
        throw new Error('Cannot update completed or cancelled reminders');
      }

      // Validate updates
      if (updates.message || updates.scheduledTime) {
        const validation = validationUtils.validateReminderData({ 
          ...reminder.toObject(), 
          ...updates 
        });
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Sanitize message if provided
      if (updates.message) {
        updates.message = validationUtils.sanitizeText(
          updates.message, 
          planningConfig.reminders.maxMessageLength
        );
      }

      // Parse scheduled time if provided
      if (updates.scheduledTime) {
        let scheduledTime;
        if (typeof updates.scheduledTime === 'string') {
          scheduledTime = dateUtils.parseNaturalTime(updates.scheduledTime);
          if (!scheduledTime) {
            scheduledTime = new Date(updates.scheduledTime);
          }
        } else {
          scheduledTime = new Date(updates.scheduledTime);
        }

        if (isNaN(scheduledTime.getTime())) {
          throw new Error('Invalid scheduled time');
        }
        updates.scheduledTime = scheduledTime;
      }

      // Apply updates
      Object.assign(reminder, updates);
      reminder.updatedAt = new Date();

      await reminder.save();
      return reminder;
    } catch (error) {
      throw new Error(`Failed to update reminder: ${error.message}`);
    }
  }

  /**
   * Delete a reminder
   * @param {string} reminderId - Reminder ID
   * @param {string} userId - User requesting deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteReminder(reminderId, userId) {
    try {
      const reminder = await Reminder.findOne({ reminderId });
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      // Check ownership
      if (reminder.userId !== userId) {
        throw new Error('You can only delete your own reminders');
      }

      // Mark as cancelled instead of deleting for audit trail
      reminder.status = 'cancelled';
      await reminder.save();

      return true;
    } catch (error) {
      throw new Error(`Failed to delete reminder: ${error.message}`);
    }
  }

  /**
   * Process due reminders
   * @returns {Promise<number>} Number of reminders processed
   */
  async processDueReminders() {
    try {
      const dueReminders = await Reminder.findDue(planningConfig.performance.processingBatchSize);
      let processedCount = 0;

      for (const reminder of dueReminders) {
        try {
          // This would integrate with the notification service
          // For now, mark as sent
          await reminder.markAsSent();
          processedCount++;

          // Handle recurring reminders
          if (reminder.recurring && reminder.recurrencePattern) {
            await this.scheduleNextRecurrence(reminder);
          }
        } catch (error) {
          console.error(`Failed to process reminder ${reminder.reminderId}: ${error.message}`);
          await reminder.markAsFailed(error.message);
        }
      }

      return processedCount;
    } catch (error) {
      throw new Error(`Failed to process due reminders: ${error.message}`);
    }
  }

  /**
   * Schedule next recurrence for a recurring reminder
   * @param {Reminder} reminder - Reminder document
   * @returns {Promise<Reminder|null>} Next reminder instance or null
   */
  async scheduleNextRecurrence(reminder) {
    try {
      if (!reminder.recurring || !reminder.recurrencePattern) {
        return null;
      }

      const pattern = reminder.recurrencePattern;
      
      // Check limits
      if (pattern.maxOccurrences && pattern.occurrenceCount >= pattern.maxOccurrences) {
        return null;
      }
      if (pattern.endDate && new Date() >= pattern.endDate) {
        return null;
      }

      // Calculate next occurrence
      const nextTime = this.calculateNextOccurrence(reminder.scheduledTime, pattern);
      if (!nextTime) {
        return null;
      }

      // Create new reminder instance
      const nextReminder = new Reminder({
        userId: reminder.userId,
        guildId: reminder.guildId,
        message: reminder.message,
        scheduledTime: nextTime,
        reminderType: reminder.reminderType,
        recurring: true,
        recurrencePattern: {
          ...pattern,
          occurrenceCount: (pattern.occurrenceCount || 0) + 1
        },
        priority: reminder.priority,
        tags: reminder.tags,
        channelId: reminder.channelId,
        mentionUsers: reminder.mentionUsers
      });

      await nextReminder.save();
      return nextReminder;
    } catch (error) {
      console.error(`Failed to schedule next recurrence: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate next occurrence for recurring reminders
   * @param {Date} currentDate - Current occurrence date
   * @param {Object} pattern - Recurrence pattern
   * @returns {Date|null} Next occurrence date
   */
  calculateNextOccurrence(currentDate, pattern) {
    if (!pattern || !pattern.type) return null;

    const nextTime = new Date(currentDate);
    const interval = pattern.interval || 1;

    switch (pattern.type) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + interval);
        break;

      case 'weekly':
        nextTime.setDate(nextTime.getDate() + (7 * interval));
        break;

      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + interval);
        break;

      case 'custom':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          const currentDay = nextTime.getDay();
          const sortedDays = pattern.daysOfWeek.sort((a, b) => a - b);
          
          let nextDay = sortedDays.find(day => day > currentDay);
          if (!nextDay) {
            nextDay = sortedDays[0];
            nextTime.setDate(nextTime.getDate() + 7);
          }
          
          const daysToAdd = nextDay - currentDay;
          nextTime.setDate(nextTime.getDate() + daysToAdd);
        } else {
          nextTime.setDate(nextTime.getDate() + interval);
        }
        break;

      default:
        return null;
    }

    return nextTime;
  }

  /**
   * Get reminders by tags
   * @param {string} userId - User ID
   * @param {Array} tags - Tags to filter by
   * @returns {Promise<Reminder[]>} Filtered reminders
   */
  async getRemindersByTags(userId, tags) {
    try {
      return await Reminder.findByTags(userId, tags);
    } catch (error) {
      throw new Error(`Failed to get reminders by tags: ${error.message}`);
    }
  }

  /**
   * Get reminder statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reminder statistics
   */
  async getReminderStats(userId) {
    try {
      const stats = await Reminder.aggregate([
        { $match: { userId } },
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
        cancelled: 0,
        failed: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get reminder statistics: ${error.message}`);
    }
  }

  /**
   * Cleanup old reminders
   * @returns {Promise<number>} Number of reminders cleaned up
   */
  async cleanupOldReminders() {
    try {
      const result = await Reminder.cleanup(planningConfig.reminders.cleanupAfterDays);
      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(`Failed to cleanup old reminders: ${error.message}`);
    }
  }
}

module.exports = ReminderService;
