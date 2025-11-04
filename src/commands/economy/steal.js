const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const { isUserKidnapped } = require('../../utils/kidnapping');

module.exports = {
  name: 'steal',
  description: 'Attempt to steal money from another user',
  async execute(message, args) {
    try {
      // Check if user is kidnapped
      if (await isUserKidnapped(message.author.id)) {
        const errorEmbed = embeds.error('Kidnapped', 'You are kidnapped and cannot steal from other users');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user mentioned someone
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        const errorEmbed = embeds.error('Invalid User', 'Please mention a user to steal from\nUsage: `.steal <@user>`');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if user is trying to steal from themselves
      if (targetUser.id === message.author.id) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot steal from yourself');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check if target is a bot
      if (targetUser.bot) {
        const errorEmbed = embeds.error('Invalid Target', 'You cannot steal from bots');
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get thief's data
      const thief = await economy.getUser(message.author.id);
      
      // Check if user has sent enough messages
      if (thief.messageCount < 20) {
        const errorEmbed = embeds.error('Not Enough Activity', `You need to send at least 20 messages before you can steal You have sent ${thief.messageCount} messages.`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Check cooldown (20 messages since last steal)
      const messagesSinceLastSteal = thief.messageCount - (thief.lastStealMessages || 0);
      if (messagesSinceLastSteal < 20) {
        const messagesNeeded = 20 - messagesSinceLastSteal;
        const errorEmbed = embeds.error('Steal Cooldown', `You need to send ${messagesNeeded} more messages before you can steal again`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get target's data
      const target = await economy.getUser(targetUser.id);
      
      // Check if target has money to steal
      if (target.pocket <= 0) {
        const errorEmbed = embeds.error('No Money', `${targetUser.username} has no money in their pocket to steal`);
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Calculate steal amount (30-115 coins, but not more than target has)
      const maxSteal = Math.min(115, target.pocket);
      const minSteal = Math.min(30, target.pocket);
      const stealAmount = Math.floor(Math.random() * (maxSteal - minSteal + 1)) + minSteal;

      // 50% chance of getting caught
      const caught = Math.random() < 0.5;

      // Update last steal message count
      thief.lastStealMessages = thief.messageCount;
      await thief.save();

      if (caught) {
        // User got caught - loses money (safe first, then pocket)
        const totalMoney = thief.bank + thief.pocket;
        let penalty = Math.min(100, totalMoney); // Can't lose more than they have
        let penaltyFromSafe = 0;
        let penaltyFromPocket = 0;
        let penaltyMessage = '';

        if (penalty === 0) {
          penaltyMessage = 'You got caught stealing but had no money to lose';
        } else if (thief.bank >= penalty) {
          // Take all penalty from safe
          penaltyFromSafe = penalty;
          thief.bank -= penalty;
          penaltyMessage = `You were fined **${economy.formatMoney(penalty)} coins** from your safe as punishment`;
        } else if (thief.bank > 0) {
          // Take what we can from safe, rest from pocket
          penaltyFromSafe = thief.bank;
          penaltyFromPocket = penalty - thief.bank;
          thief.bank = 0;
          thief.pocket -= penaltyFromPocket;
          penaltyMessage = `You were fined **${economy.formatMoney(penaltyFromSafe)} coins** from your safe and **${economy.formatMoney(penaltyFromPocket)} coins** from your pocket as punishment`;
        } else {
          // Take all from pocket
          penaltyFromPocket = penalty;
          thief.pocket -= penalty;
          penaltyMessage = `You were fined **${economy.formatMoney(penalty)} coins** from your pocket as punishment`;
        }
        
        await thief.save();

        // Log the failed steal transaction
        const transaction = new Transaction({
          from: message.author.id,
          to: null,
          amount: penalty,
          type: 'steal_caught',
          description: `Caught stealing from ${targetUser.username}, lost ${penalty} coins (${penaltyFromSafe} from safe, ${penaltyFromPocket} from pocket)`
        });
        await transaction.save();

        message.channel.send(`**You got caught** stealing and ${penaltyMessage}.`);
        
        // Notify the target
        try {
          // await targetUser.send(`**${message.author.username}** tried to steal from you but got caught`).catch(() => {
            // message.channel.send(`${targetUser}, someone tried to steal from you but got caught`);
          // });
        } catch (error) { 
          console.log('Could not send steal notification:', error.message);
        }

      } else {
        // Successful steal
        thief.pocket += stealAmount;
        target.pocket -= stealAmount;
        
        await thief.save();
        await target.save();

        // Log the successful steal transaction
        const transaction = new Transaction({
          from: targetUser.id,
          to: message.author.id,
          amount: stealAmount,
          type: 'steal_success',
          description: `Successfully stole ${stealAmount} coins from ${targetUser.username}`
        });
        await transaction.save();

        message.channel.send(`**Steal successful** You stole **${economy.formatMoney(stealAmount)} coins** from ${targetUser.username}.`);
        
        // Notify the target
        try {
          // await targetUser.send(`💸 You were robbed Someone stole **${economy.formatMoney(stealAmount)} coins** from your pocket`).catch(() => {
            // message.channel.send(`${targetUser}, you were robbed and lost **${economy.formatMoney(stealAmount)} coins**`);
          // });
        } catch (error) {
          console.log('Could not send steal notification:', error.message);
        }
      }

    } catch (error) {
      console.error('Steal command error:', error);
      const errorEmbed = embeds.error('Command Error', 'An error occurred while processing your steal attempt. Please try again.');
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};


