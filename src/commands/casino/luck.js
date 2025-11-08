const economy = require('../../utils/economy');
const embeds = require('../../utils/embeds');
const Transaction = require('../../models/Transaction');
const CasinoLog = require('../../models/CasinoLog');

// luck machines with their odds and multipliers
const MACHINES = {
  a: { winChance: 45, multiplier: 1.15, name: 'Machine A' },
  b: { winChance: 33, multiplier: 2.0, name: 'Machine B' },
  c: { winChance: 20, multiplier: 4.0, name: 'Machine C' },
  d: { winChance: 10, multiplier: 8.5, name: 'Machine D' },
  e: { winChance: 5, multiplier: 18.0, name: 'Machine E' },
  f: { winChance: 1, multiplier: 98.0, name: 'Machine F' }
};

module.exports = {
  name: 'lucky',
  description: 'Test your luck on luck machines',
  async execute(msg, args) {
    if (!args[0] || !args[1]) {
      const helpEmbed = embeds.info(
        'Lucky Help',
        'In order to luck, you must use this format:\n' +
        '**`.lucky <machine> <bet>`**\n\n' +
        'You must choose one of the available 6 machines, which are:\n\n' +
        '**a**, which has a **45%** of winning **1.15x** of your bet. *Ex: .lucky a 100*\n' +
        '**b**, which has a **33%** of winning **2x** of your bet. *Ex: .lucky b 100*\n' +
        '**c**, which has a **20%** of winning **4x** of your bet. *Ex: .lucky c 100*\n' +
        '**d**, which has a **10%** of winning **8.5x** of your bet. *Ex: .lucky d 100*\n' +
        '**e**, which has a **5%** of winning **18x** of your bet. *Ex: .lucky e 100*\n' +
        '**f**, which has a **1%** of winning **98x** of your bet. *Ex: .lucky f 100*'
      );
      return msg.channel.send({ embeds: [helpEmbed] });
    }

    const machine = args[0].toLowerCase();
    const bet = parseInt(args[1]);

    // Validate machine
    if (!MACHINES[machine]) {
      const errorEmbed = embeds.error(
        'Invalid Machine',
        'Please choose a valid machine: **a**, **b**, **c**, **d**, **e**, or **f**\n\nUse `.luck` without arguments for help.'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // Validate bet amount
    if (isNaN(bet) || bet <= 0) {
      const errorEmbed = embeds.error(
        'Invalid Bet',
        'Please enter a valid positive bet amount.\n\nExample: `.luck a 100`'
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }


    // Check user balance
    const user = await economy.getUser(msg.author.id);
    if (user.pocket < bet) {
      const errorEmbed = embeds.error(
        'Insufficient Funds',
        `You only have ${economy.formatMoney(user.pocket)} coins in your pocket`
      );
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // Determine if user wins
    const selectedMachine = MACHINES[machine];
    const randomNumber = Math.random() * 100;
    const isWin = randomNumber < selectedMachine.winChance;

    let updatedUser;
    let payout = 0;

    if (isWin) {
      payout = Math.floor(bet * selectedMachine.multiplier);
      const profit = payout - bet;
      updatedUser = await economy.addMoney(msg.author.id, profit, 'luck');
    } else {
      updatedUser = await economy.removeMoney(msg.author.id, bet, 'luck');
    }

    // Log transaction
    const transaction = new Transaction({
      from: isWin ? null : msg.author.id,
      to: isWin ? msg.author.id : null,
      amount: isWin ? payout - bet : bet,
      type: 'luck',
      description: `Luck ${machine.toUpperCase()}: ${isWin ? 'Won' : 'Lost'} ${bet} coins`
    });
    await transaction.save();

    // Log casino activity
    const casinoLog = new CasinoLog({
      userId: msg.author.id,
      game: 'luck',
      betAmount: bet,
      result: isWin ? 'win' : 'lose',
      payout: isWin ? payout : 0
    });
    await casinoLog.save();

    // Create result embed
    if (isWin) {
      const profit = payout - bet;
      const resultEmbed = embeds.success(
        ` `,`You Won **${economy.formatMoney(payout)}** coins!`
        // `**Machine:** ${machine.toUpperCase()} (${selectedMachine.winChance}% chance, ${selectedMachine.multiplier}x multiplier)\n` +
        // `**Bet:** ${economy.formatMoney(bet)} coins\n` +
        // `**Payout:** ${economy.formatMoney(payout)} coins\n` +
        // `**Profit:** ${economy.formatMoney(profit)} coins\n\n` +
        // `**New Balance:** ${economy.formatMoney(updatedUser.pocket)} coins`
      );
      return msg.channel.send({ embeds: [resultEmbed] });
    } else {
      const resultEmbed = embeds.error(
        ` `, `You lost. Better luck next time.`
      );
      return msg.channel.send({ embeds: [resultEmbed] });
    }
  }
};