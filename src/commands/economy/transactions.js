const Transaction = require('../../models/Transaction');
const embeds = require('../../utils/embeds');
const economy = require('../../utils/economy');

module.exports = {
  name: 'transactions',
  aliases: ['history', 'txn'],
  description: 'View your transaction history',
  async execute(message, args) {
    try {
      const userId = message.author.id;
      const limit = parseInt(args[0]) || 10;
      
      if (limit > 50) {
        const errorEmbed = embeds.error(
          'Invalid Limit',
          'Maximum 50 transactions can be displayed at once.'
        );
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Get user's transactions
      const transactions = await Transaction.find({
        $or: [
          { from: userId },
          { to: userId }
        ]
      })
      .sort({ date: -1 })
      .limit(limit);

      if (transactions.length === 0) {
        const noTransactionsEmbed = embeds.info(
          'Transaction History',
          'You have no transaction history yet.'
        );
        return message.channel.send({ embeds: [noTransactionsEmbed] });
      }

      const historyEmbed = embeds.info(
        'Transaction History',
        `Your last ${transactions.length} transactions:`
      );

      transactions.forEach((txn, index) => {
        const isIncoming = txn.to === userId;
        const isOutgoing = txn.from === userId;
        const isInternal = txn.from === userId && txn.to === userId; // put/take
        
        let direction = '';
        let description = txn.description || '';
        
        if (isInternal) {
          direction = txn.type === 'put' ? '' : '';
        } else if (isIncoming) {
          direction = '';
        } else if (isOutgoing) {
          direction = '';
        }

        const typeEmoji = {
          work: '💼',
          luck: '🎰',
          transfer: '💸',
          admin: '👑',
          deposit: '🏦',
          withdraw: '🏦'
        };

        const emoji = typeEmoji[txn.type] || '💰';
        const amount = economy.formatMoney(txn.amount);
        const date = txn.date.toLocaleDateString();
        const time = txn.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        historyEmbed.addFields({
          name: `${direction} ${emoji} ${txn.type.toUpperCase()}`,
          value: `**${amount} coins**\n${description}\n${date} at ${time}`,
          inline: true
        });
      });

      historyEmbed.setFooter({ 
        text: `Use transactions <number> to see more (max 50)` 
      });

      message.channel.send({ embeds: [historyEmbed] });
    } catch (error) {
      console.error('Transaction history error:', error);
      const errorEmbed = embeds.error(
        'Error',
        'Failed to retrieve transaction history. Please try again.'
      );
      message.channel.send({ embeds: [errorEmbed] });
    }
  }
};



