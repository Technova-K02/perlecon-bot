# Gang Safe Consolidation

## Overview
This update consolidates the Gang Safe system by removing the separate `base.vault` and using only the main `gang.vault` for all gang financial operations.

## Changes Made

### 1. Database Model Updates
- **File**: `src/models/Gang.js`
- **Change**: Removed `vault` property from the `base` schema object
- **Impact**: New gangs will no longer have a separate base vault

### 2. Command Updates

#### Base Command (`src/commands/gang/base.js`)
- Removed `base.vault` references and replaced with `gang.vault`
- Removed deposit/withdraw functionality (use `gangput`/`gangtake` instead)
- Updated display to show Gang Safe instead of base vault
- Updated help text to reference correct commands

#### Rob Command (`src/commands/gang/rob.js`)
- Changed target vault check from `targetGang.base.vault` to `targetGang.vault`
- Updated coin stealing logic to use main Gang Safe
- Updated success message to show Gang Safe balance

#### Raid Command (`src/commands/gang/raid.js`)
- Changed coin stealing calculation to use `targetGang.vault`
- Updated vault transfer logic to use main Gang Safe
- Updated success message to show Gang Safe balance

#### Gang Info Command (`src/commands/gang/ganginfo.js`)
- Removed separate base vault display
- Consolidated to show only Gang Safe with capacity limit
- Removed base vault initialization code

#### Repair Command (`src/commands/gang/repair.js`)
- Removed `vault: 0` from base initialization

#### Hire Command (`src/commands/gang/hire.js`)
- Removed `vault: 0` from base initialization

### 3. Migration Tools

#### Migration Utility (`src/utils/gangVaultMigration.js`)
- **Function**: `migrateGangVaults()` - Moves existing base.vault funds to gang.vault
- **Function**: `cleanupBaseVaultReferences()` - Removes base.vault fields from database
- **Purpose**: Ensures existing gangs don't lose their base vault funds

#### Migration Script (`scripts/migrateGangVaults.js`)
- **Purpose**: Standalone script to run the migration
- **Usage**: `node scripts/migrateGangVaults.js`
- **Requirements**: Requires MONGODB_URI environment variable

## Impact on Existing Gangs

### Before Migration
- Gangs had two separate vaults: `gang.vault` and `gang.base.vault`
- Base operations used base vault
- Gang operations used Gang Safe

### After Migration
- All vault operations use `gang.vault`
- Base vault funds are consolidated into Gang Safe
- Vault capacity is determined by base level (same as before)

## Commands Affected

### Updated Command Behavior
- `.base` - Now shows Gang Safe instead of base vault
- `.base deposit/withdraw` - **REMOVED** (use `.gangput`/`.gangtake`)
- `.rob <gang>` - Steals from Gang Safe instead of base vault
- `.raid <gang>` - Steals from Gang Safe instead of base vault
- `.ganginfo` - Shows consolidated vault information

### Unchanged Commands
- `.gangput <amount>` - Still deposits to Gang Safe
- `.gangtake <amount>` - Still withdraws from Gang Safe
- `.gangvault` - Still shows Gang Safe balance
- All other gang commands remain the same

## Migration Instructions

### For Server Administrators
1. **Backup your database** before running migration
2. Run the migration script: `node scripts/migrateGangVaults.js`
3. Verify that Gang Safe balances are correct
4. The migration is safe to run multiple times

### For Users
- No action required from users
- Existing base vault funds will be automatically moved to Gang Safe
- All commands work the same way, just with consolidated vault

## Technical Notes

### Vault Capacity
- Vault capacity is still determined by base level
- Uses the same capacity limits as before (base.safeCapacity)
- Displayed as "Gang Safe: X/Y coins" where Y is the capacity

### Backward Compatibility
- Migration script handles existing gangs safely
- New gangs created after update won't have base.vault
- Old gangs will have their base.vault consolidated

### Database Cleanup
- Migration removes the `base.vault` field entirely
- Prevents confusion between old and new vault systems
- Ensures consistent data structure across all gangs

## Benefits

1. **Simplified System**: One vault instead of two reduces complexity
2. **Better UX**: Users don't need to manage two separate vaults
3. **Consistent Commands**: All vault operations use the same commands
4. **Easier Maintenance**: Less code to maintain and debug
5. **Clear Capacity**: Vault capacity is clearly displayed and enforced

## Testing Recommendations

1. Test gang creation (should not have base.vault)
2. Test vault operations (deposit, withdraw, check balance)
3. Test combat operations (rob, raid) to ensure proper vault usage
4. Verify vault capacity limits work correctly
5. Test migration script with sample data