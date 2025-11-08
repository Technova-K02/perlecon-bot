const SHOP_ITEMS = {
  // Cats
  'cute-cat': { price: 5000, category: 'Cats', description: 'A cute cat emoji', displayName: 'Cute Cat', emoji: 'cutecat', emoji_id: '1434997558928736448' },
  'orange-cat': { price: 13000, category: 'Cats', description: 'An orange cat emoji', displayName: 'Orenji Cat', emoji: 'orangecat', emoji_id: '1434997578335785052' },
  'l-cat': { price: 21000, category: 'Cats', description: 'L cat emoji', displayName: 'L Cat', emoji: 'lcat', emoji_id: '1434997573738823711' },
  'w-cat': { price: 29000, category: 'Cats', description: 'W cat emoji', displayName: 'W Cat', emoji: 'wcat', emoji_id: '1434997590042214622' },
  'trippin-cat': { price: 37000, category: 'Cats', description: 'Trippin cat emoji', displayName: 'Trippin Cat', emoji: 'trippincat', emoji_id: '1434997581091438664' },
  'zoom-cat': { price: 45000, category: 'Cats', description: 'Zoom cat emoji', displayName: 'Zoom Cat', emoji: 'zoomcat', emoji_id: '1434997593913430166' },
  'void-cat': { price: 53000, category: 'Cats', description: 'Cat void emoji', displayName: 'Void Cat', emoji: 'voidgradient', emoji_id: '1434997585222963262' },
  'galaxy-cat': { price: 61000, category: 'Cats', description: 'Galaxy cat emoji', displayName: 'Galaxy Cat', emoji: 'galaxycat', emoji_id: '1434997562867318916' },
  'gold-cat': { price: 69000, category: 'Cats', description: 'Cat gold emoji', displayName: 'Gold Cat', emoji: 'goldgradient', emoji_id: '1434997569058242710' },

  // Name Styles
  'cyan-style': {
    price: 25000,
    category: 'Styles',
    description: 'Cyan name style with cool blue effects.',
    displayName: 'Cyan Style',
    type: 'Name Style',
    usedFor: 'Name Display',
    effect: 'Cyan styling for your name',
    emoji: 'cyanstyle',
    emoji_id: '1434997480172556388'
  },
  'lavender-style': {
    price: 50000,
    category: 'Styles',
    description: 'Lavender name style with elegant purple effects.',
    displayName: 'Lavender Style',
    type: 'Name Style',
    usedFor: 'Name Display',
    effect: 'Lavender styling for your name',
    emoji: 'lavenderstyle',
    emoji_id: '1434997488288403547'
  },
  'flame-style': {
    price: 75000,
    category: 'Styles',
    description: 'Flame name style with fiery effects.',
    displayName: 'Flame Style',
    type: 'Name Style',
    usedFor: 'Name Display',
    effect: 'Flame styling for your name',
    emoji: 'flamestyle',
    emoji_id: '1434997483725000817'
  },
  'immo-style': {
    price: 150000,
    category: 'Styles',
    description: 'Immortal name style with divine effects.',
    displayName: 'Immo Style',
    type: 'Name Style',
    usedFor: 'Name Display',
    effect: 'Immortal styling for your name',
    emoji: 'immostyle',
    emoji_id: '1434997485553717390'
  },
  'vip-style': {
    price: 1000000,
    category: 'Styles',
    description: 'VIP name style with premium golden effects.',
    displayName: 'VIP Style',
    type: 'Name Style',
    usedFor: 'Name Display',
    effect: 'VIP styling for your name',
    emoji: 'VIPstyle',
    emoji_id: '1434997520202993754'
  },

  // Gang Tools
  'basic-lockpick': { 
    price: 6000, 
    category: 'Tools', 
    description: 'Permanently upgrades your gang with +10% robbing success. One-time purchase.', 
    displayName: 'Basic Lockpick',
    type: 'Permanent Upgrade',
    usedFor: 'Robbing (.robgang)',
    effect: '+10% success chance (permanent)'
  },
  'steel-lockpick': { 
    price: 12000, 
    category: 'Tools', 
    description: 'Permanently upgrades your gang with +25% robbing success. One-time purchase.', 
    displayName: 'Steel Lockpick',
    type: 'Permanent Upgrade',
    usedFor: 'Robbing',
    effect: '+25% success (permanent)'
  },
  'titan-lockpick': { 
    price: 25000, 
    category: 'Tools', 
    description: 'Permanently upgrades your gang with +45% success and +2000 steal cap. One-time purchase.', 
    displayName: 'Titan Lockpick',
    type: 'Permanent Upgrade',
    usedFor: 'Robbing',
    effect: '+45% success; +2000 steal cap (permanent)'
  },
  'breach-charge': { 
    price: 40000, 
    category: 'Tools', 
    description: 'Explosive charge for raiding with +30% success and +100 bonus damage.', 
    displayName: 'Breach Charge',
    type: 'Consumable',
    usedFor: 'Raiding',
    effect: '+30% raid success; +100 bonus damage'
  }
};

module.exports = SHOP_ITEMS;