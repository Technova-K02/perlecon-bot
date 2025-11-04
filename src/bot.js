require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/database');
const config = require('./config/config');
const { planningSystem } = require('./planning');
const leveling = require('./utils/leveling');
const economy = require('./utils/economy');

const allowedChannels = ['1434995380592054322', '1435006853116461229', '1435006834355208352'];

const announcementchannel = '1429159497234124953';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.cooldowns = new Map();

// ---- Load commands dynamically ----
try {
  const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
  for (const folder of commandFolders) {
    const commandPath = path.join(__dirname, 'commands', folder);
    const files = fs.readdirSync(commandPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const command = require(path.join(commandPath, file));
      if (command.name) {
        client.commands.set(command.name, command);
        console.log(`Loaded command: ${command.name}`);

        // Register aliases if they exist
        if (command.aliases && Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            client.commands.set(alias, command);
            console.log(`Loaded alias: ${alias} -> ${command.name}`);
          }
        }
      }
    }
  }
} catch (error) {
  console.error('Error loading commands:', error);
}

// ---- Command List ----
const commandList = [
  // Admin Commands
  'disbandgang', 'grant', 'resetgangs',

  // Casino Commands
  'baccarat', 'bingo', 'blackjack', 'luckhelp', 'luckstats', 'coinflip', 'crash', 'dice',
  'keno', 'lottery', 'lucky', 'mines', 'plinko', 'poker', 'roulette', 'slots', 'slotshelp', 'wheel',

  // Economy Commands
  'coins', 'coinslb', 'daily', 'put', 'ecohelp', 'give', 'p', 'putall', 'richest', 's',
  'ssfadf', 'steal', 'takeall', 'transactions', 'weekly', 'take', 'work', 'pocket', 'safe',

  // Gang Commands
  'army', 'base12321', 'buy', 'makegang', 'gang', 'bangang', 'battlegang', 'descriptiongang', 'disgang',
  'helpgang', 'infogang', 'invitations', 'addgang', 'kickgang', 'ganglb', 'leavegang',
  'listgang', 'members', 'officergang', 'promote', 'put', 'renamegang', 'searchgang132',
  'settingsgang', 'statsgang321312', 'getgang', 'safegang', 'hire', 'hostages', 'info', 'kidnap',
  'leavebase', 'raid', 'repair', 'return', 'rob', 'tools', 'upgrade', 'upgrades',

  // Leveling Commands
  'levellb', 'level', 'levelhelp', 'rank', 'lb', 'weeklylbfdsf',

  // Planning Commands
  'challenge', 'event', 'planhelp', 'planning', 'remind', 'schedule', 'tournament',

  // Shop Commands
  'inventory', 'inv', 'shop', 'shophelp', 'wardrobe',

  // Utility Commands
  'help'
];

// ---- Event: ready ----
// client.once('ready', async () => {
//   console.log(`Logged in as ${client.user.tag}`);
//   console.log(`Serving ${client.guilds.cache.size} servers`);

//   // Initialize planning system
//   try {
//     await planningSystem.initialize(client);
//     await planningSystem.startBackgroundTasks();
//   } catch (error) {
//     console.error('Failed to initialize planning system:', error);
//   }

//   client.user.setActivity('Perlecon bot | .help', { type: 0 });

//   // Reward existing boosters on startup
//   try {
//     for (const guild of client.guilds.cache.values()) {
//       await guild.members.fetch(); // Ensure all members are cached

//       const boosters = guild.members.cache.filter(member =>
//         member.premiumSince !== null && !member.user.bot
//       );

//       if (boosters.size > 0) {
//         console.log(`Found ${boosters.size} existing boosters in ${guild.name}`);

//         for (const [userId, member] of boosters) {
//           try {
//             await economy.addMoney(userId, 20000, 'existing_booster_reward');
//             console.log(`Rewarded existing booster: ${member.user.username}`);
//           } catch (error) {
//             console.error(`Failed to reward existing booster ${member.user.username}:`, error);
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error rewarding existing boosters:', error);
//   }
// });

