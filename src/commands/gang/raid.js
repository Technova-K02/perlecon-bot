const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const { isUserKidnapped } = require('../../utils/kidnapping');
const { getAllTools } = require('../../utils/gangTools');
const { isGangOnRaidCooldown, getRaidCooldownRemaining, calculateSuccessRate } = require('../../utils/combatUtils');
const { getWeaponDamageBonus, getWeaponSuccessBonus, getWallDefenseBonus } = require('../../utils/gangUpgrades');

// Base progression table for damage calculation
function getBaseStats(level) {
  const baseData = {
    1: { name: 'Trailer', maxHP: 250, safeCapacity: 10000, maxGuards: 4, maxMedics: 2 },
    2: { name: 'Cabin', maxHP: 500, safeCapacity: 20000, maxGuards: 6, maxMedics: 3 },
    3: { name: 'Warehouse', maxHP: 900, safeCapacity: 35000, maxGuards: 8, maxMedics: 4 },
    4: { name: 'Bunker', maxHP: 1400, safeCapacity: 55000, maxGuards: 10, maxMedics: 5 },
    5: { name: 'Compound', maxHP: 2000, safeCapacity: 80000, maxGuards: 12, maxMedics: 6 },
    6: { name: 'Fortress', maxHP: 2800, safeCapacity: 110000, maxGuards: 14, maxMedics: 7 },
    7: { name: 'Citadel', maxHP: 3800, safeCapacity: 150000, maxGuards: 16, maxMedics: 8 },
    8: { name: 'Kingdom', maxHP: 5000, safeCapacity: 200000, maxGuards: 18, maxMedics: 9 }
  };
  return baseData[level] || baseData[1];
}

