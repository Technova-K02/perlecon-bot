/**
 * Recurrence pattern utilities for events and reminders
 */

/**
 * Calculate next occurrence based on recurrence pattern
 * @param {Date} currentDate - Current occurrence date
 * @param {Object} pattern - Recurrence pattern
 * @returns {Date|null} Next occurrence date or null if no more occurrences
 */
function calculateNextOccurrence(currentDate, pattern) {
  // Implementation will be added in later tasks
  throw new Error('calculateNextOccurrence not yet implemented');
}

/**
 * Validate recurrence pattern
 * @param {Object} pattern - Recurrence pattern to validate
 * @returns {Object} Validation result
 */
function validateRecurrencePattern(pattern) {
  const errors = [];
  
  if (!pattern.type) {
    errors.push('Recurrence type is required');
  }
  
  if (!['daily', 'weekly', 'monthly', 'custom'].includes(pattern.type)) {
    errors.push('Invalid recurrence type');
  }
  
  if (pattern.interval && (pattern.interval < 1 || pattern.interval > 365)) {
    errors.push('Interval must be between 1 and 365');
  }
  
  if (pattern.maxOccurrences && pattern.maxOccurrences < 1) {
    errors.push('Max occurrences must be at least 1');
  }
  
  if (pattern.endDate && pattern.endDate <= new Date()) {
    errors.push('End date must be in the future');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate occurrence schedule for a recurrence pattern
 * @param {Date} startDate - Start date
 * @param {Object} pattern - Recurrence pattern
 * @param {number} maxOccurrences - Maximum occurrences to generate
 * @returns {Array} Array of occurrence dates
 */
function generateOccurrenceSchedule(startDate, pattern, maxOccurrences = 10) {
  // Implementation will be added in later tasks
  throw new Error('generateOccurrenceSchedule not yet implemented');
}

/**
 * Check if a date matches a recurrence pattern
 * @param {Date} date - Date to check
 * @param {Date} startDate - Pattern start date
 * @param {Object} pattern - Recurrence pattern
 * @returns {boolean} True if date matches pattern
 */
function dateMatchesPattern(date, startDate, pattern) {
  // Implementation will be added in later tasks
  throw new Error('dateMatchesPattern not yet implemented');
}

/**
 * Parse cron-like expression to recurrence pattern
 * @param {string} cronExpression - Cron expression
 * @returns {Object} Recurrence pattern
 */
function parseCronExpression(cronExpression) {
  // Implementation will be added in later tasks
  throw new Error('parseCronExpression not yet implemented');
}

/**
 * Convert recurrence pattern to human-readable description
 * @param {Object} pattern - Recurrence pattern
 * @returns {string} Human-readable description
 */
function describeRecurrencePattern(pattern) {
  if (!pattern || !pattern.type) {
    return 'No recurrence';
  }
  
  const interval = pattern.interval || 1;
  
  switch (pattern.type) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
      
    case 'weekly':
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const days = pattern.daysOfWeek.map(day => dayNames[day]).join(', ');
        return `Weekly on ${days}`;
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      
    case 'monthly':
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
      
    case 'custom':
      return 'Custom recurrence pattern';
      
    default:
      return 'Unknown recurrence pattern';
  }
}

module.exports = {
  calculateNextOccurrence,
  validateRecurrencePattern,
  generateOccurrenceSchedule,
  dateMatchesPattern,
  parseCronExpression,
  describeRecurrencePattern
};
