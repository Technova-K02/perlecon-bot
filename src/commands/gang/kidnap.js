const Gang = require('../../models/Gang');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const { isUserKidnapped } = require('../../utils/kidnapping');
const { calculateSuccessRate, generateKidnapDuration } = require('../../utils/combatUtils');

module.exports = {
  name: 'kidnap',
  description: 'Kidnap someone who\'s outside their base',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot kidnap others');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get user data
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get attacker's gang
      const attackerGang = await Gang.findById(user.gang);
      if (!attackerGang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check kidnap cooldown (5 minutes)
      const kidnapCooldown = 5 * 60 * 1000; // 5 minutes in milliseconds
      const lastKidnap = user.cooldowns?.get('kidnap') || 0;
      if (Date.now() - lastKidnap < kidnapCooldown) {
        const remaining = Math.ceil((lastKidnap + kidnapCooldown - Date.now()) / (60 * 1000));
        const errorEmbed = embeds.error('Kidnap Cooldown', `You must wait ${remaining} minutes before kidnapping again`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user mentioned someone
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to kidnap\nUsage: `.kidnap <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user is trying to kidnap themselves
      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot kidnap yourself');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is a bot
      if (targetUser.bot) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot kidnap bots');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get target user data
      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData) {
        const errorEmbed = embeds.error('User Not Found', 'This user has no data in the system');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is already kidnapped
      if (await isUserKidnapped(targetUser.id)) {
        const errorEmbed = embeds.error('Already Kidnapped', `${targetUser.username} is already kidnapped`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is at their base (if they have a gang)
      if (targetUserData.gang && targetUserData.status === 'base') {
        const errorEmbed = embeds.error('Target Safe', `${targetUser.username} is at their base and cannot be kidnapped`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is in the same gang
      if (targetUserData.gang && targetUserData.gang.equals(attackerGang._id)) {
        const errorEmbed = embeds.error('Same Gang', 'You cannot kidnap members of your own gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate success rate using utility function
      const guardPenalty = targetUserData.guardsWithUser * 15; // Each guard reduces success by 15%
      const nonGangBonus = !targetUserData.gang ? 20 : 0; // +20% for non-gang members
      
      const successRate = calculateSuccessRate(70, {
        nonGangBonus: nonGangBonus
      }) - guardPenalty; // Apply guard penalty separately to allow going below 5%
      
      // For kidnapping, allow lower success rates but cap at 95%
      const finalSuccessRate = Math.max(5, Math.min(95, successRate));

      // Roll for success
      const roll = Math.random() * 100;
      const success = roll < finalSuccessRate;

      // Update kidnap cooldown
      user.cooldowns.set('kidnap', Date.now());
      await user.save();

      if (success) {
        // Generate random kidnap duration
        const { hours: kidnapHours, milliseconds: kidnapDuration } = generateKidnapDuration();
        const kidnapUntil = new Date(Date.now() + kidnapDuration);

        // Update target's status
        targetUserData.status = 'kidnapped';
        targetUserData.kidnappedUntil = kidnapUntil;
        targetUserData.kidnappedBy = message.author.id;
        
        // If target had guards, they're lost during kidnapping
        if (targetUserData.guardsWithUser > 0) {
          targetUserData.guardsWithUser = 0;
        }
        
        await targetUserData.save();

        // Update gang stats
        attackerGang.kidnaps += 1;
        attackerGang.hostages += 1;
        attackerGang.power += 5;
        
        await attackerGang.save();

        const embed = embeds.success(
          'Kidnapping Successful!',
          `**${message.author.username}** successfully kidnapped **${targetUser.username}**!\n\n` +
          `**Duration:** ${kidnapHours} hour${kidnapHours !== 1 ? 's' : ''}\n` +
          `**Released at:** <t:${Math.floor(kidnapUntil.getTime() / 1000)}:F>\n` +
          `**Success Rate:** ${finalSuccessRate.toFixed(1)}%\n\n` +
          `**Gang Hostages:** ${attackerGang.hostages}\n` +
          `**Power Gained:** +5 (Total: ${attackerGang.power})\n\n` +
          `*${targetUser.username} cannot work, steal, or transfer money while kidnapped*`
        );

        // Try to notify the victim
        try {
          // await targetUser.send(`**You have been kidnapped!**\n\nYou were kidnapped by **${message.author.username}** from **${attackerGang.name}**.\n\nYou will be released in **${kidnapHours} hour${kidnapHours !== 1 ? 's' : ''}** at <t:${Math.floor(kidnapUntil.getTime() / 1000)}:F>\n\nWhile kidnapped, you cannot work, steal, or transfer money.`);
        } catch (error) {
          // If DM fails, mention in channel
          message.channel.send(`${targetUser}, you have been kidnapped and will be released in ${kidnapHours} hour${kidnapHours !== 1 ? 's' : ''}!`);
        }

        return message.channel.send({ embeds: [embed] });

      } else {
        // Kidnap failed
        if (attackerGang.power > 2) attackerGang.power -= 2;
        await attackerGang.save();

        const embed = embeds.error(
          'Kidnapping Failed!',
          `**${message.author.username}** failed to kidnap **${targetUser.username}**!\n\n` +
          `**Success Rate:** ${finalSuccessRate.toFixed(1)}%\n` +
          `**Roll:** ${roll.toFixed(1)}%\n\n` +
          `**Power Lost:** -2 (Total: ${attackerGang.power})\n\n` +
          `*${targetUser.username} escaped and is now aware of the attempt*`
        );

        // Try to notify the target of the failed attempt
        try {
          // await targetUser.send(`**Kidnapping Attempt Failed!**\n\n**${message.author.username}** from **${attackerGang.name}** tried to kidnap you but failed!\n\nYou managed to escape. Stay safe!`);
        } catch (error) {
          // If DM fails, mention in channel
          message.channel.send(`${targetUser}, someone tried to kidnap you but you escaped!`);
        }

        return message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Kidnap command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing the kidnapping attempt.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};