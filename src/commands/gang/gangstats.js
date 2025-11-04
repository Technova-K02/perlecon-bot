const User = require('../../models/User');
const Gang = require('../../models/Gang');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'statsgang321312',
  aliases: ['gstats'],
  description: 'View detailed gang statistics',
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

      // Get leader info
      let leaderName = 'Unknown User';
      try {
        const leader = await message.client.users.fetch(gang.leaderId);
        leaderName = leader.username;
      } catch (error) {
        // Keep default name
      }

      // Calculate win rate
      const totalBattles = gang.wins + gang.losses;
      const winRate = totalBattles > 0 ? Math.round((gang.wins / totalBattles) * 100) : 0;

      // Calculate gang rank
      const allGangs = await Gang.find().sort({ power: -1 });
      const gangRank = allGangs.findIndex(g => g._id.toString() === gang._id.toString()) + 1;

      const embed = embeds.info(
        `📊 ${gang.name} Statistics`,
        `Detailed information about your gang`
      );

      embed.addFields(
        { name: '👑 Leader', value: leaderName, inline: true },
        { name: '👥 Members', value: `${gang.members.length}`, inline: true },
        { name: '🏆 Rank', value: `#${gangRank}`, inline: true },
        { name: '💪 Power', value: `${gang.power}`, inline: true },
        { name: '💰 Vault', value: `${economy.formatMoney(gang.vault)}`, inline: true },
        { name: '📈 Win Rate', value: `${winRate}%`, inline: true },
        { name: '⚔️ Battles Won', value: `${gang.wins}`, inline: true },
        { name: '💀 Battles Lost', value: `${gang.losses}`, inline: true },
        { name: '🎯 Total Battles', value: `${totalBattles}`, inline: true }
      );

      embed.setFooter({ text: `Gang created: ${gang.createdAt.toLocaleDateString()}` });

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Gang stats error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while getting gang stats.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};





