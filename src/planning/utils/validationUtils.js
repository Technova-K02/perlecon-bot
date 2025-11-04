/**
 * Validation utilities for planning system data
 */

/**
 * Validate event data
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result
 */
function validateEventData(eventData) {
  const errors = [];
  
  if (!eventData.title || eventData.title.trim().length === 0) {
    errors.push('Event title is required');
  }
  
  if (eventData.title && eventData.title.length > 100) {
    errors.push('Event title must be 100 characters or less');
  }
  
  if (!eventData.scheduledTime) {
    errors.push('Scheduled time is required');
  }
  
  if (eventData.scheduledTime && new Date(eventData.scheduledTime) <= new Date()) {
    errors.push('Scheduled time must be in the future');
  }
  
  if (eventData.duration && (eventData.duration < 15 || eventData.duration > 1440)) {
    errors.push('Duration must be between 15 minutes and 24 hours');
  }
  
  if (eventData.maxParticipants && (eventData.maxParticipants < 1 || eventData.maxParticipants > 1000)) {
    errors.push('Max participants must be between 1 and 1000');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate tournament data
 * @param {Object} tournamentData - Tournament data to validate
 * @returns {Object} Validation result
 */
function validateTournamentData(tournamentData) {
  const errors = [];
  
  if (!tournamentData.name || tournamentData.name.trim().length === 0) {
    errors.push('Tournament name is required');
  }
  
  if (!tournamentData.tournamentType) {
    errors.push('Tournament type is required');
  }
  
  if (!['single_elimination', 'double_elimination', 'round_robin'].includes(tournamentData.tournamentType)) {
    errors.push('Invalid tournament type');
  }
  
  if (!tournamentData.maxParticipants || tournamentData.maxParticipants < 2) {
    errors.push('Tournament must allow at least 2 participants');
  }
  
  if (tournamentData.maxParticipants > 256) {
    errors.push('Tournament cannot have more than 256 participants');
  }
  
  if (!tournamentData.registrationDeadline) {
    errors.push('Registration deadline is required');
  }
  
  if (tournamentData.registrationDeadline && new Date(tournamentData.registrationDeadline) <= new Date()) {
    errors.push('Registration deadline must be in the future');
  }
  
  if (!tournamentData.startTime) {
    errors.push('Start time is required');
  }
  
  if (tournamentData.startTime && tournamentData.registrationDeadline && 
      new Date(tournamentData.startTime) <= new Date(tournamentData.registrationDeadline)) {
    errors.push('Start time must be after registration deadline');
  }
  
  if (tournamentData.entryFee && (tournamentData.entryFee < 0 || tournamentData.entryFee > 100000)) {
    errors.push('Entry fee must be between 0 and 100,000');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate challenge data
 * @param {Object} challengeData - Challenge data to validate
 * @returns {Object} Validation result
 */
function validateChallengeData(challengeData) {
  const errors = [];
  
  if (!challengeData.title || challengeData.title.trim().length === 0) {
    errors.push('Challenge title is required');
  }
  
  if (!challengeData.challengeType) {
    errors.push('Challenge type is required');
  }
  
  if (!['collective', 'competitive', 'milestone'].includes(challengeData.challengeType)) {
    errors.push('Invalid challenge type');
  }
  
  if (!challengeData.goal || !challengeData.goal.target) {
    errors.push('Challenge goal and target are required');
  }
  
  if (challengeData.goal && challengeData.goal.target < 1) {
    errors.push('Challenge target must be at least 1');
  }
  
  if (!challengeData.endTime) {
    errors.push('End time is required');
  }
  
  if (challengeData.endTime && new Date(challengeData.endTime) <= new Date()) {
    errors.push('End time must be in the future');
  }
  
  if (challengeData.startTime && challengeData.endTime && 
      new Date(challengeData.startTime) >= new Date(challengeData.endTime)) {
    errors.push('Start time must be before end time');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate reminder data
 * @param {Object} reminderData - Reminder data to validate
 * @returns {Object} Validation result
 */
function validateReminderData(reminderData) {
  const errors = [];
  
  if (!reminderData.message || reminderData.message.trim().length === 0) {
    errors.push('Reminder message is required');
  }
  
  if (reminderData.message && reminderData.message.length > 500) {
    errors.push('Reminder message must be 500 characters or less');
  }
  
  if (!reminderData.scheduledTime) {
    errors.push('Scheduled time is required');
  }
  
  if (reminderData.scheduledTime && new Date(reminderData.scheduledTime) <= new Date()) {
    errors.push('Scheduled time must be in the future');
  }
  
  if (reminderData.reminderType && !['personal', 'server', 'event'].includes(reminderData.reminderType)) {
    errors.push('Invalid reminder type');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Discord user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if valid Discord user ID
 */
function isValidDiscordId(userId) {
  return /^\d{17,19}$/.test(userId);
}

/**
 * Validate Discord channel ID format
 * @param {string} channelId - Channel ID to validate
 * @returns {boolean} True if valid Discord channel ID
 */
function isValidChannelId(channelId) {
  return /^\d{17,19}$/.test(channelId);
}

/**
 * Validate time format (HH:MM)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if valid time format
 */
function isValidTimeFormat(timeString) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString);
}

/**
 * Sanitize user input text
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
function sanitizeText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML/markdown injection
    .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
}

module.exports = {
  validateEventData,
  validateTournamentData,
  validateChallengeData,
  validateReminderData,
  isValidDiscordId,
  isValidChannelId,
  isValidTimeFormat,
  sanitizeText
};
