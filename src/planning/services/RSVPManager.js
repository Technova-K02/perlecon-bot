const { Event } = require('../models');
const planningConfig = require('../config/planningConfig');

/**
 * RSVP Manager - Handles event RSVP operations and participant tracking
 */
class RSVPManager {
  constructor() {
    this.name = 'RSVPManager';
  }

  /**
   * Handle RSVP to an event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} status - RSVP status ('yes', 'no', 'maybe')
   * @returns {Promise<Object>} RSVP result
   */
  async rsvpToEvent(eventId, userId, status) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if event allows RSVPs
      if (event.status !== 'scheduled') {
        throw new Error('Cannot RSVP to this event - event is not scheduled');
      }

      // Check if event is in the past
      if (event.scheduledTime <= new Date()) {
        throw new Error('Cannot RSVP to past events');
      }

      const previousStatus = event.rsvpStatus.get(userId);
      const wasParticipant = event.participants.includes(userId);

      // Handle different RSVP statuses
      switch (status) {
        case 'yes':
          return await this.handleYesRSVP(event, userId, previousStatus, wasParticipant);
        case 'no':
          return await this.handleNoRSVP(event, userId, previousStatus, wasParticipant);
        case 'maybe':
          return await this.handleMaybeRSVP(event, userId, previousStatus, wasParticipant);
        default:
          throw new Error('Invalid RSVP status. Use: yes, no, or maybe');
      }
    } catch (error) {
      throw new Error(`RSVP failed: ${error.message}`);
    }
  }

  /**
   * Handle 'yes' RSVP
   * @param {Event} event - Event document
   * @param {string} userId - User ID
   * @param {string} previousStatus - Previous RSVP status
   * @param {boolean} wasParticipant - Was user already a participant
   * @returns {Promise<Object>} RSVP result
   */
  async handleYesRSVP(event, userId, previousStatus, wasParticipant) {
    // Check capacity
    if (event.maxParticipants && !wasParticipant) {
      if (event.participants.length >= event.maxParticipants) {
        // Add to waitlist logic could be implemented here
        throw new Error('Event is full. Cannot accept more participants.');
      }
    }

    // Add to participants if not already there
    if (!wasParticipant) {
      event.participants.push(userId);
    }

    // Update RSVP status
    event.rsvpStatus.set(userId, 'yes');
    await event.save();

    return {
      success: true,
      status: 'yes',
      message: wasParticipant ? 'RSVP updated to Yes' : 'Successfully joined event',
      participantCount: event.participants.length,
      availableSpots: event.maxParticipants ? event.maxParticipants - event.participants.length : null
    };
  }

  /**
   * Handle 'no' RSVP
   * @param {Event} event - Event document
   * @param {string} userId - User ID
   * @param {string} previousStatus - Previous RSVP status
   * @param {boolean} wasParticipant - Was user already a participant
   * @returns {Promise<Object>} RSVP result
   */
  async handleNoRSVP(event, userId, previousStatus, wasParticipant) {
    // Remove from participants if they were there
    if (wasParticipant) {
      event.participants = event.participants.filter(id => id !== userId);
    }

    // Update RSVP status
    event.rsvpStatus.set(userId, 'no');
    await event.save();

    return {
      success: true,
      status: 'no',
      message: wasParticipant ? 'Left event successfully' : 'RSVP updated to No',
      participantCount: event.participants.length,
      availableSpots: event.maxParticipants ? event.maxParticipants - event.participants.length : null
    };
  }

  /**
   * Handle 'maybe' RSVP
   * @param {Event} event - Event document
   * @param {string} userId - User ID
   * @param {string} previousStatus - Previous RSVP status
   * @param {boolean} wasParticipant - Was user already a participant
   * @returns {Promise<Object>} RSVP result
   */
  async handleMaybeRSVP(event, userId, previousStatus, wasParticipant) {
    // Remove from confirmed participants but keep RSVP record
    if (wasParticipant) {
      event.participants = event.participants.filter(id => id !== userId);
    }

    // Update RSVP status
    event.rsvpStatus.set(userId, 'maybe');
    await event.save();

    return {
      success: true,
      status: 'maybe',
      message: 'RSVP updated to Maybe',
      participantCount: event.participants.length,
      availableSpots: event.maxParticipants ? event.maxParticipants - event.participants.length : null
    };
  }

  /**
   * Get RSVP status for a user
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} RSVP status information
   */
  async getRSVPStatus(eventId, userId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      const rsvpStatus = event.rsvpStatus.get(userId) || 'none';
      const isParticipant = event.participants.includes(userId);

      return {
        eventId,
        userId,
        status: rsvpStatus,
        isParticipant,
        canRSVP: event.status === 'scheduled' && event.scheduledTime > new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get RSVP status: ${error.message}`);
    }
  }

  /**
   * Get all RSVPs for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Event RSVP summary
   */
  async getEventRSVPs(eventId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      const rsvpSummary = {
        eventId,
        totalResponses: event.rsvpStatus.size,
        confirmed: event.participants.length,
        declined: 0,
        maybe: 0,
        responses: []
      };

      // Process all RSVP responses
      for (const [userId, status] of event.rsvpStatus) {
        rsvpSummary.responses.push({ userId, status });
        
        switch (status) {
          case 'no':
            rsvpSummary.declined++;
            break;
          case 'maybe':
            rsvpSummary.maybe++;
            break;
        }
      }

      // Add capacity information
      if (event.maxParticipants) {
        rsvpSummary.capacity = event.maxParticipants;
        rsvpSummary.availableSpots = event.maxParticipants - event.participants.length;
        rsvpSummary.isFull = event.participants.length >= event.maxParticipants;
      }

      return rsvpSummary;
    } catch (error) {
      throw new Error(`Failed to get event RSVPs: ${error.message}`);
    }
  }

  /**
   * Bulk RSVP operation for multiple users
   * @param {string} eventId - Event ID
   * @param {Array} rsvps - Array of {userId, status} objects
   * @returns {Promise<Object>} Bulk RSVP results
   */
  async bulkRSVP(eventId, rsvps) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      const results = {
        successful: [],
        failed: [],
        summary: {
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      for (const rsvp of rsvps) {
        try {
          const result = await this.rsvpToEvent(eventId, rsvp.userId, rsvp.status);
          results.successful.push({
            userId: rsvp.userId,
            status: rsvp.status,
            result
          });
          results.summary.successful++;
        } catch (error) {
          results.failed.push({
            userId: rsvp.userId,
            status: rsvp.status,
            error: error.message
          });
          results.summary.failed++;
        }
        results.summary.processed++;
      }

      return results;
    } catch (error) {
      throw new Error(`Bulk RSVP failed: ${error.message}`);
    }
  }

  /**
   * Remove user from event (admin function)
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID to remove
   * @param {string} adminId - Admin performing the action
   * @returns {Promise<Object>} Removal result
   */
  async removeUserFromEvent(eventId, userId, adminId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if admin has permission (event creator or server admin)
      if (event.creatorId !== adminId) {
        // Additional permission checks could be added here
        throw new Error('Insufficient permissions to remove user');
      }

      // Remove user from participants and RSVP
      event.participants = event.participants.filter(id => id !== userId);
      event.rsvpStatus.delete(userId);
      
      await event.save();

      return {
        success: true,
        message: 'User removed from event',
        participantCount: event.participants.length
      };
    } catch (error) {
      throw new Error(`Failed to remove user from event: ${error.message}`);
    }
  }

  /**
   * Get RSVP statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} RSVP statistics
   */
  async getRSVPStats(eventId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      const stats = {
        eventId,
        totalInvited: 0, // Could be tracked separately
        totalResponses: event.rsvpStatus.size,
        confirmed: event.participants.length,
        declined: 0,
        maybe: 0,
        noResponse: 0,
        responseRate: 0,
        capacity: event.maxParticipants,
        utilizationRate: 0
      };

      // Count responses by type
      for (const [userId, status] of event.rsvpStatus) {
        switch (status) {
          case 'no':
            stats.declined++;
            break;
          case 'maybe':
            stats.maybe++;
            break;
        }
      }

      // Calculate rates
      if (stats.totalInvited > 0) {
        stats.responseRate = (stats.totalResponses / stats.totalInvited) * 100;
      }

      if (event.maxParticipants) {
        stats.utilizationRate = (stats.confirmed / event.maxParticipants) * 100;
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get RSVP statistics: ${error.message}`);
    }
  }

  /**
   * Send RSVP reminders to users who haven't responded
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Reminder results
   */
  async sendRSVPReminders(eventId) {
    try {
      const event = await Event.findOne({ eventId });
      if (!event) {
        throw new Error('Event not found');
      }

      // This would integrate with the notification service
      // For now, return placeholder data
      return {
        eventId,
        remindersSent: 0,
        message: 'RSVP reminder functionality will be implemented with notification service'
      };
    } catch (error) {
      throw new Error(`Failed to send RSVP reminders: ${error.message}`);
    }
  }
}

module.exports = RSVPManager;
