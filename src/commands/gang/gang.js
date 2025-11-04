const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const { getBaseName, getWallName } = require('../../utils/gangUpgrades');
const gangs = require('../../utils/gangs');

module.exports = {
  name: 'gang',
  description: 'View gang info by name or user mention',
  async execute(message, args) {
    try {
      let targetGang = null;

      // If no arguments, show user's own gang
      if (!args[0]) {
        const userData = await User.findOne({ userId: message.author.id });
        if (!userData || !userData.gang) {
          const errorEmbed = embeds.error('No Gang', 'You are not in a gang.\n\nUsage: `.gang <name>` or `.gang <@user>` to view other gangs');
          return message.channel.send({ embeds: [errorEmbed] });
        }
        targetGang = await Gang.findById(userData.gang);

        if (!targetGang) {
          const errorEmbed = embeds.error('Gang Error', 'Your gang data not found');
          return message.channel.send({ embeds: [errorEmbed] });
        }

        return await handleGangInfo(targetGang, message, true); // true indicates it's user's own gang
      }

      // Check if it's a user mention
      const mentionedUser = message.mentions.users.first();
      if (mentionedUser) {
        const userData = await User.findOne({ userId: mentionedUser.id });
        if (!userData || !userData.gang) {
          const errorEmbed = embeds.error('No Gang', `${mentionedUser.username} is not in a gang`);
          return message.channel.send({ embeds: [errorEmbed] });
        }
        targetGang = await Gang.findById(userData.gang);
      } else {
        // Search by gang name
        const gangName = args.join(' ');
        targetGang = await Gang.findOne({
          name: { $regex: new RegExp(`^${gangName}$`, 'i') }
        });

        if (!targetGang) {
          const errorEmbed = embeds.error('Gang Not Found', `No gang found with name: **${gangName}**`);
          return message.channel.send({ embeds: [errorEmbed] });
        }
      }

      if (!targetGang) {
        const errorEmbed = embeds.error('Gang Error', 'Gang not found');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      return await handleGangInfo(targetGang, message);

    } catch (error) {
      console.error('Gang command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing your gang command. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};

// Gang Info Command
async function handleGangInfo(gang, message, isOwnGang = false) {
  try {
    const leader = await message.client.users.fetch(gang.leaderId).catch(() => null);
    const memberCount = gang.members.length;

    // Get army counts
    const guards = gang.army?.guards || 0;
    const medics = gang.army?.medics || 0;

    // Get upgrade levels (default to 1 if not set)
    const wallLevel = gang.upgrades?.walls || 1;
    const weaponsLevel = gang.upgrades?.weapons || 1;

    const title = isOwnGang ? `${gang.name} - Your Gang` : `${gang.name} Gang Info`;

    const vaultLimit = gangs.getVaultLimit(gang.level);

    // Get all member info
    let membersText = '';

    // Add leader first
    try {
      const leader = await message.client.users.fetch(gang.leaderId);
      membersText += `Owner - @${leader.username}\n`;
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
    let membercnt = 1; // Start from 1 since we already have the owner
    for (const memberId of gang.members) {
      if (memberId !== gang.leaderId && !gang.officers.includes(memberId)) {
        try {
          const member = await message.client.users.fetch(memberId);
          membersText += `Member ${membercnt} - @${member.username}\n`;
          membercnt++;
        } catch (error) {
          membersText += `Member ${membercnt} - Unknown\n`;
          membercnt++;
        }
      }
    }

    const maxHP = getBaseStats(gang.base.level);

    const embed = embeds.info(
      title,
      `Gang information and statistics`
    ).addFields(
      { name: '**Base**', value: `${getBaseName(gang.base.level)} (lvl ${gang.base.level})`, inline: true },
      { name: '**Walls**', value: `${getWallName(wallLevel)} (lvl ${wallLevel})`, inline: true },
      { name: '**Weapons**', value: `Level ${weaponsLevel}`, inline: true },
      { name: '**Guards**', value: `${guards}/4`, inline: true },
      { name: '**Medics**', value: `${medics}/4`, inline: true },
      { name: '**HP**', value: `${gang.base.hp}/${maxHP.maxHP}`, inline: true },
      { name: '**Members**', value: `${memberCount}/${gang.maxMembers}`, inline: true },
      { name: '**Safe**', value: `${economy.formatMoney(gang.vault)}/${economy.formatMoney(vaultLimit)} coins`, inline: true },
      { name: '**Raid Record**', value: `${gang.wins}W - ${gang.losses}L`, inline: true },
      { name: '**Members**', value: `${membersText}\n`, inline: true }
    );

    if (leader) {
      embed.setThumbnail(leader.displayAvatarURL({ dynamic: true }));
    }

    // Add additional info for own gang
    // if (isOwnGang) {
    //   embed.setFooter({
    //     text: '.base ' + '.army ' + '.upgrade ' + '.helpgang '
    //   });
    // }

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleGangInfo:', error);
    const errorEmbed = embeds.error('Display Error', 'Failed to display gang information');
    return message.channel.send({ embeds: [errorEmbed] });
  }
}

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