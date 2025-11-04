const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true
  },
  round: {
    type: Number,
    required: true,
    min: 1
  },
  player1: {
    type: String,
    required: true
  },
  player2: {
    type: String,
    required: true
  },
  winner: String,
  loser: String,
  score: {
    player1Score: { type: Number, default: 0 },
    player2Score: { type: Number, default: 0 }
  },
  scheduledTime: Date,
  completedTime: Date,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'disputed'],
    default: 'scheduled'
  },
  disputeReason: String
});

const tournamentSchema = new mongoose.Schema({
  tournamentId: {
    type: String,
    required: true,
    unique: true,
    default: () => `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  name: {
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
  organizerId: {
    type: String,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    required: true,
    index: true
  },
  tournamentType: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'round_robin'],
    required: true
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0,
    max: 100000
  },
  prizePool: {
    type: Number,
    default: 0,
    min: 0
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    max: 256
  },
  registrationDeadline: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Registration deadline must be in the future'
    }
  },
  startTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.registrationDeadline;
      },
      message: 'Start time must be after registration deadline'
    }
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    seed: {
      type: Number,
      min: 1
    },
    registrationTime: {
      type: Date,
      default: Date.now
    },
    eliminated: {
      type: Boolean,
      default: false
    }
  }],
  brackets: {
    rounds: [{
      roundNumber: Number,
      matches: [String] // Match IDs
    }],
    winnersTree: mongoose.Schema.Types.Mixed,
    losersTree: mongoose.Schema.Types.Mixed // For double elimination
  },
  matches: [matchSchema],
  status: {
    type: String,
    enum: ['registration', 'brackets_generated', 'active', 'completed', 'cancelled'],
    default: 'registration',
    index: true
  },
  winners: {
    first: {
      userId: String,
      prize: Number
    },
    second: {
      userId: String,
      prize: Number
    },
    third: {
      userId: String,
      prize: Number
    }
  },
  settings: {
    autoAdvance: {
      type: Boolean,
      default: true
    },
    matchDuration: {
      type: Number,
      default: 60, // minutes
      min: 15,
      max: 480
    },
    timeBetweenRounds: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 1440
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tournamentSchema.index({ guildId: 1, status: 1 });
tournamentSchema.index({ organizerId: 1, status: 1 });
tournamentSchema.index({ startTime: 1, status: 1 });

// Virtual for participant count
tournamentSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for available spots
tournamentSchema.virtual('availableSpots').get(function() {
  return this.maxParticipants - this.participants.length;
});

// Virtual for is full
tournamentSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.maxParticipants;
});

// Virtual for registration open
tournamentSchema.virtual('registrationOpen').get(function() {
  return this.status === 'registration' && 
         new Date() < this.registrationDeadline && 
         !this.isFull;
});

// Method to register participant
tournamentSchema.methods.registerParticipant = function(userId) {
  if (!this.registrationOpen) {
    throw new Error('Registration is closed');
  }
  
  if (this.participants.some(p => p.userId === userId)) {
    throw new Error('User already registered');
  }
  
  this.participants.push({
    userId,
    seed: this.participants.length + 1,
    registrationTime: new Date()
  });
  
  return this.save();
};

// Method to unregister participant
tournamentSchema.methods.unregisterParticipant = function(userId) {
  if (this.status !== 'registration') {
    throw new Error('Cannot unregister after registration closes');
  }
  
  this.participants = this.participants.filter(p => p.userId !== userId);
  
  // Recalculate seeds
  this.participants.forEach((participant, index) => {
    participant.seed = index + 1;
  });
  
  return this.save();
};

// Method to generate brackets
tournamentSchema.methods.generateBrackets = function() {
  if (this.participants.length < 2) {
    throw new Error('Need at least 2 participants to generate brackets');
  }
  
  const participantCount = this.participants.length;
  const rounds = Math.ceil(Math.log2(participantCount));
  
  // Generate matches for first round
  const firstRoundMatches = [];
  const shuffledParticipants = [...this.participants].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledParticipants.length; i += 2) {
    if (i + 1 < shuffledParticipants.length) {
      const matchId = `match_${this.tournamentId}_r1_${Math.floor(i/2) + 1}`;
      firstRoundMatches.push({
        matchId,
        round: 1,
        player1: shuffledParticipants[i].userId,
        player2: shuffledParticipants[i + 1].userId,
        status: 'scheduled'
      });
    }
  }
  
  this.matches = firstRoundMatches;
  this.brackets.rounds = [{ roundNumber: 1, matches: firstRoundMatches.map(m => m.matchId) }];
  this.status = 'brackets_generated';
  
  return this.save();
};

// Method to report match result
tournamentSchema.methods.reportMatchResult = function(matchId, winnerId, loserId, score) {
  const match = this.matches.find(m => m.matchId === matchId);
  if (!match) {
    throw new Error('Match not found');
  }
  
  if (match.status === 'completed') {
    throw new Error('Match already completed');
  }
  
  if (![match.player1, match.player2].includes(winnerId) || 
      ![match.player1, match.player2].includes(loserId)) {
    throw new Error('Invalid winner or loser');
  }
  
  match.winner = winnerId;
  match.loser = loserId;
  match.status = 'completed';
  match.completedTime = new Date();
  
  if (score) {
    match.score = score;
  }
  
  // Mark loser as eliminated
  const loserParticipant = this.participants.find(p => p.userId === loserId);
  if (loserParticipant) {
    loserParticipant.eliminated = true;
  }
  
  return this.save();
};

// Method to advance tournament
tournamentSchema.methods.advanceTournament = function() {
  const currentRound = Math.max(...this.matches.map(m => m.round));
  const currentRoundMatches = this.matches.filter(m => m.round === currentRound);
  
  // Check if all matches in current round are completed
  const allCompleted = currentRoundMatches.every(m => m.status === 'completed');
  if (!allCompleted) {
    throw new Error('Not all matches in current round are completed');
  }
  
  const winners = currentRoundMatches.map(m => m.winner);
  
  // Check if tournament is complete
  if (winners.length === 1) {
    this.status = 'completed';
    this.winners.first = { userId: winners[0] };
    return this.save();
  }
  
  // Generate next round matches
  const nextRound = currentRound + 1;
  const nextRoundMatches = [];
  
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      const matchId = `match_${this.tournamentId}_r${nextRound}_${Math.floor(i/2) + 1}`;
      nextRoundMatches.push({
        matchId,
        round: nextRound,
        player1: winners[i],
        player2: winners[i + 1],
        status: 'scheduled'
      });
    }
  }
  
  this.matches.push(...nextRoundMatches);
  this.brackets.rounds.push({
    roundNumber: nextRound,
    matches: nextRoundMatches.map(m => m.matchId)
  });
  
  return this.save();
};

// Static method to find active tournaments
tournamentSchema.statics.findActive = function(guildId) {
  return this.find({
    guildId,
    status: { $in: ['registration', 'brackets_generated', 'active'] }
  }).sort({ startTime: 1 });
};

// Static method to find tournaments by status
tournamentSchema.statics.findByStatus = function(guildId, status) {
  return this.find({ guildId, status }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Tournament', tournamentSchema);
