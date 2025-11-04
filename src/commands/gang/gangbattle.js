const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../config/config');
const gangs = require('../../utils/gangs');

module.exports = {
  name: 'battlegang',
  aliases: ['gbattle', 'gangwar'],
  description: 'Challenge another gang to battle',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (gang.leaderId !== message.author.id) {
        const errorEmbed = embeds.error('Permission Denied', 'Only the gang leader can start battles');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check cooldown
      const lastBattle = await cooldowns.getCooldown(gang._id.toString(), 'gangbattle');
      if (lastBattle) {
        const timeLeft = lastBattle - Date.now();
        const errorEmbed = embeds.error('Battle Cooldown', `Your gang must wait ${cooldowns.formatTime(timeLeft)} before the next battle`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const targetGangName = args.join(' ');
      if (!targetGangName) {
        const errorEmbed = embeds.error('Invalid Target', 'Please specify a gang name to battle');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const targetGang = await Gang.findOne({ name: { $regex: new RegExp(targetGangName, 'i') } });
      if (!targetGang) {
        const errorEmbed = embeds.error('Gang Not Found', 'No gang found with that name');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      if (targetGang._id.toString() === gang._id.toString()) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot battle your own gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate battle outcome based on power and some randomness
      const attackerPower = gang.power + Math.floor(Math.random() * 50);
      const defenderPower = targetGang.power + Math.floor(Math.random() * 50);
      
      const victory = attackerPower > defenderPower;
      const powerDifference = Math.abs(attackerPower - defenderPower);
      const reward = Math.floor(powerDifference * 10) + 100;

      if (victory) {
        // Attacker wins
        const vaultLimit = gangs.getVaultLimit(gang.level);
        const actualReward = Math.min(reward, vaultLimit - gang.vault);
        
        gang.wins += 1;
        gang.power += Math.floor(reward / 10);
        gang.vault += actualReward;
        // gang.experience += Math.floor(reward / 5); // Award experience
        gang.totalEarnings += reward;
        gang.totalBattles += 1;
        gang.lastBattleTime = new Date();
        
        targetGang.losses += 1;
        targetGang.power = Math.max(0, targetGang.power - Math.floor(reward / 20));
        targetGang.vault = Math.max(0, targetGang.vault - reward);
        targetGang.totalBattles += 1;
        targetGang.lastBattleTime = new Date();

        const embed = embeds.success(
          'Victory',
          `**${gang.name}** defeated **${targetGang.name}**\n\n` +
          `**Battle Results:**\n` +
          // `Power gained: +${Math.floor(reward / 10)}\n` +
          `Coins stolen: ${reward}\n` +
          `Experience gained: +${Math.floor(reward / 5)}\n` +
          // `Your power: ${gang.power}\n` +
          `W/L Record: ${gang.wins}/${gang.losses}`
        );
        message.channel.send({ embeds: [embed] });
      } else {
        // Attacker loses
        gang.losses += 1;
        gang.power = Math.max(0, gang.power - Math.floor(reward / 20));
        gang.vault = Math.max(0, gang.vault - reward);
        gang.totalBattles += 1;
        gang.lastBattleTime = new Date();
        
        const targetVaultLimit = gangs.getVaultLimit(targetGang.level);
        const targetActualReward = Math.min(reward, targetVaultLimit - targetGang.vault);
        
        targetGang.wins += 1;
        targetGang.power += Math.floor(reward / 10);
        targetGang.vault += targetActualReward;
        // targetGang.experience += Math.floor(reward / 5);
        targetGang.totalEarnings += reward;
        targetGang.totalBattles += 1;
        targetGang.lastBattleTime = new Date();

        const embed = embeds.error(
          'Defeat',
          `**${gang.name}** was defeated by **${targetGang.name}**\n\n` +
          `**Battle Results:**\n` +
          // `Power lost: -${Math.floor(reward / 20)}\n` +
          `Coins lost: ${reward}\n` +
          // `Your power: ${gang.power}\n` +
          `W/L Record: ${gang.wins}/${gang.losses}`
        );
        message.channel.send({ embeds: [embed] });
      }

      await gang.save();
      await targetGang.save();
      
      // Set cooldown
      await cooldowns.setCooldown(gang._id.toString(), 'gangbattle', config.gangs.battleCooldown);

    } catch (error) {
      console.error('Gang battle error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred during the battle.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





