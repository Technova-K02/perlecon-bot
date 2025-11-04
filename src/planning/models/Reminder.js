const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  reminderId: {
    type: String,
    required: true,
    unique: true,
    default: () => `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    index: true // Optional for DM reminders
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  scheduledTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Scheduled time must be in the future'
    }
  },
  reminderType: {
    type: String,
    enum: ['personal', 'server', 'event'],
    default: 'personal'
  },
  recurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    interval: {
      type: Number,
      min: 1,
      max: 365
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    endDate: Date,
    maxOccurrences: {
      type: Number,
      min: 1,
      max: 1000
    },
    occurrenceCount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'cancelled', 'failed'],
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
  channelId: String, // For server reminders
  mentionUsers: [String], // Users to mention in server reminders
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String], // For categorizing reminders
  attachments: [{
    type: String,
    url: String,
    filename: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
reminderSchema.index({ userId: 1, status: 1 });
reminderSchema.index({ scheduledTime: 1, status: 1 });
reminderSchema.index({ guildId: 1, status: 1 });
reminderSchema.index({ reminderType: 1, scheduledTime: 1 });

// Virtual for is due
reminderSchema.virtual('isDue').get(function() {
  return new Date() >= this.scheduledTime;
});

// Virtual for time until due
reminderSchema.virtual('timeUntilDue').get(function() {
  const now = new Date();
  if (now >= this.scheduledTime) return 0;
  return this.scheduledTime - now;
});

// Virtual for is overdue
reminderSchema.virtual('isOverdue').get(function() {
  return new Date() > this.scheduledTime && this.status === 'scheduled';
});

// Method to mark as sent
reminderSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.deliveredAt = new Date();
  
  // Handle recurring reminders
  if (this.recurring && this.recurrencePattern) {
    return this.scheduleNextOccurrence();
  }
  
  return this.save();
};

// Method to mark as failed
reminderSchema.methods.markAsFailed = function(reason) {
  this.deliveryAttempts += 1;
  this.lastAttempt = new Date();
  this.failureReason = reason;
  
  // Mark as failed if max attempts reached
  if (this.deliveryAttempts >= 5) {
    this.status = 'failed';
  }
  
  return this.save();
};

// Method to cancel reminder
reminderSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Method to reschedule reminder
reminderSchema.methods.reschedule = function(newTime) {
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

// Method to schedule next occurrence for recurring reminders
reminderSchema.methods.scheduleNextOccurrence = function() {
  if (!this.recurring || !this.recurrencePattern) {
    return this.save();
  }
  
  const pattern = this.recurrencePattern;
  
  // Check if max occurrences reached
  if (pattern.maxOccurrences && pattern.occurrenceCount >= pattern.maxOccurrences) {
    this.status = 'completed';
    return this.save();
  }
  
  // Check if end date reached
  if (pattern.endDate && new Date() >= pattern.endDate) {
    this.status = 'completed';
    return this.save();
  }
  
  // Calculate next occurrence
  let nextTime = new Date(this.scheduledTime);
  
  switch (pattern.type) {
    case 'daily':
      nextTime.setDate(nextTime.getDate() + (pattern.interval || 1));
      break;
      
    case 'weekly':
      nextTime.setDate(nextTime.getDate() + (7 * (pattern.interval || 1)));
      break;
      
    case 'monthly':
      nextTime.setMonth(nextTime.getMonth() + (pattern.interval || 1));
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
        nextTime.setDate(nextTime.getDate() + (pattern.interval || 1));
      }
      break;
  }
  
  // Update reminder for next occurrence
  this.scheduledTime = nextTime;
  this.status = 'scheduled';
  this.deliveryAttempts = 0;
  this.lastAttempt = null;
  this.failureReason = null;
  this.deliveredAt = null;
  pattern.occurrenceCount += 1;
  
  return this.save();
};

// Method to add tags
reminderSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

// Method to remove tags
reminderSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// Static method to find due reminders
reminderSchema.statics.findDue = function(limit = 100) {
  return this.find({
    status: 'scheduled',
    scheduledTime: { $lte: new Date() }
  })
  .sort({ priority: -1, scheduledTime: 1 })
  .limit(limit);
};

// Static method to find user reminders
reminderSchema.statics.findByUser = function(userId, status = null) {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query).sort({ scheduledTime: 1 });
};

// Static method to find guild reminders
reminderSchema.statics.findByGuild = function(guildId, status = null) {
  const query = { guildId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query).sort({ scheduledTime: 1 });
};

// Static method to find reminders by date range
reminderSchema.statics.findByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    scheduledTime: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ scheduledTime: 1 });
};

// Static method to find reminders by tags
reminderSchema.statics.findByTags = function(userId, tags) {
  return this.find({
    userId,
    tags: { $in: tags }
  }).sort({ scheduledTime: 1 });
};

// Static method to cleanup old reminders
reminderSchema.statics.cleanup = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: ['sent', 'failed', 'cancelled'] },
    updatedAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('Reminder', reminderSchema);
