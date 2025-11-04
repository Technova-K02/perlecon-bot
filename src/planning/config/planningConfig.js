/**
 * Planning System Configuration
 * Central configuration for all planning features
 */

module.exports = {
  // Event system configuration
  events: {
    maxTitleLength: 100,
    maxDescriptionLength: 1000,
    minDuration: 15, // minutes
    maxDuration: 1440, // 24 hours
    maxParticipants: 1000,
    defaultDuration: 60,
    reminderTimes: {
      advance24h: 24 * 60 * 60 * 1000, // 24 hours
      advance1h: 60 * 60 * 1000,       // 1 hour
      advance15m: 15 * 60 * 1000       // 15 minutes
    },
    maxRecurringOccurrences: 1000,
    maxAdvanceScheduling: 365 // days
  },

  // Tournament system configuration
  tournaments: {
    maxNameLength: 100,
    maxDescriptionLength: 1000,
    minParticipants: 2,
    maxParticipants: 256,
    maxEntryFee: 100000,
    defaultMatchDuration: 60, // minutes
    defaultTimeBetweenRounds: 30, // minutes
    maxAdvanceRegistration: 30, // days
    supportedTypes: ['single_elimination', 'double_elimination', 'round_robin'],
    prizeDistribution: {
      single_elimination: {
        first: 0.6,   // 60% to winner
        second: 0.3,  // 30% to runner-up
        third: 0.1    // 10% to third place
      },
      double_elimination: {
        first: 0.5,
        second: 0.3,
        third: 0.2
      },
      round_robin: {
        first: 0.4,
        second: 0.3,
        third: 0.2,
        participation: 0.1
      }
    }
  },

  // Challenge system configuration
  challenges: {
    maxTitleLength: 100,
    maxDescriptionLength: 1000,
    maxDuration: 90, // days
    minDuration: 1,  // day
    maxTarget: 1000000,
    minTarget: 1,
    supportedTypes: ['collective', 'competitive', 'milestone'],
    supportedGoalTypes: ['count', 'sum', 'time', 'custom'],
    defaultSettings: {
      autoComplete: true,
      allowSelfReporting: true,
      minContribution: 1,
      maxContribution: 1000,
      contributionCooldown: 0 // minutes
    },
    maxMilestones: 10,
    maxParticipants: 10000
  },

  // Reminder system configuration
  reminders: {
    maxMessageLength: 500,
    maxAdvanceScheduling: 365, // days
    maxUserReminders: 100,
    supportedTypes: ['personal', 'server', 'event'],
    supportedPriorities: ['low', 'normal', 'high', 'urgent'],
    maxRecurringOccurrences: 1000,
    cleanupAfterDays: 30,
    maxTags: 10,
    maxTagLength: 20
  },

  // Notification system configuration
  notifications: {
    maxTitleLength: 100,
    maxMessageLength: 2000,
    maxDeliveryAttempts: 5,
    retryDelays: [60000, 300000, 900000, 1800000, 3600000], // 1m, 5m, 15m, 30m, 1h
    batchTimeWindow: 300000, // 5 minutes
    maxBatchSize: 10,
    supportedDeliveryMethods: ['dm', 'channel', 'both'],
    supportedPriorities: ['low', 'normal', 'high', 'urgent'],
    cleanupAfterDays: 7,
    maxEmbedFields: 25,
    maxActions: 5
  },

  // Schedule system configuration
  schedule: {
    maxEventsPerView: 50,
    defaultTimeZone: 'UTC',
    supportedFormats: ['ical', 'json', 'csv'],
    conflictDetectionWindow: 30, // minutes
    businessHours: {
      start: 9,  // 9 AM
      end: 17    // 5 PM
    },
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
    maxExportDays: 365
  },

  // Integration settings
  integration: {
    economy: {
      enabled: true,
      currencySymbol: '$',
      maxTransactionAmount: 1000000,
      feePercentage: 0.05 // 5% platform fee
    },
    leveling: {
      enabled: true,
      xpRewards: {
        eventParticipation: 50,
        tournamentWin: 200,
        tournamentParticipation: 100,
        challengeCompletion: 150,
        challengeParticipation: 75
      }
    },
    gangs: {
      enabled: true,
      gangEventBonus: 1.2, // 20% bonus for gang events
      gangTournamentDiscount: 0.1 // 10% entry fee discount
    }
  },

  // Performance and limits
  performance: {
    maxConcurrentProcessing: 10,
    processingBatchSize: 100,
    cacheTimeout: 300000, // 5 minutes
    maxQueryResults: 1000,
    backgroundTaskInterval: 60000, // 1 minute
    cleanupInterval: 3600000, // 1 hour
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB
  },

  // Security settings
  security: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
    requirePermissions: true,
    adminRoles: ['Administrator', 'Moderator'],
    rateLimitByUser: true,
    sanitizeInput: true,
    maxInputLength: 10000
  },

  // Feature flags
  features: {
    recurringEvents: true,
    tournamentBrackets: true,
    challengeLeaderboards: true,
    smartNotifications: true,
    scheduleExport: true,
    conflictDetection: true,
    userPreferences: true,
    webhookIntegration: false,
    apiAccess: false,
    advancedAnalytics: false
  },

  // Default user preferences
  defaultUserPreferences: {
    notifications: {
      enabled: true,
      respectDND: true,
      batchSimilar: true,
      preferredDeliveryMethod: 'dm',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    },
    schedule: {
      defaultView: 'week',
      timeZone: 'UTC',
      showConflicts: true,
      businessHoursOnly: false
    },
    events: {
      autoJoinGangEvents: false,
      reminderPreference: 'advance1h',
      maxEventsPerDay: 5
    },
    tournaments: {
      autoRegister: false,
      preferredTypes: ['single_elimination'],
      maxEntryFee: 1000
    },
    challenges: {
      autoJoin: false,
      preferredTypes: ['collective'],
      contributionReminders: true
    }
  }
};
