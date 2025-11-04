const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    default: () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: ['reminder', 'event', 'tournament', 'challenge', 'system', 'custom'],
    required: true
  },
  subType: {
    type: String,
    enum: [
      // Event notifications
      'event_reminder', 'event_starting', 'event_cancelled', 'event_updated',
      // Tournament notifications
      'tournament_registration', 'tournament_starting', 'match_scheduled', 'match_result', 'tournament_complete',
      // Challenge notifications
      'challenge_started', 'challenge_progress', 'challenge_milestone', 'challenge_complete',
      // Reminder notifications
      'personal_reminder', 'recurring_reminder',
      // System notifications
      'system_announcement', 'maintenance', 'update'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  scheduledTime: {
    type: Date,
    required: true,
    index: true
  },
  deliveryMethod: {
    type: String,
    enum: ['dm', 'channel', 'both'],
    default: 'dm'
  },
  channelId: String,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed', 'cancelled', 'batched'],
    default: 'scheduled',
    index: true
  },
  deliveryAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lastAttempt: Date,
  deliveredAt: Date,
  failureReason: String,
  batchId: String, // For batched notifications
  relatedId: String, // ID of related event/tournament/challenge
  relatedType: {
    type: String,
    enum: ['event', 'tournament', 'challenge', 'reminder']
  },
  embed: {
    color: String,
    thumbnail: String,
    image: String,
    fields: [{
      name: String,
      value: String,
      inline: Boolean
    }],
    footer: String,
    timestamp: Boolean
  },
  actions: [{
    type: {
      type: String,
      enum: ['button', 'reaction']
    },
    label: String,
    emoji: String,
    action: String, // Command or action to execute
    style: {
      type: String,
      enum: ['primary', 'secondary', 'success', 'danger']
    }
  }],
  userPreferences: {
    respectDND: {
      type: Boolean,
      default: true
    },
    preferredTime: {
      start: String, // HH:MM format
      end: String    // HH:MM format
    },
    timezone: String,
    batchSimilar: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    source: String,
    campaign: String,
    tags: [String],
    customData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ scheduledTime: 1, status: 1 });
notificationSchema.index({ priority: 1, scheduledTime: 1 });
notificationSchema.index({ type: 1, subType: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ relatedId: 1, relatedType: 1 });

// Virtual for is due
notificationSchema.virtual('isDue').get(function() {
  return new Date() >= this.scheduledTime;
});

// Virtual for is overdue
notificationSchema.virtual('isOverdue').get(function() {
  return new Date() > this.scheduledTime && this.status === 'scheduled';
});

// Virtual for time until delivery
notificationSchema.virtual('timeUntilDelivery').get(function() {
  const now = new Date();
  if (now >= this.scheduledTime) return 0;
  return this.scheduledTime - now;
});

// Method to mark as sent
notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.deliveredAt = new Date();
  return this.save();
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = function(reason) {
  this.deliveryAttempts += 1;
  this.lastAttempt = new Date();
  this.failureReason = reason;
  
  // Mark as permanently failed if max attempts reached
  if (this.deliveryAttempts >= 5) {
    this.status = 'failed';
  }
  
  return this.save();
};

// Method to cancel notification
notificationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Method to reschedule notification
notificationSchema.methods.reschedule = function(newTime) {
  if (newTime <= new Date()) {
    throw new Error('New time must be in the future');
  }
  
  this.scheduledTime = newTime;
  this.status = 'scheduled';
  this.deliveryAttempts = 0;
  this.lastAttempt = null;
  this.failureReason = null;
  
  return this.save();
};

// Method to batch with other notifications
notificationSchema.methods.addToBatch = function(batchId) {
  this.batchId = batchId;
  this.status = 'batched';
  return this.save();
};

// Method to create embed object
notificationSchema.methods.createEmbed = function() {
  if (!this.embed) return null;
  
  const embed = {
    title: this.title,
    description: this.message,
    timestamp: this.embed.timestamp ? new Date() : undefined
  };
  
  if (this.embed.color) embed.color = parseInt(this.embed.color.replace('#', ''), 16);
  if (this.embed.thumbnail) embed.thumbnail = { url: this.embed.thumbnail };
  if (this.embed.image) embed.image = { url: this.embed.image };
  if (this.embed.footer) embed.footer = { text: this.embed.footer };
  if (this.embed.fields && this.embed.fields.length > 0) {
    embed.fields = this.embed.fields;
  }
  
  return embed;
};

