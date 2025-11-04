const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'grant',
  description: 'Grant money to a user (Admin only)',
  async execute(message, args) {
    // Simple admin check - in production, you'd want proper role checking
    if (message.author.id !== process.env.OWNER_ID) {
      const errorEmbed = embeds.error('Permission Denied', 'Only the bot owner can use this command.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    if (args.length < 2) {
      const errorEmbed = embeds.error('Invalid Usage', 'Usage: `.grant <amount> <@user>`');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      const errorEmbed = embeds.error('Invalid Amount', 'Please enter a valid positive number.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      const errorEmbed = embeds.error('Invalid User', 'Please mention a valid user.');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    if (amount < 30) {
      const errorEmbed = embeds.error('Amount Too Small', 'Minimum grant amount is 30 coins');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    try {
      const updatedUser = await economy.addMoney(targetUser.id, amount, 'admin');
      
      message.channel.send(`💰 Successfully granted **${economy.formatMoney(amount)} coins** to ${targetUser.username}`);

      // Notify the recipient
      try {
        // await targetUser.send(`💰 An admin granted you **${economy.formatMoney(amount)} coins**`);
      } catch (error) {
        // User might have DMs disabled, that's okay
        console.log('Could not DM user about money received');
      }
    } catch (error) {
      console.error('Give command error:', error);
      const errorEmbed = embeds.error('Transaction Failed', 'Failed to grant money. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



