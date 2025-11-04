# ChillZone Discord Economy Bot

A comprehensive Discord economy bot built with Node.js, Discord.js v14, and MongoDB. Features include economy system, gangs, pets, casino games, and leveling system.

## Features

### 🏦 Economy System
- Work to earn money with cooldowns
- Bank system for secure money storage
- Transaction logging and history
- Balance checking and money transfers

### 🎰 Casino Games
- Coinflip with customizable betting
- Slots, Roulette, and Blackjack (expandable)
- Casino statistics and logging
- House edge configuration

### 👥 Gang System
- Create and join gangs
- Gang Safe for shared resources
- Gang battles and power system
- Leadership and member management

### 🐾 Pet System
- Buy and collect different pet types
- Train pets to increase their stats
- Pet bonuses for luck and power
- Pet leveling system

### 📊 Leveling System
- XP gain from chatting
- Level progression with rewards
- Rank checking and leaderboards
- Progress tracking

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chillzone-discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
- `DISCORD_TOKEN`: Your Discord bot token
- `MONGODB_URI`: Your MongoDB connection string
- `PREFIX`: Command prefix (default: .)
- `OWNER_ID`: Your Discord user ID

4. Start the bot:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Commands

### Economy Commands
- `.balance` - Check your balance
- `.work` - Work to earn money
- `.put <amount>` - Put money to safe
- `.take <amount>` - Take money from safe

### Casino Commands
- `!coinflip <amount> <heads/tails>` - Flip a coin and bet

### Leveling Commands
- `!rank` - Check your rank and XP

### Utility Commands
- `.help` - Show all commands

## Project Structure

```
src/
├── bot.js                 # Main entry point
├── config/
│   ├── config.js         # Bot configuration
│   └── database.js       # MongoDB connection
├── commands/             # Command modules
│   ├── economy/          # Economy commands
│   ├── casino/           # Casino commands
│   ├── gang/             # Gang commands
│   ├── pets/             # Pet commands
│   ├── levels/           # Leveling commands
│   └── utils/            # Utility commands
├── events/               # Discord event handlers
├── models/               # Mongoose schemas
├── utils/                # Utility functions
└── middleware/           # Command middleware
```

## Database Models

- **User**: Stores user economy data, XP, and references
- **Gang**: Gang information and member management
- **Pet**: Pet data and statistics
- **CasinoLog**: Casino game history and statistics
- **Transaction**: Economy transaction logging
- **ShopItem**: Shop items and effects
- **Cooldown**: Command cooldown management

## Configuration

The bot is highly configurable through `src/config/config.js`:

- Economy settings (work cooldowns, pay rates)
- Casino settings (min/max bets, house edge)
- Leveling settings (XP rates, level requirements)
- Gang settings (creation costs, member limits)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, join our Discord server or create an issue on GitHub.