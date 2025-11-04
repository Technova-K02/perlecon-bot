const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 100,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 1000,
    trim: true
  },
  creatorId: { 
    type: String, 
    required: true,
    index: true
  },
  guildId: { 
    type: String, 
    required: true,
    index: true
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
  duration: { 
    type: Number, 
    default: 60,
    min: 15,
    max: 1440 // 24 hours max
  },
  maxParticipants: { 
    type: Number,
    min: 1,
    max: 1000
  },
  participants: [{
    type: String,
    validate: {
      validator: function(participants) {
        return !this.maxParticipants || participants.length <= this.maxParticipants;
      },
      message: 'Participants exceed maximum limit'
    }
  }],
  rsvpStatus: {
    type: Map,
    of: {
      type: String,
      enum: ['yes', 'no', 'maybe'],
      default: 'yes'
    }
  },
  eventType: { 
    type: String, 
    enum: ['single', 'recurring'],
    default: 'single'
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
    }
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  rewards: {
    type: {
      type: String,
      enum: ['economy', 'xp', 'role', 'custom']
    },
    amount: Number,
    roleId: String,
    customReward: String
  },
  notificationsSent: {
    reminder24h: { type: Boolean, default: false },
    reminder1h: { type: Boolean, default: false },
    reminder15m: { type: Boolean, default: false },
    started: { type: Boolean, default: false }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
eventSchema.index({ guildId: 1, scheduledTime: 1 });
eventSchema.index({ creatorId: 1, status: 1 });
eventSchema.index({ status: 1, scheduledTime: 1 });

// Virtual for participant count
eventSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxParticipants) return null;
  return this.maxParticipants - this.participants.length;
});

// Virtual for is full
eventSchema.virtual('isFull').get(function() {
  if (!this.maxParticipants) return false;
  return this.participants.length >= this.maxParticipants;
});

// Method to add participant
eventSchema.methods.addParticipant = function(userId, rsvpStatus = 'yes') {
  if (this.isFull) {
    throw new Error('Event is full');
  }
  
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
  }
  
  this.rsvpStatus.set(userId, rsvpStatus);
  return this.save();
};

// Method to remove participant
eventSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(id => id !== userId);
  this.rsvpStatus.delete(userId);
  return this.save();
};

// Method to update RSVP status
eventSchema.methods.updateRSVP = function(userId, status) {
  if (!['yes', 'no', 'maybe'].includes(status)) {
    throw new Error('Invalid RSVP status');
  }
  
  if (status === 'yes' && !this.participants.includes(userId)) {
    return this.addParticipant(userId, status);
  } else if (status === 'no' && this.participants.includes(userId)) {
    return this.removeParticipant(userId);
  } else {
    this.rsvpStatus.set(userId, status);
    return this.save();
  }
};

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(guildId, limit = 10) {
  return this.find({
    guildId,
    status: 'scheduled',
    scheduledTime: { $gt: new Date() }
  })
  .sort({ scheduledTime: 1 })
  .limit(limit);
};

// Static method to find events by date range
eventSchema.statics.findByDateRange = function(guildId, startDate, endDate) {
  return this.find({
    guildId,
    scheduledTime: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ scheduledTime: 1 });
};

module.exports = mongoose.model('Event', eventSchema);
