const embeds = require('../../utils/embeds');

module.exports = {
  name: 'slotshelp',
  description: 'Learn how to play slots and view payout information',
  async execute(msg) {
    const slotsHelpEmbed = embeds.info(
      'Slots Help',
      '> Spin the reels and match symbols to win big!\n\n' +
      '**How to Play:**\n' +
      'Use `.slots <amount>` to place your bet and spin the reels.\n' +
      'Match 3 symbols in a row for the jackpot, or 2 symbols for smaller wins!\n\n'
    )
    .addFields(
      {
        name: '💰 **Jackpot Payouts** (3 Matching Symbols)',
        value: 
          '🍒🍒🍒 = **3x** your bet\n' +
          '🍊🍊🍊 = **6x** your bet\n' +
          '🍋🍋🍋 = **10x** your bet\n' +
          '🍇🍇🍇 = **20x** your bet\n' +
          '⭐⭐⭐ = **50x** your bet\n' +
          '💎💎💎 = **100x** your bet\n' +
          '7️⃣7️⃣7️⃣ = **250x** your bet 🔥',
        inline: true
      },
      {
        name: '🎯 **Partial Wins** (2 Matching Symbols)',
        value: 
          '🍒🍒 = **1.0x** your bet\n' +
          '🍊🍊 = **1.3x** your bet\n' +
          '🍋🍋 = **1.6x** your bet\n' +
          '🍇🍇 = **2.0x** your bet\n' +
          '⭐⭐ = **2.8x** your bet\n' +
          '💎💎 = **3.2x** your bet\n' +
          '7️⃣7️⃣ = **4.0x** your bet',
        inline: true
      },
      // {
      //   name: '📋 **Game Rules**',
      //   value: 
      //     '• Minimum bet: 1 coin\n' +
      //     '• No maximum bet limit\n' +
      //     '• 3 matching symbols = Jackpot\n' +
      //     '• 2 matching symbols = Partial win\n' +
      //     '• No matches = You lose your bet\n' +
      //     '• All wins are added to your pocket',
      //   inline: false
      // },
      // {
      //   name: '💡 **Tips & Strategy**',
      //   value: 
      //     '🎯 **Best Jackpot:** 7️⃣7️⃣7️⃣ pays 777x your bet!\n' +
      //     '💎 **High Value:** Diamond and star symbols pay well\n' +
      //     '🍒 **Safe Play:** Cherry symbols have lower payouts but appear more often\n' +
      //     '⚠️ **Risk Management:** Start with smaller bets to learn the game\n' +
      //     '🎰 **Random Results:** Each spin is completely random - no patterns!',
      //   inline: false
      // },
      // {
      //   name: '🎮 **Examples**',
      //   value: 
      //     '`.slots 100` - Bet 100 coins\n' +
      //     '`.slots 1000` - Bet 1,000 coins\n' +
      //     '`.slots 50` - Bet 50 coins\n\n' +
      //     '**Example Win:** Bet 100 coins, get 💎💎💎 = Win 10,000 coins!',
      //   inline: false
      // }
    );
    // .setFooter({ 
    //   text: 'Good luck and luck responsibly! • Use .casinostats to track your performance' 
    // });

    msg.channel.send({ embeds: [slotsHelpEmbed] });
  }
};