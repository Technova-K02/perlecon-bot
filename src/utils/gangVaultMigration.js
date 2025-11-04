const Gang = require('../models/Gang');

/**
 * Migration utility to consolidate base.Safe into gang.vault
 * This should be run once to migrate existing gangs
 */
async function migrateGangVaults() {
  try {
    console.log('Starting Gang Safe migration...');
    
    // Find all gangs that have a base.Safe value
    const gangsToMigrate = await Gang.find({
      'base.vault': { $exists: true, $gt: 0 }
    });
    
    console.log(`Found ${gangsToMigrate.length} gangs with base Safe funds to migrate`);
    
    let migratedCount = 0;
    let totalMigrated = 0;
    
    for (const gang of gangsToMigrate) {
      const baseVaultAmount = gang.base.Safe || 0;
      
      if (baseVaultAmount > 0) {
        // Add base Safe to main Gang Safe
        gang.Safe += baseVaultAmount;
        
        // Remove the Safe property from base
        gang.base.Safe = undefined;
        
        await gang.save();
        
        console.log(`Migrated ${baseVaultAmount} coins from ${gang.name} base Safe to Gang Safe`);
        migratedCount++;
        totalMigrated += baseVaultAmount;
      }
    }
    
    console.log(`Migration complete! Migrated ${migratedCount} gangs with total of ${totalMigrated} coins`);
    return { migratedCount, totalMigrated };
    
  } catch (error) {
    console.error('Error during Gang Safe migration:', error);
    throw error;
  }
}

/**
 * Clean up any remaining base.Safe references in the database
 */
async function cleanupBaseVaultReferences() {
  try {
    console.log('Cleaning up base.Safe references...');
    
    // Remove base.Safe field from all gang documents
    const result = await Gang.updateMany(
      {},
      { $unset: { 'base.vault': 1 } }
    );
    
    console.log(`Cleaned up base.Safe references from ${result.modifiedCount} gang documents`);
    return result.modifiedCount;
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

module.exports = {
  migrateGangVaults,
  cleanupBaseVaultReferences
};