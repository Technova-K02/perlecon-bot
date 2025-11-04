const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  challengeId: {
    type: String,
    required: true,
    unique: true,
    default: () => `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
  challengeType: {
    type: String,
    enum: ['collective', 'competitive', 'milestone'],
    required: true
  },
  goal: {
    type: {
      type: String,
      enum: ['count', 'sum', 'time', 'custom'],
      required: true
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      default: 'points'
    },
    description: String
  },
  startTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Start time cannot be in the future for immediate challenges'
    }
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    contribution: {
      type: Number,
      default: 0,
      min: 0
    },
    lastContribution: Date,
    rank: Number
  }],
  progress: {
    type: Map,
    of: {
      type: Number,
      min: 0
    }
  },
  totalProgress: {
    type: Number,
    default: 0,
    min: 0
  },
  rewards: {
    type: {
      type: String,
      enum: ['economy', 'xp', 'role', 'custom', 'tiered'],
      required: true
    },
    // For single reward type
    amount: Number,
    roleId: String,
    customReward: String,
    // For tiered rewards
    tiers: [{
      rank: {
        type: Number,
        min: 1
      },
      percentage: Number, // Top percentage (e.g., 10 for top 10%)
      reward: {
        type: String,
        enum: ['economy', 'xp', 'role', 'custom']
      },
      amount: Number,
      roleId: String,
      customReward: String
    }],
    // Participation rewards
    participationReward: {
      type: String,
      enum: ['economy', 'xp', 'role', 'custom']
    },
    participationAmount: Number
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  leaderboard: [{
    userId: String,
    contribution: Number,
    rank: Number,
    percentage: Number
  }],
  milestones: [{
    threshold: {
      type: Number,
      required: true
    },
    description: String,
    reached: {
      type: Boolean,
      default: false
    },
    reachedAt: Date,
    reward: {
      type: String,
      enum: ['economy', 'xp', 'announcement']
    },
    rewardAmount: Number
  }],
  settings: {
    autoComplete: {
      type: Boolean,
      default: true
    },
    allowSelfReporting: {
      type: Boolean,
      default: true
    },
    minContribution: {
      type: Number,
      default: 1,
      min: 1
    },
    maxContribution: {
      type: Number,
      default: 1000
    },
    contributionCooldown: {
      type: Number,
      default: 0 // minutes
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
challengeSchema.index({ guildId: 1, status: 1 });
challengeSchema.index({ creatorId: 1, status: 1 });
challengeSchema.index({ endTime: 1, status: 1 });

// Virtual for participant count
challengeSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for progress percentage
challengeSchema.virtual('progressPercentage').get(function() {
  if (this.goal.target === 0) return 0;
  return Math.min((this.totalProgress / this.goal.target) * 100, 100);
});

// Virtual for is completed
challengeSchema.virtual('isCompleted').get(function() {
  return this.totalProgress >= this.goal.target;
});

// Virtual for is expired
challengeSchema.virtual('isExpired').get(function() {
  return new Date() > this.endTime;
});

// Virtual for time remaining
challengeSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (now > this.endTime) return 0;
  return this.endTime - now;
});

// Method to join challenge
challengeSchema.methods.joinChallenge = function(userId) {
  if (this.status !== 'active') {
    throw new Error('Challenge is not active');
  }
  
  if (this.isExpired) {
    throw new Error('Challenge has expired');
  }
  
  if (this.participants.some(p => p.userId === userId)) {
    throw new Error('User already participating in challenge');
  }
  
  this.participants.push({
    userId,
    joinedAt: new Date(),
    contribution: 0
  });
  
  return this.save();
};

// Method to leave challenge
challengeSchema.methods.leaveChallenge = function(userId) {
  if (this.status !== 'active') {
    throw new Error('Cannot leave inactive challenge');
  }
  
  const participantIndex = this.participants.findIndex(p => p.userId === userId);
  if (participantIndex === -1) {
    throw new Error('User not participating in challenge');
  }
  
  const participant = this.participants[participantIndex];
  
  // Remove contribution from total
  this.totalProgress -= participant.contribution;
  this.progress.delete(userId);
  
  // Remove participant
  this.participants.splice(participantIndex, 1);
  
  // Recalculate leaderboard
  this.updateLeaderboard();
  
  return this.save();
};

// Method to update progress
challengeSchema.methods.updateProgress = function(userId, contribution) {
  if (this.status !== 'active') {
    throw new Error('Challenge is not active');
  }
  
  if (this.isExpired) {
    throw new Error('Challenge has expired');
  }
  
  if (contribution < this.settings.minContribution || contribution > this.settings.maxContribution) {
    throw new Error(`Contribution must be between ${this.settings.minContribution} and ${this.settings.maxContribution}`);
  }
  
  const participant = this.participants.find(p => p.userId === userId);
  if (!participant) {
    throw new Error('User not participating in challenge');
  }
  
  // Check cooldown
  if (this.settings.contributionCooldown > 0 && participant.lastContribution) {
    const cooldownEnd = new Date(participant.lastContribution.getTime() + (this.settings.contributionCooldown * 60000));
    if (new Date() < cooldownEnd) {
      throw new Error('Contribution cooldown active');
    }
  }
  
  // Update participant contribution
  const previousContribution = this.progress.get(userId) || 0;
  const newContribution = previousContribution + contribution;
  
  this.progress.set(userId, newContribution);
  participant.contribution = newContribution;
  participant.lastContribution = new Date();
  
  // Update total progress
  this.totalProgress += contribution;
  
  // Check milestones
  this.checkMilestones();
  
  // Update leaderboard
  this.updateLeaderboard();
  
  // Check completion
  if (this.settings.autoComplete && this.isCompleted) {
    this.status = 'completed';
  }
  
  return this.save();
};

// Method to update leaderboard
challengeSchema.methods.updateLeaderboard = function() {
  // Sort participants by contribution
  const sortedParticipants = this.participants
    .filter(p => p.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  
  // Update ranks
  sortedParticipants.forEach((participant, index) => {
    participant.rank = index + 1;
  });
  
  // Create leaderboard
  this.leaderboard = sortedParticipants.map((participant, index) => ({
    userId: participant.userId,
    contribution: participant.contribution,
    rank: index + 1,
    percentage: this.totalProgress > 0 ? (participant.contribution / this.totalProgress) * 100 : 0
  }));
};

// Method to check milestones
challengeSchema.methods.checkMilestones = function() {
  this.milestones.forEach(milestone => {
    if (!milestone.reached && this.totalProgress >= milestone.threshold) {
      milestone.reached = true;
      milestone.reachedAt = new Date();
    }
  });
};

// Method to complete challenge
challengeSchema.methods.completeChallenge = function() {
  if (this.status !== 'active') {
    throw new Error('Challenge is not active');
  }
  
  this.status = 'completed';
  this.updateLeaderboard();
  
  return this.save();
};

// Method to get top contributors
challengeSchema.methods.getTopContributors = function(limit = 10) {
  return this.leaderboard.slice(0, limit);
};

// Method to get user rank
challengeSchema.methods.getUserRank = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  return participant ? participant.rank : null;
};

// Static method to find active challenges
challengeSchema.statics.findActive = function(guildId) {
  return this.find({
    guildId,
    status: 'active',
    endTime: { $gt: new Date() }
  }).sort({ endTime: 1 });
};

// Static method to find expired challenges
challengeSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    endTime: { $lt: new Date() }
  });
};

// Static method to find challenges by type
challengeSchema.statics.findByType = function(guildId, challengeType) {
  return this.find({ guildId, challengeType }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Challenge', challengeSchema);
