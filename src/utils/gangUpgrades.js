// Gang upgrade system with names and progression

// Wall/Fence names by level
const WALL_NAMES = {
  1: 'Rusty Fence',
  2: 'Chain Fence',
  3: 'Barbed Fence',
  4: 'Reinforced Fence',
  5: 'Plated Wall',
  6: 'Concrete Barrier',
  7: 'Fortified Wall',
  8: 'Armored Gate',
  9: 'Blast Wall',
  10: 'Energy Perimeter'
};

// Base names by level (from previous implementation)
const BASE_NAMES = {
  1: 'Trailer',
  2: 'Cabin',
  3: 'Warehouse',
  4: 'Bunker',
  5: 'Compound',
  6: 'Fortress',
  7: 'Citadel',
  8: 'Kingdom'
};

// Upgrade definitions
const UPGRADES = {
  weapons: {
    name: 'Weapons',
    maxLevel: 10,
    baseCost: 5000,
    costMultiplier: 1.5,
    effectPerLevel: '+15% raid damage and +5% success chance per level',
    description: 'Improve your gang\'s weapons to deal more damage and have higher success rates in raids'
  },
  walls: {
    name: 'Walls',
    maxLevel: 10,
    baseCost: 8000,
    costMultiplier: 1.5,
    effectPerLevel: '-5% chance of being raided per level',
    description: 'Strengthen your defenses to reduce the chance of successful raids against your base',
    getLevelName: (level) => WALL_NAMES[level] || `Level ${level} Wall`
  },
  guardsTraining: {
    name: 'Guards Training',
    maxLevel: 10,
    baseCost: 12000,
    costMultiplier: 1.5,
    effectPerLevel: '10% less likely to be robbed or kidnapped',
    description: 'Train your guards to better protect against robberies and kidnapping attempts'
  },
  medicTraining: {
    name: 'Medic Training',
    maxLevel: 10,
    baseCost: 1200,
    costMultiplier: 1.5,
    effectPerLevel: 'Medics heal 15% more each level',
    description: 'Train your medics to repair base damage more effectively'
  }
  // bases: {
  //   name: 'Base',
  //   maxLevel: 8,
  //   baseCost: 10000,
  //   costMultiplier: 1.75,
  //   effectPerLevel: 'Increases max HP, safe capacity, and army size',
  //   description: 'Upgrade your base to increase its maximum health, safe capacity for storing coins, and the number of guards and medics you can hire',
  //   getLevelName: (level) => BASE_NAMES[level] || `Level ${level} Base`
  // }
};

/**
 * Calculate upgrade cost for a specific level
 * @param {string} upgradeType - Type of upgrade
 * @param {number} currentLevel - Current level
 * @returns {number} - Cost to upgrade to next level
 */
function getUpgradeCost(upgradeType, currentLevel) {
  const upgrade = UPGRADES[upgradeType];
  if (!upgrade) return 0;

  if (currentLevel >= upgrade.maxLevel) return 0; // Already at max level

  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel - 1));
}

/**
 * Get upgrade information
 * @param {string} upgradeType - Type of upgrade
 * @returns {Object} - Upgrade information
 */
function getUpgradeInfo(upgradeType) {
  return UPGRADES[upgradeType] || null;
}

/**
 * Get wall name by level
 * @param {number} level - Wall level
 * @returns {string} - Wall name
 */
function getWallName(level) {
  return WALL_NAMES[level] || `Level ${level} Wall`;
}

/**
 * Get base name by level
 * @param {number} level - Base level
 * @returns {string} - Base name
 */
function getBaseName(level) {
  return BASE_NAMES[level] || `Level ${level} Base`;
}

/**
 * Calculate weapon damage bonus
 * @param {number} weaponLevel - Weapon upgrade level
 * @returns {number} - Damage bonus percentage
 */
function getWeaponDamageBonus(weaponLevel) {
  return (weaponLevel - 1) * 15; // 15% per level above 1
}

/**
 * Calculate weapon success bonus
 * @param {number} weaponLevel - Weapon upgrade level
 * @returns {number} - Success bonus percentage
 */
function getWeaponSuccessBonus(weaponLevel) {
  return (weaponLevel - 1) * 5; // 5% per level above 1
}

/**
 * Calculate wall defense bonus
 * @param {number} wallLevel - Wall upgrade level
 * @returns {number} - Defense bonus percentage
 */
function getWallDefenseBonus(wallLevel) {
  return (wallLevel - 1) * 5; // 5% per level above 1
}

/**
 * Calculate guard training bonus
 * @param {number} guardTrainingLevel - Guard training level
 * @returns {number} - Defense bonus percentage
 */
function getGuardTrainingBonus(guardTrainingLevel) {
  return (guardTrainingLevel - 1) * 10; // 10% per level above 1
}

/**
 * Calculate medic training bonus
 * @param {number} medicTrainingLevel - Medic training level
 * @returns {number} - Healing bonus percentage
 */
function getMedicTrainingBonus(medicTrainingLevel) {
  return (medicTrainingLevel - 1) * 15; // 15% per level above 1
}

/**
 * Get all available upgrades
 * @returns {Object} - All upgrade definitions
 */
function getAllUpgrades() {
  return UPGRADES;
}

module.exports = {
  WALL_NAMES,
  BASE_NAMES,
  UPGRADES,
  getUpgradeCost,
  getUpgradeInfo,
  getWallName,
  getBaseName,
  getWeaponDamageBonus,
  getWeaponSuccessBonus,
  getWallDefenseBonus,
  getGuardTrainingBonus,
  getMedicTrainingBonus,
  getAllUpgrades
};