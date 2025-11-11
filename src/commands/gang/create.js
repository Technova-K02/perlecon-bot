const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const config = require('../../config/config');
const economy = require('../../utils/economy');

module.exports = {
  name: 'makegang',
  description: 'Create a new gang',
  async execute(message, args) {
    try {
      let user = await User.findOne({ userId: message.author.id });
      if (!user) {
        user = new User({ userId: message.author.id });
        await user.save();
      }

      if (user.gang) {
        const errorEmbed = embeds.error('Already in Gang', 'You are already in a gang Leave your current gang first.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (user.pocket < config.gangs.createCost) {
        const errorEmbed = embeds.error(
          'Insufficient Funds',
          `Creating a gang costs ${economy.formatMoney(config.gangs.createCost)} coins.\nYour pocket: ${economy.formatMoney(user.pocket)}`
        );
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const name = args.join(' ');
      if (!name) {
        const errorEmbed = embeds.error('Missing Name', 'Usage: `.makegang <name>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (name.length < 3 || name.length > 100) {
        const errorEmbed = embeds.error('Invalid Length', 'Gang name must be between 3 and 20 characters');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const existing = await Gang.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existing) {
        const errorEmbed = embeds.error('Name Taken', 'A gang with this name already exists');
        return message.channel.send({ embeds: [errorEmbed] });
      }
      const mentionedUser = message.mentions.users.first();
      if (mentionedUser) {
        const errorEmbed = embeds.error('Invalid gang name', 'A gang name should start with normal alphabet like .makegang perlecon.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Create gang and update user
      const gang = await Gang.create({
        name,
        leaderId: message.author.id,
        members: [message.author.id],
        power: 100, // Starting power
        vault: 0,
        level: 1,
        maxMembers: 10,
        // Initialize base system
        base: {
          level: 1,
          vault: 0,
          guards: 4,
          defenses: 0,
          hp: 250,
          lastRaid: null
        },
        // Initialize army
        army: {
          guards: 0,
          medics: 0
        },
        // Initialize upgrades (all start at level 1)
        upgrades: {
          weapons: 1,
          walls: 1,
          guardsTraining: 1,
          medicTraining: 1
        },
        // Initialize tools
        tools: {
          basicLockpick: 0,
          steelLockpick: 0,
          titanLockpick: 0,
          breachCharge: 0
        },
        hostages: 0
      });

      user.gang = gang._id;
      user.pocket -= config.gangs.createCost;
      await user.save();

      const successEmbed = embeds.success(
        'Gang Created',
        `You successfully created **${gang.name}**.\n\n` +
        // `**Starting Power:** 100\n` +
        // `**Cost:** ${economy.formatMoney(config.gangs.createCost)} coins\n\n` +
        `Use \`.ganghelp\` to see all gang commands.`
      );
      message.channel.send({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Gang creation error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while creating the gang.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};






