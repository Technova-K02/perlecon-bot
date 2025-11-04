const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const { isUserKidnapped } = require('../../utils/kidnapping');
const { calculateSuccessRate } = require('../../utils/combatUtils');
const { getGuardTrainingBonus } = require('../../utils/gangUpgrades');

module.exports = {
  name: 'rob',
  aliases: ['robgang'],
  description: 'Attempt a smaller safe theft from another gang',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot rob other gangs');
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

      // Check rob cooldown (30 seconds)
      const robCooldown = 30 * 1000; // 30 seconds in milliseconds
      const lastRob = user.cooldowns?.get('rob') || 0;
      if (Date.now() - lastRob < robCooldown) {
        const remaining = Math.ceil((lastRob + robCooldown - Date.now()) / 1000);
        const errorEmbed = embeds.error('Rob Cooldown', `You must wait ${remaining} seconds before robbing again`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!args[0]) {
        const errorEmbed = embeds.error('Missing Target', 'Please specify a gang to rob\nUsage: `.rob <gangname>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Find target gang
      const targetGangName = args.join(' ');
      const targetGang = await Gang.findOne({ 
        name: { $regex: new RegExp(`^${targetGangName}$`, 'i') } 
      });

      if (!targetGang) {
        const errorEmbed = embeds.error('Gang Not Found', `No gang found with name: **${targetGangName}**`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Can't rob own gang
      if (targetGang._id.equals(attackerGang._id)) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot rob your own gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target has money to steal
      if (targetGang.vault <= 0) {
        const errorEmbed = embeds.error('No Money', `${targetGang.name} has no money in their Gang Safe to steal`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Handle lockpick usage and bonuses
      let lockpickUsed = null;
      let lockpickBroken = false;
      let toolBonus = 0;
      
      // Check for lockpicks (use best available)
      if (attackerGang.tools.titanLockpick > 0) {
        toolBonus = 45; // +45% success
        lockpickUsed = 'Titan Lockpick';
        // Titan lockpicks rarely break (5% chance)
        if (Math.random() < 0.05) {
          attackerGang.tools.titanLockpick -= 1;
          lockpickBroken = true;
        }
      } else if (attackerGang.tools.steelLockpick > 0) {
        toolBonus = 25; // +25% success
        lockpickUsed = 'Steel Lockpick';
        // Steel lockpicks barely break (10% chance)
        if (Math.random() < 0.1) {
          attackerGang.tools.steelLockpick -= 1;
          lockpickBroken = true;
        }
      } else if (attackerGang.tools.basicLockpick > 0) {
        toolBonus = 10; // +10% success
        lockpickUsed = 'Basic Lockpick';
        // Basic lockpicks may break (25% chance)
        if (Math.random() < 0.25) {
          attackerGang.tools.basicLockpick -= 1;
          lockpickBroken = true;
        }
      }
      
      // Calculate success rate using new guard system
      const targetGuards = targetGang.army?.guards || 0;
      const targetGuardTraining = targetGang.upgrades?.guardsTraining || 1;
      const guardTrainingBonus = getGuardTrainingBonus(targetGuardTraining);
      
      // Level 1 guards provide 5% protection each, plus training bonus
      const baseGuardProtection = 5;
      const totalGuardProtection = baseGuardProtection + guardTrainingBonus;
      const totalGuardPenalty = targetGuards * totalGuardProtection;
      
      const successRate = calculateSuccessRate(60, {
        toolBonus: toolBonus,
        guards: 0 // Don't use the old guard system
      }) - totalGuardPenalty; // Apply new guard penalty
      
      // Ensure minimum 5% success rate
      const finalSuccessRate = Math.max(5, successRate);

      // Roll for success
      const roll = Math.random() * 100;
      const success = roll < finalSuccessRate;

      // Update rob cooldown
      user.cooldowns.set('rob', Date.now());
      await user.save();

      if (success) {
        // Calculate coins stolen
        let maxSteal = 2000; // Base max steal
        
        // Titan lockpick increases max steal cap by 2000
        if (lockpickUsed === 'Titan Lockpick') {
          maxSteal += 2000;
        }
        
        const minSteal = Math.min(500, targetGang.vault);
        const actualMaxSteal = Math.min(maxSteal, targetGang.vault);
        const coinsStolen = Math.floor(Math.random() * (actualMaxSteal - minSteal + 1)) + minSteal;
        
        // Transfer coins
        targetGang.vault -= coinsStolen;
        attackerGang.vault += coinsStolen;
        
        // Update gang stats
        attackerGang.robs += 1;
        attackerGang.power += 3;
        
        if (targetGang.power > 2) targetGang.power -= 2;
        
        await targetGang.save();
        await attackerGang.save();

        let resultMessage = `**${attackerGang.name}** successfully robbed **${targetGang.name}**!\n\n` +
          `**Coins Stolen:** ${economy.formatMoney(coinsStolen)}\n` +
          `**Success Rate:** ${finalSuccessRate.toFixed(1)}%\n`;
        
        if (lockpickUsed) {
          resultMessage += `**Tool Used:** ${lockpickUsed}\n`;
          if (lockpickBroken) {
            resultMessage += `**${lockpickUsed} broke during the robbery!**\n`;
          }
        }
        
        resultMessage += `\n**Your Gang Safe:** ${economy.formatMoney(attackerGang.vault)} coins\n` +
          `**Power Gained:** +3 (Total: ${attackerGang.power})`;

        const embed = embeds.success('Robbery Successful!', resultMessage);
        return message.channel.send({ embeds: [embed] });

      } else {
        // Rob failed
        if (attackerGang.power > 1) attackerGang.power -= 1;
        targetGang.power += 2;
        
        await attackerGang.save();
        await targetGang.save();

        let resultMessage = `**${attackerGang.name}** failed to rob **${targetGang.name}**!\n\n` +
          `**Success Rate:** ${finalSuccessRate.toFixed(1)}%\n` +
          `**Roll:** ${roll.toFixed(1)}%\n`;
        
        if (lockpickUsed) {
          resultMessage += `**Tool Used:** ${lockpickUsed}\n`;
          if (lockpickBroken) {
            resultMessage += `**${lockpickUsed} broke during the failed attempt!**\n`;
          }
        }
        
        resultMessage += `\n**Power Lost:** -1 (Total: ${attackerGang.power})\n` +
          `**Target Power Gained:** +2`;

        const embed = embeds.error('Robbery Failed!', resultMessage);
        return message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Rob command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing the robbery.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};