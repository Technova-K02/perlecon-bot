const Gang = require('../../models/Gang');
const User = require('../../models/User');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');
const gangs = require('../../utils/gangs');
const { getBaseName, getWallName } = require('../../utils/gangUpgrades');
const { formatUsernameWithStyle } = require('../../utils/styles');

// Base progression table
function getBaseStats(level) {
  const baseData = {
    1: { name: 'Trailer', maxHP: 250, safeCapacity: 10000, maxGuards: 4, maxMedics: 2, upgradeCost: 0 },
    2: { name: 'Cabin', maxHP: 500, safeCapacity: 20000, maxGuards: 6, maxMedics: 3, upgradeCost: 10000 },
    3: { name: 'Warehouse', maxHP: 900, safeCapacity: 35000, maxGuards: 8, maxMedics: 4, upgradeCost: 20000 },
    4: { name: 'Bunker', maxHP: 1400, safeCapacity: 55000, maxGuards: 10, maxMedics: 5, upgradeCost: 35000 },
    5: { name: 'Compound', maxHP: 2000, safeCapacity: 80000, maxGuards: 12, maxMedics: 6, upgradeCost: 55000 },
    6: { name: 'Fortress', maxHP: 2800, safeCapacity: 110000, maxGuards: 14, maxMedics: 7, upgradeCost: 80000 },
    7: { name: 'Citadel', maxHP: 3800, safeCapacity: 150000, maxGuards: 16, maxMedics: 8, upgradeCost: 110000 },
    8: { name: 'Kingdom', maxHP: 5000, safeCapacity: 200000, maxGuards: 18, maxMedics: 9, upgradeCost: 150000 }
  };

  return baseData[level] || baseData[1];
}

module.exports = {
  name: 'infogang',
  aliases: ['vg'],
  description: 'View your gang information',
  async execute(message) {
    try {
      const user = await User.findOne({ userId: message.author.id });

      if ((!user || !user.gang)) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang Use `.makegang <name>` to create one.');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const gang = await Gang.findById(user.gang);
      if (!gang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Ensure all gang objects exist (for older gangs)
      if (!gang.base) {
        gang.base = {
          level: 1,
          guards: 4,
          defenses: 0,
          hp: 250,
          lastRaid: null
        };
      }
      if (!gang.upgrades) {
        gang.upgrades = {
          weapons: 1,
          walls: 1,
          guardsTraining: 1,
          medicTraining: 1
        };
      }
      if (!gang.army) {
        gang.army = {
          guards: 0,
          medics: 0
        };
      }
      if (!gang.tools) {
        gang.tools = {
          basicLockpick: 0,
          steelLockpick: 0,
          titanLockpick: 0,
          breachCharge: 0
        };
      }
      // Save if any initialization was needed
      await gang.save();

      // Get all member info
      let membersText = '';

      // Add leader first
      try {
        const leader = await message.client.users.fetch(gang.leaderId);
        const styledLeaderName = await formatUsernameWithStyle(leader.id, leader.username);
        membersText += `Owner - ${styledLeaderName}\n`;
      } catch (error) {
        membersText += `Owner - Unknown\n`;
      }

      // Add officers
      for (const officerId of gang.officers || []) {
        if (officerId == gang.leaderId) {
          try {
            const officer = await message.client.users.fetch(officerId);
            membersText += `Officer - @${officer.username}\n`;
          } catch (error) {
            membersText += `Officer - Unknown\n`;
          }
        }
      }

      // Add regular members
      let memberCount = 1; // Start from 1 since we already have the owner
      for (const memberId of gang.members) {
        if (memberId !== gang.leaderId && !gang.officers.includes(memberId)) {
          try {
            const member = await message.client.users.fetch(memberId);
            const styledMemberName = await formatUsernameWithStyle(member.id, member.username);
            membersText += `Member ${memberCount} - ${styledMemberName}\n`;
            memberCount++;
          } catch (error) {
            membersText += `Member ${memberCount} - Unknown\n`;
            memberCount++;
          }
        }
      }

      // Get base stats from progression table
      const baseStats = getBaseStats(gang.base.level);
      const baseMaxHealth = baseStats.maxHP;

      // Calculate Safelimit from base stats
      const vaultLimit = baseStats.safeCapacity;

      // Get army counts and upgrade levels
      const guards = gang.army?.guards || 0;
      const medics = gang.army?.medics || 0;
      const wallLevel = gang.upgrades?.walls || 1;
      const weaponsLevel = gang.upgrades?.weapons || 1;

      const embed = embeds.info(
        `${gang.name} Gang`, ' '
      ).addFields(
        { name: '**Base**', value: `${getBaseName(gang.base.level)} (lvl ${gang.base.level})`, inline: true },
        { name: '**Walls**', value: `${getWallName(wallLevel)}(lvl ${wallLevel})`, inline: true },
        { name: '**Weapons**', value: `Level ${weaponsLevel}`, inline: true },
        { name: '**Guards**', value: `${guards}/4`, inline: true },
        { name: '**Medics**', value: `${medics}/4`, inline: true },
        { name: '**HP**', value: `${gang.base.hp}/${maxHP}`, inline: true },
        { name: '**Members**', value: `${memberCount}/${gang.maxMembers}`, inline: true },
        { name: '**Safe**', value: `${economy.formatMoney(gang.vault)}/${economy.formatMoney(vaultLimit)} coins`, inline: true },
        { name: '**Raid Record**', value: `${gang.wins}W - ${gang.losses}L`, inline: true },
        { name: '**Members**', value: `${membersText}\n`, inline: true }
      );

      // Add user's avatar in top right corner
      embed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

      // Add additional fields for more details
      // embed.addFields(
      //   { name: 'Gang Stats', value: `Power: ${gang.power}\nLevel: ${gang.level}\nMembers: ${gang.members.length}/${gang.maxMembers}`, inline: true },
      //   { name: 'Battle Record', value: `Wins: ${gang.wins}\nLosses: ${gang.losses}\nWin Rate: ${gang.wins + gang.losses > 0 ? Math.round((gang.wins / (gang.wins + gang.losses)) * 100) : 0}%`, inline: true },
      //   { name: 'Criminal Stats', value: `Raids: ${gang.raids || 0}\nKidnaps: ${gang.kidnaps || 0}\nRobs: ${gang.robs || 0}`, inline: true }
      // );

      embed.setFooter({ text: `View Gangs` });

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang info error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting gang information.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};