// ---- Voice Activity Tracking ----
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const User = require('./models/User');
    const userId = newState.id || oldState.id;

    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
      let user = await User.findOne({ userId });
      if (!user) {
        user = new User({ userId });
      }
      user.voiceJoinTime = Date.now();
      await user.save();
    }

    // User left a voice channel
    if (oldState.channelId && !newState.channelId) {
      let user = await User.findOne({ userId });
      if (user && user.voiceJoinTime) {
        const timeSpent = Math.floor((Date.now() - user.voiceJoinTime) / 60000); // Convert to minutes
        user.weeklyVoiceMinutes += timeSpent;
        user.voiceJoinTime = null;
        await user.save();

        // Award total XP for voice activity (1 XP per minute)
        if (timeSpent > 0) {
          const gainXP = Math.floor(timeSpent / 5) * 5;
          await leveling.addXp(userId, gainXP);
          // await leveling.addWeeklyXp(userId, gainXP);
        }
      }
    }

    // User switched channels (update time for old channel)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      let user = await User.findOne({ userId });
      if (user && user.voiceJoinTime) {
        const timeSpent = Math.floor((Date.now() - user.voiceJoinTime) / 60000);
        user.weeklyVoiceMinutes += timeSpent;
        user.voiceJoinTime = Date.now(); // Reset for new channel
        await user.save();

        // Award total XP for voice activity (1 XP per minute)
        if (timeSpent > 0) {
          const gainXP = Math.floor(timeSpent / 5) * 5;
          await leveling.addXp(userId, gainXP);
          // await leveling.addWeeklyXp(userId, gainXP);
        }
      }
    }
  } catch (error) {
    console.error('Voice tracking error:', error);
  }
});

// ---- Automatic Booster Rewards ----
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Check if member just started boosting (premiumSince changed from null to a date)
    const oldPremium = oldMember?.premiumSince;
    const newPremium = newMember?.premiumSince;

    console.log(' ' + oldPremium + ' , ' + newPremium + ' ');

    if (newPremium && !oldPremium) {
      const boosterReward = 20000;

      try {
        // Grant the booster reward
        await economy.addMoney(newMember.user.id, boosterReward, 'booster_reward');

        // Try to send a DM to the booster
        try {
          const dmEmbed = {
            color: 0x00ff00,
            title: '💎 Server Booster Reward!',
            description: `Thank you for the boost! We sent you 20,000 coins to you safe.🎉`,
            timestamp: new Date(),
            footer: {
              text: 'ChillZone Economy Bot'
            }
          };

          // await newMember.user.send({ embeds: [dmEmbed] });

        } catch (dmError) {
          console.log(`Could not DM booster reward to ${newMember.user.username}`);
        }

        // Log the booster reward
        console.log(`🎉 Automatic booster reward: ${economy.formatMoney(boosterReward)} coins granted to ${newMember.user.username} (${newMember.user.id})`);

        // Send announcement to the announcement channel
        // const announcementChannelId = announcementchannel; // Using one of the allowed channels as announcement channel
        const announcementChannel = client.channels.cache.get(announcementchannel);
        if (announcementChannel) {
          const announceEmbed = {
            color: 0xff69b4,
            title: '💎 New Server Booster!',
            description: `Thank you ${newMember.user} for boosting our server!\n\n` +
              `They've been rewarded **${economy.formatMoney(boosterReward)}** coins! 🎉`,
            timestamp: new Date(),
            footer: {
              text: 'ChillZone Economy Bot'
            }
          };

          try {
            await announcementChannel.send({ embeds: [announceEmbed] });
            // await msg.channel.send({ embeds: [announceEmbed] });
          } catch (channelError) {
            console.error('Failed to send booster announcement:', channelError);
          }
        } else {
          console.log('Announcement channel not found for booster reward');
        }

      } catch (rewardError) {
        console.error(`Failed to grant booster reward to ${newMember.user.username}:`, rewardError);
      }
    }
  } catch (error) {
    console.error('Booster reward tracking error:', error);
  }
});

