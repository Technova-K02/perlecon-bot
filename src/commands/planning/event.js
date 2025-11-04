const { planningSystem } = require('../../planning');
const { EmbedBuilder } = require('discord.js');

/**
 * Event management commands
 * Handles event creation, management, and RSVP operations
 */

module.exports = {
  name: 'event',
  description: 'Manage events',
  async execute(msg, args) {
    try {
      if (args.length === 0) {
        const helpEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('📅 Event Commands')
          .setDescription('Manage server events and RSVPs')
          .addFields(
            { name: '`event create <title> <date> <time>`', value: 'Create a new event', inline: false },
            { name: '`event list`', value: 'List upcoming events', inline: false },
            { name: '`event info <eventId>`', value: 'Get event details', inline: false },
            { name: '`event join <eventId>`', value: 'Join an event', inline: false },
            { name: '`event leave <eventId>`', value: 'Leave an event', inline: false },
            { name: '`event cancel <eventId>`', value: 'Cancel your event', inline: false }
          )
          .setFooter({ text: 'Example: event create "Game Night" 2024-12-25 20:00' });
        
        return msg.channel.send({ embeds: [helpEmbed] });
      }

      const eventService = planningSystem.getService('event');
      const subcommand = args[0].toLowerCase();

      switch (subcommand) {
        case 'create':
          return await handleCreateEvent(msg, args.slice(1), eventService);

        case 'list':
          return await handleListEvents(msg, args.slice(1), eventService);

        case 'info':
          return await handleEventInfo(msg, args.slice(1), eventService);

        case 'join':
          return await handleJoinEvent(msg, args.slice(1), eventService);

        case 'leave':
          return await handleLeaveEvent(msg, args.slice(1), eventService);

        case 'cancel':
          return await handleCancelEvent(msg, args.slice(1), eventService);

        default:
          return msg.channel.send('❌ Invalid subcommand. Use: create, list, info, join, leave, or cancel');
      }
    } catch (error) {
      console.error('Event command error:', error);
      return msg.channel.send('❌ An error occurred while processing your request.');
    }
  }
};

