const Gang = require('../../models/Gang');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');
const { formatKidnapTime, getRemainingKidnapTime } = require('../../utils/kidnapping');

module.exports = {
  name: 'release',
  description: 'Release a hostage early in exchange for a ransom payment',
  async execute(message, args) {
    try {
      // Get user data
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get user's gang
      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user mentioned someone
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to release\nUsage: `.release <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get target user data
      const targetUserData = await User.findOne({ userId: targetUser.id });
      if (!targetUserData) {
        const errorEmbed = embeds.error('User Not Found', 'This user has no data in the system');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is kidnapped
      if (targetUserData.status !== 'kidnapped' || !targetUserData.kidnappedUntil || !targetUserData.kidnappedBy) {
        const errorEmbed = embeds.error('Not Kidnapped', `${targetUser.username} is not currently kidnapped`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if kidnap time has already expired
      if (targetUserData.kidnappedUntil <= new Date()) {
        const errorEmbed = embeds.error('Already Released', `${targetUser.username}'s kidnap time has already expired`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if the user or their gang is the kidnapper
      const kidnappedByUser = await User.findOne({ userId: targetUserData.kidnappedBy });
      if (!kidnappedByUser || !kidnappedByUser.gang) {
        const errorEmbed = embeds.error('Invalid Kidnapper', 'The kidnapper is no longer in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Verify the requester is from the kidnapper's gang
      if (!gang._id.equals(kidnappedByUser.gang)) {
        const errorEmbed = embeds.error('Not Your Hostage', `${targetUser.username} was not kidnapped by your gang`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate ransom based on remaining time
      // const remainingTime = await getRemainingKidnapTime(targetUser.id);
      // const remainingHours = remainingTime / (1000 * 60 * 60);
      
      // // Ransom formula: 5000 coins per remaining hour (minimum 2500)
      // const ransomAmount = Math.max(2500, Math.floor(remainingHours * 5000));

      // Check if target has enough money
      // const targetTotalMoney = targetUserData.pocket + targetUserData.bank;
      // if (targetTotalMoney < ransomAmount) {
      //   const errorEmbed = embeds.error(
      //     'Insufficient Funds',
      //     `${targetUser.username} doesn't have enough money to pay the ransom\n\n` +
      //     `**Ransom Required:** ${economy.formatMoney(ransomAmount)}\n` +
      //     `**Target's Money:** ${economy.formatMoney(targetTotalMoney)}\n\n` +
      //     `*They need ${economy.formatMoney(ransomAmount - targetTotalMoney)} more coins*`
      //   );
      //   return message.channel.send({ embeds: [errorEmbed] });
      // }

      // Deduct ransom from target (from bank first, then pocket)
      // let remainingRansom = ransomAmount;
      // if (targetUserData.bank >= remainingRansom) {
      //   // targetUserData.bank -= remainingRansom;
      // } else {
      //   remainingRansom -= targetUserData.bank;
      //   targetUserData.bank = 0;
      //   targetUserData.pocket -= remainingRansom;
      // }

      // Add ransom to gang vault
      // gang.vault += ransomAmount;

      // Release the hostage
      targetUserData.status = 'base';
      targetUserData.kidnappedUntil = null;
      targetUserData.kidnappedBy = null;

      // Decrease gang hostage count
      if (gang.hostages > 0) {
        gang.hostages -= 1;
      }

      await targetUserData.save();
      await gang.save();

      // const timeString = formatKidnapTime(remainingTime);
      const embed = embeds.success(
        '🔓 Hostage Released!',
        `**${targetUser.username}** has been released early!\n\n`
      );

      // Try to notify the released hostage
      // try {
      //   await targetUser.send(
      //     `**You have been released!**\n\n` +
      //     `**${gang.name}** has released you early in exchange for a ransom of ${economy.formatMoney(ransomAmount)}.\n\n` +
      //     `You are now free and back at your base.`
      //   );
      // } catch (error) {
      //   // DM failed, they'll see it in the channel
      // }

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Release command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing the release.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};
