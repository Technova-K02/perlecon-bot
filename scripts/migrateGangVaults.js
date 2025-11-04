const mongoose = require('mongoose');
const { migrateGangVaults, cleanupBaseVaultReferences } = require('../src/utils/gangVaultMigration');
require('dotenv').config();

async function runMigration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Run the migration
    const migrationResult = await migrateGangVaults();
    console.log('Migration result:', migrationResult);
    
    // Clean up old references
    const cleanupCount = await cleanupBaseVaultReferences();
    console.log('Cleanup result:', cleanupCount);
    
    console.log('Gang safe migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;