// Static method to find due notifications
notificationSchema.statics.findDue = function(limit = 100) {
  return this.find({
    status: 'scheduled',
    scheduledTime: { $lte: new Date() }
  })
  .sort({ priority: -1, scheduledTime: 1 })
  .limit(limit);
};

// Static method to find notifications for batching
notificationSchema.statics.findForBatching = function(userId, timeWindow = 300000) { // 5 minutes
  const now = new Date();
  const windowEnd = new Date(now.getTime() + timeWindow);
  
  return this.find({
    userId,
    status: 'scheduled',
    scheduledTime: {
      $gte: now,
      $lte: windowEnd
    },
    'userPreferences.batchSimilar': true
  }).sort({ scheduledTime: 1 });
};

// Static method to find by user
notificationSchema.statics.findByUser = function(userId, status = null, limit = 50) {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ scheduledTime: -1 })
    .limit(limit);
};

// Static method to find by type
notificationSchema.statics.findByType = function(type, subType = null, status = 'scheduled') {
  const query = { type, status };
  if (subType) {
    query.subType = subType;
  }
  
  return this.find(query).sort({ scheduledTime: 1 });
};

// Static method to find by related item
notificationSchema.statics.findByRelated = function(relatedId, relatedType) {
  return this.find({ relatedId, relatedType }).sort({ scheduledTime: 1 });
};

// Static method to create event notification
notificationSchema.statics.createEventNotification = function(eventData, userId, subType, scheduledTime) {
  return this.create({
    userId,
    guildId: eventData.guildId,
    type: 'event',
    subType,
    title: `Event: ${eventData.title}`,
    message: eventData.description || 'Event notification',
    scheduledTime,
    relatedId: eventData.eventId,
    relatedType: 'event',
    embed: {
      color: '#00ff00',
      timestamp: true,
      fields: [
        {
          name: 'Event Time',
          value: eventData.scheduledTime.toLocaleString(),
          inline: true
        },
        {
          name: 'Duration',
          value: `${eventData.duration} minutes`,
          inline: true
        }
      ]
    }
  });
};

// Static method to create tournament notification
notificationSchema.statics.createTournamentNotification = function(tournamentData, userId, subType, scheduledTime) {
  return this.create({
    userId,
    guildId: tournamentData.guildId,
    type: 'tournament',
    subType,
    title: `Tournament: ${tournamentData.name}`,
    message: tournamentData.description || 'Tournament notification',
    scheduledTime,
    relatedId: tournamentData.tournamentId,
    relatedType: 'tournament',
    embed: {
      color: '#ffd700',
      timestamp: true,
      fields: [
        {
          name: 'Tournament Type',
          value: tournamentData.tournamentType.replace('_', ' '),
          inline: true
        },
        {
          name: 'Entry Fee',
          value: `$${tournamentData.entryFee}`,
          inline: true
        },
        {
          name: 'Prize Pool',
          value: `$${tournamentData.prizePool}`,
          inline: true
        }
      ]
    }
  });
};

// Static method to create challenge notification
notificationSchema.statics.createChallengeNotification = function(challengeData, userId, subType, scheduledTime) {
  return this.create({
    userId,
    guildId: challengeData.guildId,
    type: 'challenge',
    subType,
    title: `Challenge: ${challengeData.title}`,
    message: challengeData.description || 'Challenge notification',
    scheduledTime,
    relatedId: challengeData.challengeId,
    relatedType: 'challenge',
    embed: {
      color: '#ff6600',
      timestamp: true,
      fields: [
        {
          name: 'Challenge Type',
          value: challengeData.challengeType,
          inline: true
        },
        {
          name: 'Goal',
          value: `${challengeData.goal.target} ${challengeData.goal.unit}`,
          inline: true
        },
        {
          name: 'End Time',
          value: challengeData.endTime.toLocaleString(),
          inline: true
        }
      ]
    }
  });
};

// Static method to cleanup old notifications
notificationSchema.statics.cleanup = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: ['sent', 'failed', 'cancelled'] },
    updatedAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
