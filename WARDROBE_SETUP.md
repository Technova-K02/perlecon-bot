# Name Style System Setup Guide

## 🎨 Discord Role-Based Name Styling

The name style system uses actual Discord roles to style usernames. Users purchase styles and wear them as Discord roles.

## 🛠️ Required Setup

### Step 1: Create Discord Roles

Create these roles in your Discord server with appropriate colors:

1. **Flame Style** - Fiery red/orange color
2. **Cyan Style** - Cyan/light blue color  
3. **Immo Style** - Gold/divine color
4. **Lavender Style** - Purple/lavender color
5. **VIP Style** - Premium gold color

### Step 2: Get Role IDs

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click each role and select "Copy ID"
3. Update the `STYLE_ROLES` object in `src/commands/shop/wardrobe.js`:

```javascript
const STYLE_ROLES = {
    'flame-style': 'YOUR_FLAME_ROLE_ID_HERE',
    'cyan-style': 'YOUR_CYAN_ROLE_ID_HERE',
    'immo-style': 'YOUR_IMMO_ROLE_ID_HERE',
    'lavender-style': 'YOUR_LAVENDER_ROLE_ID_HERE',
    'vip-style': 'YOUR_VIP_ROLE_ID_HERE'
};
```

### Step 3: Bot Permissions

Ensure your bot has:
- `Manage Roles` permission
- Bot role above the style roles in hierarchy

## 🎯 How It Works

### Name Style System
- Users purchase name styles from `.shop` → Styles category
- Styles cost: Flame (75k), Cyan (25k), Immo (150k), Lavender (50k), VIP (1M)
- `.wardrobe` lets them equip/unequip styles
- When equipped, bot assigns the corresponding Discord role
- Only one style can be worn at a time
- Previous style role is automatically removed when switching

## 📋 Available Commands

- `.wardrobe` / `.styles` - Open wardrobe interface
- `.shop` - Purchase new name styles
- Styles appear as Discord role colors in chat

## 🎮 Available Name Styles

1. **Flame Style** (75,000 coins) - Fiery effects
2. **Cyan Style** (25,000 coins) - Cool blue effects  
3. **Immo Style** (150,000 coins) - Divine/immortal effects
4. **Lavender Style** (50,000 coins) - Elegant purple effects
5. **VIP Style** (1,000,000 coins) - Premium golden effects

## 🚀 User Experience

1. **Purchase** styles from `.shop` → Click "Styles" button
2. **Equip** styles in `.wardrobe` 
3. **Automatic role assignment** - Bot gives you the Discord role
4. **One at a time** - Previous roles are removed automatically
5. **Visible styling** - Your name appears with the role color in Discord

## ✅ Ready to Use

- Requires Discord role setup (see steps above)
- Bot needs Manage Roles permission
- Role hierarchy must be configured properly
- Users get actual Discord role colors for their names

The system provides real Discord name styling through purchasable roles!