module.exports = {
  name: 'raid',
  aliases: ['raidgang'],
  description: 'Raid another gang\'s base to deal damage and steal coins (2 minute cooldown, leaders only)',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      const { getKidnapErrorEmbed } = require('../../utils/kidnapping');
      const kidnapError = await getKidnapErrorEmbed(message.author.id, 'raid other gangs');
      if (kidnapError) {
        return message.channel.send({ embeds: [kidnapError] });
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

      // Check if user is gang leader
      // if (attackerGang.leaderId !== message.author.id) {
      //   const errorEmbed = embeds.error('Permission Denied', 'Only gang leaders can initiate raids');
      //   return message.channel.send({ embeds: [errorEmbed] });
      // }

      // Check raid cooldown (2 minute)
      if (isGangOnRaidCooldown(attackerGang)) {
        const remaining = getRaidCooldownRemaining(attackerGang);
        const errorEmbed = embeds.error('Raid Cooldown', `Your gang must wait ${remaining} seconds before raiding again`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (!args[0]) {
        const errorEmbed = embeds.error('Missing Target', 'Please specify a gang to raid\nUsage: `.raid <gangname>`');
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

      // Can't raid own gang
      if (targetGang._id.equals(attackerGang._id)) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot raid your own gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate success rate using upgrade bonuses
      const weaponLevel = attackerGang.upgrades?.weapons || 1;
      const targetWallLevel = targetGang.upgrades?.walls || 1;

      let toolBonus = 0;
      // Add tool bonuses (breach charges)
      if (attackerGang.tools.breachCharge > 0) {
        toolBonus = 30; // +30% from breach charge
        // Consume one breach charge
        attackerGang.tools.breachCharge -= 1;
      }

      const weaponSuccessBonus = getWeaponSuccessBonus(weaponLevel);
      const wallDefenseBonus = getWallDefenseBonus(targetWallLevel);

      const successRate = calculateSuccessRate(50, {
        weaponLevels: 0, // Using upgrade system instead
        toolBonus: toolBonus + weaponSuccessBonus,
        defenses: wallDefenseBonus // Wall defense bonus
      });

      // Roll for success
      const roll = Math.random() * 100;
      const success = roll < successRate;

      // Update raid cooldown
      attackerGang.lastRaidTime = new Date();
      await attackerGang.save();

      if (success) {
        // Calculate damage with random range
        const targetBaseStats = getBaseStats(targetGang.base.level);
        const minDamage = Math.floor(targetBaseStats.maxHP * 0.05); // 5% of max HP
        const maxDamage = Math.floor(targetBaseStats.maxHP * 0.15); // 15% of max HP
        let baseDamage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

        // Add weapon upgrade damage bonus
        const weaponDamageBonus = getWeaponDamageBonus(weaponLevel);
        baseDamage += Math.floor(baseDamage * (weaponDamageBonus / 100));

        // Add breach charge bonus damage (+100)
        if (toolBonus >= 30) { // We used a breach charge
          baseDamage += 100;
        }

        // Apply damage to target base
        const currentHP = targetGang.base.hp || targetBaseStats.maxHP;
        const newHP = Math.max(0, currentHP - baseDamage);
        targetGang.base.hp = newHP;

        // Check if gang is destroyed (HP = 0)
        const gangDestroyed = newHP === 0;
        let coinsStolen = 0;

        if (gangDestroyed) {
          // Gang destroyed - take ALL remaining vault money
          coinsStolen = targetGang.vault;

          // Get attacker gang vault limit
          const attackerBaseLevel = attackerGang.base?.level || 1;
          const attackerVaultLimit = getBaseStats(attackerBaseLevel).safeCapacity;

          // Transfer all money (up to vault limit)
          const maxCanReceive = attackerVaultLimit - attackerGang.vault;
          const actualCoinsStolen = Math.min(coinsStolen, maxCanReceive);

          attackerGang.vault = Math.min(attackerVaultLimit, attackerGang.vault + actualCoinsStolen);

          // Remove all members from the gang
          const targetMembers = [...targetGang.members];
          for (const memberId of targetMembers) {
            await User.findOneAndUpdate(
              { userId: memberId },
              { gang: null, status: 'outside' }
            );
          }

          // Delete the gang completely
          await Gang.findByIdAndDelete(targetGang._id);

          // Update attacker stats
          attackerGang.raids += 1;
          attackerGang.wins += 1;
          attackerGang.power += 25; // Bonus power for destroying a gang
          await attackerGang.save();

          const embed = embeds.success(
            '💥 GANG DESTROYED!',
            `**${attackerGang.name}** has completely destroyed **${targetGang.name}**\n\n`
          );

          return message.channel.send({ embeds: [embed] });

        } else {
          // Normal raid - steal 5-15% of vault
          const stealPercentage = Math.random() * 0.1 + 0.05; // 5-15%
          coinsStolen = Math.floor(targetGang.vault * stealPercentage);

          if (coinsStolen > 0) {
            // Get attacker gang vault limit
            const attackerBaseLevel = attackerGang.base?.level || 1;
            const attackerVaultLimit = getBaseStats(attackerBaseLevel).safeCapacity;

            // Ensure attacker's vault doesn't exceed limit
            const maxCanReceive = attackerVaultLimit - attackerGang.vault;
            const actualCoinsStolen = Math.min(coinsStolen, maxCanReceive);

            targetGang.vault = Math.max(0, targetGang.vault - actualCoinsStolen);
            attackerGang.vault = Math.min(attackerVaultLimit, attackerGang.vault + actualCoinsStolen);
          }

          // Update gang stats
          attackerGang.raids += 1;
          attackerGang.wins += 1;
          attackerGang.power += 10;

          targetGang.losses += 1;
          if (targetGang.power > 5) targetGang.power -= 5;

          await targetGang.save();
          await attackerGang.save();

          const embed = embeds.success(
            '⚔️ Raid Successful!',
            `**${attackerGang.name}** successfully raided **${targetGang.name}**!\n\n` +
            `**Damage Dealt:** ${baseDamage} HP\n` +
            `**Target Base HP:** ${newHP}/${targetBaseStats.maxHP}\n` +
            `**Coins Stolen:** ${economy.formatMoney(coinsStolen)}\n` +
            `**Success Rate:** ${successRate.toFixed(1)}%\n`
            // `**Your Gang Safe:** ${economy.formatMoney(attackerGang.vault)} coins\n` +
            // `**Power Gained:** +10 (Total: ${attackerGang.power})`
          );

          return message.channel.send({ embeds: [embed] });
        }

      } else {
        // Raid failed
        attackerGang.losses += 1;
        if (attackerGang.power > 3) attackerGang.power -= 3;

        targetGang.wins += 1;
        targetGang.power += 5;

        await attackerGang.save();
        await targetGang.save();

        const embed = embeds.error(
          'Raid Failed!',
          `**${attackerGang.name}** failed to raid **${targetGang.name}**!\n\n` +
          `**Success Rate:** ${successRate.toFixed(1)}%\n`
          // `**Roll:** ${roll.toFixed(1)}%\n\n`
          // `**Power Lost:** -3 (Total: ${attackerGang.power})\n` +
          // `**Target Power Gained:** +5`
        );

        return message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Raid command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing the raid.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};