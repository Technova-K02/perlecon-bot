const { planningSystem } = require('../../planning');
const { EmbedBuilder } = require('discord.js');

/**
 * Schedule management commands
 * Handles unified calendar and scheduling operations
 */

module.exports = {
  name: 'schedule',
  aliases: ['calendar'],
  description: 'View and manage your schedule',
  async execute(msg, args) {
    try {
      const eventService = planningSystem.getService('event');
      const reminderService = planningSystem.getService('reminder');
      const subcommand = args[0]?.toLowerCase();

      switch (subcommand) {
        case 'today':
          return await handleTodaySchedule(msg, eventService, reminderService);

        case 'week':
          return await handleWeekSchedule(msg, eventService, reminderService);

        default:
          // Show general schedule if no subcommand
          return await handleGeneralSchedule(msg, eventService, reminderService);
      }
    } catch (error) {
      console.error('Schedule command error:', error);
      return msg.channel.send('❌ An error occurred while processing your request.');
    }
  }
};

async function handleGeneralSchedule(msg, eventService, reminderService) {
  try {
    // Get upcoming events for the user
    const events = await eventService.getUserEvents(msg.author.id, msg.guild.id, { 
      upcoming: true, 
      limit: 5 
    });

    // Get upcoming reminders for the user
    const reminders = await reminderService.getRemindersByUser(msg.author.id, 'scheduled');
    const upcomingReminders = reminders
      .filter(r => r.scheduledTime > new Date())
      .slice(0, 5);

    const scheduleEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📅 Your Schedule')
      .setDescription('Here\'s your upcoming schedule:');

    // Add events
    if (events.length > 0) {
      const eventText = events.map(event => {
        const timeStr = event.scheduledTime.toLocaleString();
        return `📅 **${event.title}** - ${timeStr}`;
      }).join('\n');
      
      scheduleEmbed.addFields({ name: 'Upcoming Events', value: eventText, inline: false });
    }

    // Add reminders
    if (upcomingReminders.length > 0) {
      const reminderText = upcomingReminders.map(reminder => {
        const timeStr = reminder.scheduledTime.toLocaleString();
        return `⏰ **${reminder.message}** - ${timeStr}`;
      }).join('\n');
      
      scheduleEmbed.addFields({ name: 'Upcoming Reminders', value: reminderText, inline: false });
    }

    if (events.length === 0 && upcomingReminders.length === 0) {
      scheduleEmbed.setDescription('📅 Your schedule is clear No upcoming events or reminders.');
    }

    scheduleEmbed.setFooter({ text: 'Use schedule today or schedule week for more details' });

    return msg.channel.send({ embeds: [scheduleEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to get schedule: ${error.message}`);
  }
}

async function handleTodaySchedule(msg, eventService, reminderService) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Get today's events
    const events = await eventService.getUserEvents(msg.author.id, msg.guild.id, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    // Get today's reminders
    const reminders = await reminderService.getRemindersByUser(msg.author.id, 'scheduled');
    const todayReminders = reminders.filter(r => {
      const reminderDate = new Date(r.scheduledTime);
      return reminderDate >= startOfDay && reminderDate <= endOfDay;
    });

    const todayEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('📅 Today\'s Schedule')
      .setDescription(`Schedule for ${today.toDateString()}`);

    // Combine and sort all items by time
    const allItems = [
      ...events.map(e => ({ type: 'event', data: e, time: e.scheduledTime })),
      ...todayReminders.map(r => ({ type: 'reminder', data: r, time: r.scheduledTime }))
    ].sort((a, b) => a.time - b.time);

    if (allItems.length === 0) {
      todayEmbed.setDescription('📅 Nothing scheduled for today');
    } else {
      const scheduleText = allItems.map(item => {
        const timeStr = item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (item.type === 'event') {
          return `📅 ${timeStr} - **${item.data.title}**`;
        } else {
          return `⏰ ${timeStr} - ${item.data.message}`;
        }
      }).join('\n');

      todayEmbed.addFields({ name: 'Schedule', value: scheduleText, inline: false });
    }

    return msg.channel.send({ embeds: [todayEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to get today's schedule: ${error.message}`);
  }
}

async function handleWeekSchedule(msg, eventService, reminderService) {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    // Get this week's events
    const events = await eventService.getUserEvents(msg.author.id, msg.guild.id, {
      startDate: startOfWeek,
      endDate: endOfWeek
    });

    // Get this week's reminders
    const reminders = await reminderService.getRemindersByUser(msg.author.id, 'scheduled');
    const weekReminders = reminders.filter(r => {
      const reminderDate = new Date(r.scheduledTime);
      return reminderDate >= startOfWeek && reminderDate <= endOfWeek;
    });

    const weekEmbed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('📅 This Week\'s Schedule')
      .setDescription(`Week of ${startOfWeek.toDateString()}`);

    // Group by day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(e => e.scheduledTime >= dayStart && e.scheduledTime <= dayEnd);
      const dayReminders = weekReminders.filter(r => r.scheduledTime >= dayStart && r.scheduledTime <= dayEnd);

      if (dayEvents.length > 0 || dayReminders.length > 0) {
        const dayItems = [
          ...dayEvents.map(e => `📅 ${e.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.title}`),
          ...dayReminders.map(r => `⏰ ${r.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${r.message}`)
        ].sort();

        weekEmbed.addFields({ 
          name: dayNames[i], 
          value: dayItems.join('\n') || 'Nothing scheduled', 
          inline: false 
        });
      }
    }

    if (events.length === 0 && weekReminders.length === 0) {
      weekEmbed.setDescription('📅 Nothing scheduled for this week');
    }

    return msg.channel.send({ embeds: [weekEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to get week schedule: ${error.message}`);
  }
}



