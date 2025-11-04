const Gang = require('../../models/Gang');
const User = require('../../models/User');
const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const gangs = require('../../utils/gangs');

// Helper function to get user's gang
async function getUserGang(userId) {
  const user = await User.findOne({ userId }).populate('gang');
  return user?.gang || null;
}

// Helper function to check if user can withdraw from gang
async function canWithdrawFromGang(userId, gang) {
  return gang && (gang.leaderId === userId || gang.officers.includes(userId));
}

module.exports = {
  name: 'safegang',
  aliases: ['gvault'],
  description: 'Check Gang Safe balance',
  async execute(message) {
    try {
      const gang = await getUserGang(message.author.id);

      if (!gang) {
        const errorEmbed = embeds.error('No Gang', 'You are not in a gang');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      const canWithdraw = await canWithdrawFromGang(message.author.id, gang);
      const vaultLimit = gangs.getVaultLimit(gang.level);
      const isLeader = gang.leaderId === message.author.id;
      const isOfficer = gang.officers.includes(message.author.id);

      let roleText = '';
      if (isLeader) {
        roleText = 'As the **leader**, you can withdraw from the Safe using `.gangtake <amount>`';
      } else if (isOfficer) {
        roleText = 'As an **officer**, you can withdraw from the Safe using `.gangtake <amount>`';
      } else {
        roleText = 'All members can deposit using `.gangput <amount>`';
      }

      const embed = embeds.info(
        `${gang.name} Safe`,
        `**Safe:** ${economy.formatMoney(gang.vault)}/${economy.formatMoney(vaultLimit)} coins\n`
        // `**Gang Level:** ${gang.level}\n\n` +
        // `${roleText}\n\n` +
        // `*Upgrade your gang level to increase Safe capacity!*`
      );

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Gang Safe error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while checking Gang Safe.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};






