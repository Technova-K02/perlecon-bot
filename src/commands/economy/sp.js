const User = require('../../models/User');
const economy = require('../../utils/economy');

module.exports = {
    name: 'ssfadf',
    description: 'Check your safe balance',
    async execute(msg) {
        const user = await User.findOne({ userId: msg.author.id });
        if (!user) return msg.channel.send('❌ You have no account yet. Use `.work` to start.');
        msg.channel.send(`You have **${economy.formatMoney(user.bank)}** coins in your safe.`);
    }
};