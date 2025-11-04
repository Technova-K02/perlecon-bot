const { Event } = require('../models');
const { validationUtils } = require('../utils');
const planningConfig = require('../config/planningConfig');

/**
 * Event Service - Handles all event-related operations
 * Provides CRUD operations, RSVP management, and event lifecycle management
 */
class EventService {
  constructor() {
    this.name = 'EventService';
  }

  /**
   * Create a new event
   * @param {Object} eventData - Event creation data
   * @param {string} creatorId - Discord ID of event creator
   * @param {string} guildId - Discord server ID
   * @returns {Promise<Event>} Created event
   */
  async createEvent(eventData, creatorId, guildId) {
    try {
      // Validate input data
      const validation = validationUtils.validateEventData(eventData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate creator and guild IDs
      if (!validationUtils.isValidDiscordId(creatorId)) {
        throw new Error('Invalid creator ID');
      }
      if (!validationUtils.isValidDiscordId(guildId)) {
        throw new Error('Invalid guild ID');
      }

      // Sanitize text inputs
      const sanitizedData = {
        ...eventData,
        title: validationUtils.sanitizeText(eventData.title, planningConfig.events.maxTitleLength),
        description: eventData.description ? 
          validationUtils.sanitizeText(eventData.description, planningConfig.events.maxDescriptionLength) : 
          undefined
      };

      // Create event with validated data
      const event = new Event({
        ...sanitizedData,
        creatorId,
        guildId,
        participants: [],
        rsvpStatus: new Map(),
        status: 'scheduled'
      });

      await event.save();
      return event;
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Update an existing event
   * @param {string} eventId - Event ID to update
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User making the update
   * @returns {Promise<Event>} Updated event
   */
  async updateEvent(eventId, updates, userId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions - only creator can update
      if (event.creatorId !== userId) {
        throw new Error('Only the event creator can update this event');
      }

      // Validate updates
      if (updates.title || updates.description || updates.scheduledTime || updates.duration || updates.maxParticipants) {
        const validation = validationUtils.validateEventData({ ...event.toObject(), ...updates });
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Sanitize text updates
      if (updates.title) {
        updates.title = validationUtils.sanitizeText(updates.title, planningConfig.events.maxTitleLength);
      }
      if (updates.description) {
        updates.description = validationUtils.sanitizeText(updates.description, planningConfig.events.maxDescriptionLength);
      }

      // Apply updates
      Object.assign(event, updates);
      event.updatedAt = new Date();

      await event.save();
      return event;
    } catch (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete an event
   * @param {string} eventId - Event ID to delete
   * @param {string} userId - User requesting deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteEvent(eventId, userId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions - only creator can delete
      if (event.creatorId !== userId) {
        throw new Error('Only the event creator can delete this event');
      }

      // Mark as cancelled instead of deleting for audit trail
      event.status = 'cancelled';
      await event.save();

      return true;
    } catch (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Handle RSVP to an event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} status - RSVP status ('yes', 'no', 'maybe')
   * @returns {Promise<Event>} Updated event
   */
  async rsvpToEvent(eventId, userId, status) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'scheduled') {
        throw new Error('Cannot RSVP to this event');
      }

      if (!['yes', 'no', 'maybe'].includes(status)) {
        throw new Error('Invalid RSVP status');
      }

      // Update RSVP using model method
      await event.updateRSVP(userId, status);
      
      return event;
    } catch (error) {
      throw new Error(`Failed to RSVP to event: ${error.message}`);
    }
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Event>} Event data
   */
  async getEvent(eventId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }
      return event;
    } catch (error) {
      throw new Error(`Failed to get event: ${error.message}`);
    }
  }