async function handleCreateEvent(msg, args, eventService) {
  if (args.length < 3) {
    return msg.channel.send('❌ Usage: `event create <title> <date> <time> [description]`\nExample: `event create "Game Night" 2024-12-25 20:00 "Fun gaming session"`');
  }

  try {
    const title = args[0].replace(/"/g, '');
    const dateStr = args[1];
    const timeStr = args[2];
    const description = args.slice(3).join(' ').replace(/"/g, '') || '';

    // Parse date and time
    const scheduledTime = new Date(`${dateStr} ${timeStr}`);
    if (isNaN(scheduledTime.getTime())) {
      return msg.channel.send('❌ Invalid date/time format. Use: YYYY-MM-DD HH:MM');
    }

    if (scheduledTime <= new Date()) {
      return msg.channel.send('❌ Event time must be in the future.');
    }

    const eventData = {
      title,
      description,
      scheduledTime,
      duration: 60 // Default 1 hour
    };

    const event = await eventService.createEvent(eventData, msg.author.id, msg.guild.id);

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Event Created Successfully')
      .addFields(
        { name: 'Title', value: event.title, inline: true },
        { name: 'Event ID', value: event.eventId, inline: true },
        { name: 'Date & Time', value: scheduledTime.toLocaleString(), inline: false },
        { name: 'Description', value: event.description || 'No description', inline: false }
      )
      .setFooter({ text: `Use event join ${event.eventId} to join this event` });

    return msg.channel.send({ embeds: [successEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to create event: ${error.message}`);
  }
}

async function handleListEvents(msg, args, eventService) {
  try {
    const events = await eventService.getGuildEvents(msg.guild.id, { upcoming: true, limit: 10 });

    if (events.length === 0) {
      return msg.channel.send('📅 No upcoming events found.');
    }

    const listEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📅 Upcoming Events')
      .setDescription('Here are the upcoming events in this server:');

    events.forEach(event => {
      const timeStr = event.scheduledTime.toLocaleString();
      const participantCount = event.participants.length;
      const maxParticipants = event.maxParticipants ? `/${event.maxParticipants}` : '';
      
      listEmbed.addFields({
        name: `${event.title} (${event.eventId})`,
        value: `📅 ${timeStr}\n👥 ${participantCount}${maxParticipants} participants\n📝 ${event.description || 'No description'}`,
        inline: false
      });
    });

    listEmbed.setFooter({ text: 'Use event info <eventId> for more details' });

    return msg.channel.send({ embeds: [listEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to list events: ${error.message}`);
  }
}

async function handleEventInfo(msg, args, eventService) {
  if (args.length === 0) {
    return msg.channel.send('❌ Usage: `event info <eventId>`');
  }

  try {
    const eventId = args[0];
    const event = await eventService.getEvent(eventId);

    const rsvpManager = planningSystem.getService('event').rsvpManager || 
                       require('../../planning/services/RSVPManager');
    const rsvpSummary = await new rsvpManager().getEventRSVPs(eventId);

    const infoEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`📅 ${event.title}`)
      .addFields(
        { name: 'Event ID', value: event.eventId, inline: true },
        { name: 'Creator', value: `<@${event.creatorId}>`, inline: true },
        { name: 'Status', value: event.status, inline: true },
        { name: 'Date & Time', value: event.scheduledTime.toLocaleString(), inline: false },
        { name: 'Duration', value: `${event.duration} minutes`, inline: true },
        { name: 'Participants', value: `${rsvpSummary.confirmed}${event.maxParticipants ? `/${event.maxParticipants}` : ''}`, inline: true }
      );

    if (event.description) {
      infoEmbed.addFields({ name: 'Description', value: event.description, inline: false });
    }

    if (rsvpSummary.responses.length > 0) {
      const rsvpText = rsvpSummary.responses
        .slice(0, 10) // Limit to first 10
        .map(r => `<@${r.userId}>: ${r.status}`)
        .join('\n');
      
      infoEmbed.addFields({ name: 'RSVPs', value: rsvpText, inline: false });
    }

    infoEmbed.setFooter({ text: `Use event join ${eventId} to join this event` });

    return msg.channel.send({ embeds: [infoEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to get event info: ${error.message}`);
  }
}

async function handleJoinEvent(msg, args, eventService) {
  if (args.length === 0) {
    return msg.channel.send('❌ Usage: `event join <eventId>`');
  }

  try {
    const eventId = args[0];
    const result = await eventService.rsvpToEvent(eventId, msg.author.id, 'yes');

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Successfully Joined Event')
      .setDescription(`You have joined the event. There are now ${result.participantCount} participants.`)
      .setFooter({ text: result.availableSpots ? `${result.availableSpots} spots remaining` : 'No participant limit' });

    return msg.channel.send({ embeds: [successEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to join event: ${error.message}`);
  }
}

async function handleLeaveEvent(msg, args, eventService) {
  if (args.length === 0) {
    return msg.channel.send('❌ Usage: `event leave <eventId>`');
  }

  try {
    const eventId = args[0];
    const result = await eventService.rsvpToEvent(eventId, msg.author.id, 'no');

    const successEmbed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('👋 Left Event')
      .setDescription(`You have left the event. There are now ${result.participantCount} participants.`);

    return msg.channel.send({ embeds: [successEmbed] });
  } catch (error) {
    return msg.channel.send(`❌ Failed to leave event: ${error.message}`);
  }
}

async function handleCancelEvent(msg, args, eventService) {
  if (args.length === 0) {
    return msg.channel.send('❌ Usage: `event cancel <eventId>`');
  }

  try {
    const eventId = args[0];
    const success = await eventService.deleteEvent(eventId, msg.author.id);

    if (success) {
      const successEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Event Cancelled')
        .setDescription('The event has been cancelled successfully.');

      return msg.channel.send({ embeds: [successEmbed] });
    }
  } catch (error) {
    return msg.channel.send(`❌ Failed to cancel event: ${error.message}`);
  }
}