// ---- Event: messageCreate ----
client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  

  // Ignore messages from bots and check if the message is in an allowed channel
  if (msg.author.bot || !allowedChannels.includes(msg.channel.id)) return;
  const args1 = msg.content.slice(config.prefix.length).trim().split(/ +/);
  const cmdName1 = args1.shift().toLowerCase();

  if (!msg.content.startsWith(config.prefix) || !commandList.includes(cmdName1)) {
    // console.log('deletable');
    try {
      if (msg.deletable) {
        setTimeout(async () => {
          try {
            await msg.delete();
          } catch (error) {
            console.error('Auto-delete error:', error);
          }
        }, 500); // 0.5 second delay to avoid rate limits
      }
    } catch (error) {
      console.error('Message deletion check error:', error);
    }
    return; // Don't process non-command messages further
  }


  // Track message count and award XP for all users (not just commands)
  try {
    const User = require('./models/User');
    const cooldowns = require('./utils/cooldowns');

    let user = await User.findOne({ userId: msg.author.id });
    if (!user) {
      user = new User({ userId: msg.author.id });
    }
    user.messageCount += 1;
    user.weeklyTextMessages += 1;
    await user.save();

    // Award XP (1 XP per message with cooldown)
    const lastXp = await cooldowns.getCooldown(msg.author.id, 'xp');
    if (!lastXp) {
      const gainXP = config.leveling.xpPerMessage;
      const result = await leveling.addXp(msg.author.id, gainXP);
      // const res = await leveling.addWeeklyXp(msg.author.id, gainXP);

      if (result && result.leveledUp) {
        const embeds = require('./utils/embeds');
        const levelUpEmbed = embeds.success(
          'Level Up',
          `Congratulations ${msg.author}. You've reached level **${result.newLevel}**.`
        );
        msg.channel.send({ embeds: [levelUpEmbed] });
      }

      await cooldowns.setCooldown(msg.author.id, 'xp', config.leveling.xpCooldown);
    }
  } catch (error) {
    console.error('Message tracking error:', error);
  }

  if (!msg.content.startsWith(config.prefix)) return;

  const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();
  const command = client.commands.get(cmdName);
  if (!command) return;

  try {
    await command.execute(msg, args, client);
  } catch (err) {
    console.error('Command error:', err);
    msg.channel.send('Error executing command.');
  }
});

