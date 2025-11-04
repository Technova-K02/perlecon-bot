const { planningSystem } = require('../../planning');
const { EmbedBuilder } = require('discord.js');

/**
 * Reminder management commands
 * Handles personal and server reminders
 */

module.exports = {
  name: 'remind',
  aliases: ['reminder'],
  description: 'Set and manage reminders',
  async execute(msg, args) {
    try {
      if (args.length === 0) {
        const helpEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('⏰ Reminder Commands')
          .setDescription('Set and manage personal reminders')
          .addFields(
            { name: '`remind <time> <message>`', value: 'Set a reminder', inline: false },
            { name: '`remind list`', value: 'List your active reminders', inline: false },
            { name: '`remind cancel <reminderId>`', value: 'Cancel a reminder', inline: false }
          )
          .addFields(
            { name: 'Time Examples', value: '`2h` (2 hours)\n`30m` (30 minutes)\n`1d` (1 day)\n`2024-12-25 15:30` (specific time)', inline: false }
          )
          .setFooter({ text: 'Example: remind 1h Take a break' });
        
        return msg.channel.send({ embeds: [helpEmbed] });
      }

      const reminderService = planningSystem.getService('reminder');
      const subcommand = args[0].toLowerCase();

      // Check if first argument is a subcommand
      if (['list', 'cancel'].includes(subcommand)) {
        switch (subcommand) {
          case 'list':
            return await handleListReminders(msg, reminderService);

          case 'cancel':
            return await handleCancelReminder(msg, args.slice(1), reminderService);

          default:
            return msg.channel.send('❌ Invalid subcommand. Use: list or cancel');
        }
      } else {
        // Treat as reminder creation: remind <time> <message>
        if (args.length < 2) {
          return msg.channel.send('❌ Usage: `remind <time> <message>`\nExample: `remind 2h Take a break`');
        }

        return await handleCreateReminder(msg, args, reminderService);
      }
    } catch (error) {
      console.error('Reminder command error:', error);
      return msg.channel.send('❌ An error occurred while processing your request.');
    }
  }
};

async function handleCreateReminder(msg, args, reminderService) {
  try {
    const timeStr = args[0];
    const message = args.slice(1).join(' ');

    if (message.trim()) {
      return msg.channel.send('❌ Please provide a reminder message.');
    }

    // Parse time string
    const scheduledTime = parseTimeString(timeStr);
    if (scheduledTime) {
      return msg.channel.send('❌ Invalid time format. Examples: `2h`, `30m`, `1d`, `2024-12-25 15:30`');
    }

    if (scheduledTime <= new Date()) {
      return msg.channel.send('❌ Reminder time must be in the future.');
    }

    const reminderData = {
      message: message.trim(),
      scheduledTime,
      reminderType: 'personal'
    };

    const reminder = await reminderService.createReminder(reminderData, msg.author.id, msg.guild.id);

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Reminder Set')
      .addFields(
        { name: 'Message', value: reminder.message, inline: false },
        { name: 'Reminder Time', value: scheduledTime.toLocaleString(), inline: true },
        { name: 'Reminder ID', value: reminder.reminderId, inline: true }
      )
      .setFooter({ text: `Use remind cancel ${reminder.reminderId} to cancel` });

    return msg.channel.send({ embeds: [successEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to create reminder: ${error.message}`);
  }
}

async function handleListReminders(msg, reminderService) {
  try {
    const reminders = await reminderService.getRemindersByUser(msg.author.id, 'scheduled');

    if (reminders.length === 0) {
      return msg.channel.send('⏰ You have no active reminders.');
    }

    const listEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('⏰ Your Active Reminders')
      .setDescription('Here are your scheduled reminders:');

    reminders.slice(0, 10).forEach(reminder => {
      const timeStr = reminder.scheduledTime.toLocaleString();
      const timeUntil = getTimeUntil(reminder.scheduledTime);
      
      listEmbed.addFields({
        name: `${reminder.reminderId}`,
        value: `📝 ${reminder.message}\n⏰ ${timeStr} (${timeUntil})`,
        inline: false
      });
    });

    if (reminders.length > 10) {
      listEmbed.setFooter({ text: `Showing first 10 of ${reminders.length} reminders` });
    }

    return msg.channel.send({ embeds: [listEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to list reminders: ${error.message}`);
  }
}

async function handleCancelReminder(msg, args, reminderService) {
  if (args.length === 0) {
    return msg.channel.send('❌ Usage: `remind cancel <reminderId>`');
  }

  try {
    const reminderId = args[0];
    const success = await reminderService.deleteReminder(reminderId, msg.author.id);

    if (success) {
      const successEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🗑️ Reminder Cancelled')
        .setDescription('The reminder has been cancelled successfully.');

      return msg.channel.send({ embeds: [successEmbed] });
    }
  } catch (error) {
    return msg.channel.send(`❌ Failed to cancel reminder: ${error.message}`);
  }
}

function parseTimeString(timeStr) {
  // Handle relative time (e.g., "2h", "30m", "1d")
  const relativeMatch = timeStr.match(/^(\d+)([hmsd])$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    
    const now = new Date();
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

  // Handle absolute time (e.g., "2024-12-25 15:30")
  const absoluteTime = new Date(timeStr);
  if (isNaN(absoluteTime.getTime())) {
    return absoluteTime;
  }

  // Handle time today (e.g., "15:30")
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const today = new Date();
      const targetTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      
      // If time has passed today, set for tomorrow
      if (targetTime <= new Date()) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      return targetTime;
    }
  }

  return null;
}

function getTimeUntil(targetTime) {
  const now = new Date();
  const diff = targetTime - now;
  
  if (diff <= 0) {
    return 'overdue';
  }
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `in ${days}d ${hours}h`;
  } else if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  } else {
    return `in ${minutes}m`;
  }
}