  /**
   * Get events for a guild with optional filters
   * @param {string} guildId - Guild ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Event[]>} Array of events
   */
  async getGuildEvents(guildId, filters = {}) {
    try {
      const query = { guildId };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.creatorId) {
        query.creatorId = filters.creatorId;
      }
      if (filters.startDate && filters.endDate) {
        query.scheduledTime = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      } else if (filters.upcoming) {
        query.scheduledTime = { $gt: new Date() };
        query.status = 'scheduled';
      }

      const limit = Math.min(filters.limit || 50, planningConfig.schedule.maxEventsPerView);
      const skip = filters.skip || 0;

      const events = await Event.find(query)
        .sort({ scheduledTime: 1 })
        .limit(limit)
        .skip(skip);

      return events;
    } catch (error) {
      throw new Error(`Failed to get guild events: ${error.message}`);
    }
  }

  /**
   * Get events for a user (as participant or creator)
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID (optional)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Event[]>} Array of events
   */
  async getUserEvents(userId, guildId = null, filters = {}) {
    try {
      const query = {
        $or: [
          { creatorId: userId },
          { participants: userId }
        ]
      };

      if (guildId) {
        query.guildId = guildId;
      }

      // Apply additional filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.upcoming) {
        query.scheduledTime = { $gt: new Date() };
        query.status = 'scheduled';
      }

      const limit = Math.min(filters.limit || 50, planningConfig.schedule.maxEventsPerView);

      const events = await Event.find(query)
        .sort({ scheduledTime: 1 })
        .limit(limit);

      return events;
    } catch (error) {
      throw new Error(`Failed to get user events: ${error.message}`);
    }
  }

  /**
   * Process recurring events and generate new instances
   * @returns {Promise<number>} Number of events generated
   */
  async processRecurringEvents() {
    try {
      // Find completed recurring events that need new instances
      const recurringEvents = await Event.find({
        eventType: 'recurring',
        status: 'completed',
        recurrencePattern: { $exists: true }
      });

      let generatedCount = 0;

      for (const event of recurringEvents) {
        try {
          // Check if we should generate next occurrence
          const pattern = event.recurrencePattern;
          if (!pattern) continue;

          // Check limits
          if (pattern.maxOccurrences && pattern.occurrenceCount >= pattern.maxOccurrences) {
            continue;
          }
          if (pattern.endDate && new Date() >= pattern.endDate) {
            continue;
          }

          // Calculate next occurrence time
          const nextTime = this.calculateNextOccurrence(event.scheduledTime, pattern);
          if (!nextTime) continue;

          // Create new event instance
          const newEvent = new Event({
            title: event.title,
            description: event.description,
            creatorId: event.creatorId,
            guildId: event.guildId,
            scheduledTime: nextTime,
            duration: event.duration,
            maxParticipants: event.maxParticipants,
            eventType: 'recurring',
            recurrencePattern: {
              ...pattern,
              occurrenceCount: (pattern.occurrenceCount || 0) + 1
            },
            rewards: event.rewards,
            participants: [],
            rsvpStatus: new Map(),
            status: 'scheduled'
          });

          await newEvent.save();
          generatedCount++;

          // Update original event's occurrence count
          event.recurrencePattern.occurrenceCount = (pattern.occurrenceCount || 0) + 1;
          await event.save();

        } catch (error) {
          console.error(`Failed to generate recurring event instance: ${error.message}`);
        }
      }

      return generatedCount;
    } catch (error) {
      throw new Error(`Failed to process recurring events: ${error.message}`);
    }
  }

  /**
   * Calculate next occurrence for recurring events
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
          // Find next occurrence based on days of week
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
   * Get event statistics for a guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Event statistics
   */
  async getEventStats(guildId) {
    try {
      const stats = await Event.aggregate([
        { $match: { guildId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalParticipants: { $sum: { $size: '$participants' } }
          }
        }
      ]);

      const result = {
        total: 0,
        scheduled: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        totalParticipants: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.totalParticipants += stat.totalParticipants;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get event statistics: ${error.message}`);
    }
  }
}

module.exports = EventService;
