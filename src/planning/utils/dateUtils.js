/**
 * Date and time utility functions for the planning system
 */

/**
 * Parse natural language time expressions
 * @param {string} timeString - Natural language time string
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseNaturalTime(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  const str = timeString.toLowerCase().trim();
  const now = new Date();

  // Handle relative time (e.g., "2h", "30m", "1d")
  const relativeMatch = str.match(/^(\d+)([smhd])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    
    switch (unit) {
      case 's':
        return new Date(now.getTime() + amount * 1000);
      case 'm':
        return new Date(now.getTime() + amount * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + amount * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
    }
  }

  // Handle "in X minutes/hours/days"
  const inMatch = str.match(/^in (\d+) (second|minute|hour|day)s?$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];
    
    switch (unit) {
      case 'second':
        return new Date(now.getTime() + amount * 1000);
      case 'minute':
        return new Date(now.getTime() + amount * 60 * 1000);
      case 'hour':
        return new Date(now.getTime() + amount * 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
    }
  }

  // Handle "tomorrow"
  if (str === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
    return tomorrow;
  }

  // Handle "tomorrow at 3pm"
  const tomorrowAtMatch = str.match(/^tomorrow at (\d{1,2})(am|pm)$/);
  if (tomorrowAtMatch) {
    const hour = parseInt(tomorrowAtMatch[1]);
    const period = tomorrowAtMatch[2];
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let adjustedHour = hour;
    if (period === 'pm' && hour !== 12) {
      adjustedHour += 12;
    } else if (period === 'am' && hour === 12) {
      adjustedHour = 0;
    }
    
    tomorrow.setHours(adjustedHour, 0, 0, 0);
    return tomorrow;
  }

  // Handle "next week"
  if (str === 'next week') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek;
  }

  // Handle days of the week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.indexOf(str);
  if (dayIndex !== -1) {
    const targetDay = new Date(now);
    const currentDay = targetDay.getDay();
    const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
    
    if (daysUntilTarget === 0) {
      // If it's the same day, get next week's occurrence
      targetDay.setDate(targetDay.getDate() + 7);
    } else {
      targetDay.setDate(targetDay.getDate() + daysUntilTarget);
    }
    
    targetDay.setHours(9, 0, 0, 0);
    return targetDay;
  }

  // Handle "next [day]"
  const nextDayMatch = str.match(/^next (sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1];
    const dayIndex = days.indexOf(dayName);
    
    const targetDay = new Date(now);
    const currentDay = targetDay.getDay();
    const daysUntilTarget = (dayIndex - currentDay + 7) % 7;
    
    targetDay.setDate(targetDay.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
    targetDay.setHours(9, 0, 0, 0);
    return targetDay;
  }

  // Try to parse as a regular date string
  const parsedDate = new Date(timeString);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
}

/**
 * Format duration in human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if a time is within business hours
 * @param {Date} date - Date to check
 * @param {Object} businessHours - Business hours configuration
 * @returns {boolean} True if within business hours
 */
function isWithinBusinessHours(date, businessHours = { start: 9, end: 17 }) {
  const hour = date.getHours();
  return hour >= businessHours.start && hour < businessHours.end;
}

/**
 * Get next occurrence of a day of the week
 * @param {number} dayOfWeek - Day of week (0 = Sunday, 6 = Saturday)
 * @param {Date} fromDate - Starting date (default: now)
 * @returns {Date} Next occurrence of the day
 */
function getNextDayOfWeek(dayOfWeek, fromDate = new Date()) {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0) {
    // If it's the same day, get next week's occurrence
    date.setDate(date.getDate() + 7);
  } else {
    date.setDate(date.getDate() + daysUntilTarget);
  }
  
  return date;
}

/**
 * Calculate time zone offset
 * @param {string} timezone - Timezone string
 * @returns {number} Offset in minutes
 */
function getTimezoneOffset(timezone) {
  try {
    const date = new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc + (getTimezoneOffsetMinutes(timezone) * 60000));
    return targetTime.getTimezoneOffset();
  } catch (error) {
    return 0; // Default to UTC
  }
}

/**
 * Check if two time ranges overlap
 * @param {Date} start1 - Start of first range
 * @param {Date} end1 - End of first range
 * @param {Date} start2 - Start of second range
 * @param {Date} end2 - End of second range
 * @returns {boolean} True if ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

/**
 * Round time to nearest interval
 * @param {Date} date - Date to round
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {Date} Rounded date
 */
function roundToInterval(date, intervalMinutes = 15) {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % intervalMinutes;
  
  if (remainder !== 0) {
    rounded.setMinutes(minutes - remainder + intervalMinutes);
  }
  
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  
  return rounded;
}

/**
 * Get business days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of business days
 */
function getBusinessDaysBetween(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

module.exports = {
  parseNaturalTime,
  formatDuration,
  isWithinBusinessHours,
  getNextDayOfWeek,
  getTimezoneOffset,
  timeRangesOverlap,
  roundToInterval,
  getBusinessDaysBetween
};
