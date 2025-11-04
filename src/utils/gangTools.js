// Gang tool definitions
const TOOLS = {
  'basic-lockpick': {
    name: 'Basic Lockpick',
    price: 6000,
    type: 'Permanent Upgrade',
    usedFor: 'Robbing (.robgang)',
    effect: '+10% success chance (permanent)',
    field: 'basicLockpick',
    description: 'Permanently upgrades your gang with improved robbing capabilities. One-time purchase that provides lasting benefits.'
  },
  'steel-lockpick': {
    name: 'Steel Lockpick',
    price: 12000,
    type: 'Permanent Upgrade',
    usedFor: 'Robbing',
    effect: '+25% success (permanent)',
    field: 'steelLockpick',
    description: 'Permanently upgrades your gang with significantly improved robbing success rates. One-time purchase.'
  },
  'titan-lockpick': {
    name: 'Titan Lockpick',
    price: 25000,
    type: 'Permanent Upgrade',
    usedFor: 'Robbing',
    effect: '+45% success; +2000 steal cap (permanent)',
    field: 'titanLockpick',
    description: 'The ultimate permanent upgrade for robbing. Provides massive success bonuses and increases maximum steal amount.'
  },
  'breach-charge': {
    name: 'Breach Charge',
    price: 40000,
    type: 'Consumable',
    usedFor: 'Raiding',
    effect: '+30% raid success; +100 bonus damage',
    field: 'breachCharge',
    description: 'An explosive charge used for raiding enemy bases. Provides significant raid bonuses but is consumed on use.'
  }
};

// Tool aliases for easier access
const TOOL_ALIASES = {
  'basic': 'basic-lockpick',
  'basiclockpick': 'basic-lockpick',
  'steel': 'steel-lockpick',
  'steellockpick': 'steel-lockpick',
  'titan': 'titan-lockpick',
  'titanlockpick': 'titan-lockpick',
  'breach': 'breach-charge',
  'breachcharge': 'breach-charge',
  'charge': 'breach-charge'
};

/**
 * Get tool by key, resolving aliases
 * @param {string} toolKey - Tool key or alias
 * @returns {Object|null} - Tool object or null if not found
 */
function getTool(toolKey) {
  const normalizedKey = toolKey.toLowerCase().replace(/[\s-_]/g, '');
  const resolvedKey = TOOL_ALIASES[normalizedKey] || toolKey.toLowerCase();
  return TOOLS[resolvedKey] || null;
}

/**
 * Get all available tools
 * @returns {Object} - All tools
 */
function getAllTools() {
  return TOOLS;
}

/**
 * Get tool field name by key
 * @param {string} toolKey - Tool key
 * @returns {string|null} - Field name or null
 */
function getToolField(toolKey) {
  const tool = getTool(toolKey);
  return tool ? tool.field : null;
}

/**
 * Get tool list as formatted string
 * @returns {string} - Formatted tool list
 */
function getToolList() {
  return Object.keys(TOOLS).join(', ');
}

module.exports = {
  TOOLS,
  TOOL_ALIASES,
  getTool,
  getAllTools,
  getToolField,
  getToolList
};