# Asset Movement Tenant Update Fix

## Problem
When an asset movement was approved/completed, the location was updating but the tenant (handover_to) was not changing in the asset record.

## Root Cause
The movement table was storing tenant information inconsistently:
- `handover_name`: Sometimes UUID, sometimes text name
- `to_tenant`: Tenant company name (text)
- No dedicated field for tenant UUID to update assets

## Solution
Separated tenant NAME storage (for history) from tenant UUID storage (for asset updates):

### 1. Database Changes
**Added new column:** `to_tenant_id` (UUID)
- Stores the tenant UUID for updating assets
- Indexed for performance
- Optional foreign key to tenants table

**Field Usage:**
- `handover_name`: Stores tenant NAME (text) - for display in movement history
- `to_tenant`: Stores tenant NAME (text) - for display
- `to_tenant_id`: Stores tenant UUID - for updating asset.handover_to field

### 2. Code Changes

**AssetMovement.tsx (Line ~418-420):**
```typescript
const toTenantName = formData.handover_to === 'Tenant' ? tenants.find(t => t.id === formData.handover_name)?.company || '' : formData.handover_name;
const toTenantId = formData.handover_to === 'Tenant' ? formData.handover_name : null;

// Movement payload now includes:
handover_name: toTenantName,  // NAME for history
to_tenant: toTenantName,      // NAME for history
to_tenant_id: toTenantId,     // UUID for asset update
```

**assetService.ts (Line ~365-393):**
```typescript
// Update handover_to (tenant)
if ((movement as any).handover_to === 'Tenant' && (movement as any).to_tenant_id) {
  const newHandoverToId = (movement as any).to_tenant_id;
  // ... update asset.handover_to with UUID
  updates.handover_to = newHandoverToId;
}
```

### 3. Migration Steps

1. **Run SQL migration:**
   ```sql
   -- Execute: add_to_tenant_id_column.sql
   ```

2. **Migrate existing data:**
   ```sql
   -- The migration script automatically updates existing movements
   -- by matching to_tenant name with tenants table
   ```

3. **Fix current broken asset:**
   ```sql
   -- Execute: fix_asset_tenant_from_movement.sql
   -- This fixes asset EXTRA/ETR/0214 to point to Tartlabs
   ```

## Benefits
1. ✅ Movement history preserves tenant names even if tenant is deleted
2. ✅ Asset updates use UUID for data integrity
3. ✅ Clear separation of concerns (display vs. data)
4. ✅ Works for both 'Approved' and 'Completed' movement statuses

## Testing
1. Create a new movement with tenant handover
2. Approve the movement
3. Verify asset's handover_to field updates to correct tenant UUID
4. Verify movement history shows tenant name (not UUID)
5. Mark movement as completed
6. Verify asset location and tenant are both updated

## Files Modified
- `src/pages/assets/AssetMovement.tsx` - Movement creation logic
- `src/services/assetService.ts` - Asset update logic
- `add_to_tenant_id_column.sql` - Database migration
- `fix_asset_tenant_from_movement.sql` - Fix existing broken asset