// ---- Event: interactionCreate (Button and Select Menu Interactions) ----
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  try {
    const GangInvitation = require('./models/GangInvitation');
    const Gang = require('./models/Gang');
    const User = require('./models/User');
    const embeds = require('./utils/embeds');

    // Handle shop buttons
    if (interaction.customId.startsWith('shop_') || interaction.customId.startsWith('buy_')) {
      const shopCommand = client.commands.get('shop');
      if (shopCommand && shopCommand.handleButton) {
        await shopCommand.handleButton(interaction);
      }
      return;
    }

    // Handle wardrobe buttons
    if (interaction.customId.startsWith('wardrobe_')) {
      const wardrobeCommand = client.commands.get('wardrobe');
      if (wardrobeCommand) {
        if (interaction.isButton() && wardrobeCommand.handleButton) {
          await wardrobeCommand.handleButton(interaction);
        } else if (interaction.isStringSelectMenu() && wardrobeCommand.handleSelectMenu) {
          await wardrobeCommand.handleSelectMenu(interaction);
        }
      } else {
        console.error('Wardrobe command not found in client.commands');
        await interaction.reply({ content: 'Wardrobe system error - command not loaded', flags: 64 });
      }
      return;
    }

    // Handle casino game buttons
    if (interaction.customId.startsWith('blackjack_')) {
      const blackjackCommand = client.commands.get('blackjack');
      if (blackjackCommand && blackjackCommand.handleButton) {
        await blackjackCommand.handleButton(interaction);
      }
      return;
    }

    if (interaction.customId.startsWith('crash_')) {
      const crashCommand = client.commands.get('crash');
      if (crashCommand && crashCommand.handleButton) {
        await crashCommand.handleButton(interaction);
      }
      return;
    }

    if (interaction.customId.startsWith('mines_')) {
      const minesCommand = client.commands.get('mines');
      if (minesCommand && minesCommand.handleButton) {
        await minesCommand.handleButton(interaction);
      }
      return;
    }

    // Handle gang invitation buttons
    if (interaction.customId.startsWith('gang_accept_') || interaction.customId.startsWith('gang_decline_')) {
      const action = interaction.customId.startsWith('gang_accept_') ? 'accept' : 'decline';
      const inviteeId = interaction.customId.split('_')[2];

      // Check if the user clicking is the invited user
      if (interaction.user.id !== inviteeId) {
        await interaction.reply({
          content: 'This invitation is not for you!',
          flags: 64
        });
        return;
      }

      // Find the invitation
      const invitation = await GangInvitation.findOne({
        messageId: interaction.message.id,
        inviteeId: interaction.user.id,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).populate('gangId');

      if (!invitation) {
        await interaction.reply({
          content: 'This invitation has expired or is no longer valid!',
          flags: 64
        });
        return;
      }

      const gang = invitation.gangId;
      if (!gang) {
        await interaction.reply({
          content: 'The gang no longer exists!',
          flags: 64
        });
        return;
      }

      if (action === 'accept') {
        // Check if user is already in a gang
        const userData = await User.findOne({ userId: interaction.user.id });
        if (userData.gang) {
          await interaction.reply({
            content: 'You are already in a gang!',
            flags: 64
          });
          return;
        }

        // Check if gang is full
        if (gang.members.length >= gang.maxMembers) {
          await interaction.reply({
            content: 'This gang is now full!',
            flags: 64
          });
          return;
        }

        // Check if user is banned
        if (gang.banned.includes(interaction.user.id)) {
          await interaction.reply({
            content: 'You have been banned from this gang!',
            flags: 64
          });
          return;
        }

        // Check level requirement
        if (userData.level < gang.settings.minLevelToJoin) {
          await interaction.reply({
            content: `You need to be level ${gang.settings.minLevelToJoin} or higher to join this gang!`,
            flags: 64
          });
          return;
        }

        // Accept the invitation
        gang.members.push(interaction.user.id);
        userData.gang = gang._id;
        invitation.status = 'accepted';

        await gang.save();
        await userData.save();
        await invitation.save();

        // Get leader name
        let leaderName = 'Unknown User';
        try {
          const leader = await client.users.fetch(gang.leaderId);
          leaderName = leader.username;
        } catch (error) {
          // Keep default name
        }

        const successEmbed = embeds.success(' ', ' '
          // 'Welcome to the Gang',
          // `${interaction.user} has successfully joined **${gang.name}**.\n\n` +
          // `**Gang Info:**\n` +
          // `Leader: ${leaderName}\n` +
          // `Members: ${gang.members.length}/${gang.maxMembers}\n` +
          // `Power: ${gang.power}\n` +
          // `safe: ${economy.formatMoney(gang.safe)}`
        );

        await interaction.update({
          embeds: [successEmbed],
          components: []
        });

      } else if (action === 'decline') {
        // Decline the invitation
        invitation.status = 'declined';
        await invitation.save();

        const declineEmbed = embeds.info(' ', ' '
          // 'Invitation Declined',
          // `${interaction.user} has declined the invitation to join **${gang.name}**.`
        );

        await interaction.update({
          embeds: [declineEmbed],
          components: []
        });
      }
    }

  } catch (error) {
    console.error('Gang invitation button error:', error);
    try {
      await interaction.reply({
        content: 'An error occurred while processing your response.',
        flags: 64
      });
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
});

// ---- Graceful shutdown ----
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down bot...');
  try {
    await planningSystem.stopBackgroundTasks();
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// ---- Weekly Reset Function ----
async function resetWeeklyStats() {
  try {
    const User = require('./models/User');
    await User.updateMany({}, {
      weeklyTextMessages: 0,
      weeklyVoiceMinutes: 0,
      weeklyXP: 0,
      lastWeeklyReset: new Date()
    });
    console.log('Weekly stats reset completed');
  } catch (error) {
    console.error('Weekly reset error:', error);
  }
}



// ---- Schedule Weekly Reset (Every Sunday at midnight) ----
function scheduleWeeklyReset() {
  const now = new Date();
  const nextSunday = new Date();
  nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
  nextSunday.setHours(0, 0, 0, 0);

  const timeUntilReset = nextSunday.getTime() - now.getTime();

  setTimeout(() => {
    resetWeeklyStats();
    // Schedule next reset (7 days later)
    setInterval(resetWeeklyStats, 7 * 24 * 60 * 60 * 1000);
  }, timeUntilReset);

  console.log(`📅 Next weekly reset scheduled for: ${nextSunday.toLocaleString()}`);
}

// ---- Start bot ----
(async () => {
  try {
    await connectDB();
    await client.login(process.env.DISCORD_TOKEN);
    scheduleWeeklyReset();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();