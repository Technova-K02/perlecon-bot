const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const { isUserKidnapped } = require('../../utils/kidnapping');
const COOLDOWN = 60 * 60 * 1000; // 1 hour

module.exports = {
  name: 'work',
  description: 'Earn some coins',
  async execute(msg) {
    // Check if user is kidnapped
    if (await isUserKidnapped(msg.author.id)) {
      const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot work');
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const userId = msg.author.id;
    const user = await economy.getUser(userId);

    const now = Date.now();
    const lastWork = user.cooldowns?.get('work') || 0;
    if (now < lastWork + COOLDOWN) {
      const remaining = Math.ceil((lastWork + COOLDOWN - now) / 1000);
      const errorEmbed = embeds.error('Cooldown Active', `You must wait ${Math.floor(remaining / 60)}m ${remaining % 60}s before working again.`);
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const earnings = Math.floor(Math.random() * 300) + 200;

    // Use economy utility to add money with transaction logging
    const updatedUser = await economy.addMoney(userId, earnings, 'work');

    // Update cooldown
    updatedUser.cooldowns.set('work', now);
    await updatedUser.save(); 

    const workMsg = earnings < 200 ? "You were lazy" : earnings < 300 ? "You worked" : "You worked hard";

    msg.channel.send(`${workMsg} and earned **${economy.formatMoney(earnings)}** coins.`);
  }
};



