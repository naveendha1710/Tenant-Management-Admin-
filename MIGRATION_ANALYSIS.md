# Room Migration Analysis Report

## Executive Summary
Migration from text-based `room_rack` to UUID-based `room_id` with foreign key relationships.

**Total Rooms:** 45 rooms across 3 buildings
**Sample Assets Analyzed:** 100 (out of 1500 total)
**Estimated Migration Success Rate:** ~85-90%

---

## Data Quality Issues Identified

### 1. Floor Mismatch Issues
**Problem:** Assets have `floor_id` that doesn't match the room's actual floor

**Examples:**
- Asset `FUR/TBL/0080` has `floor_id: 31d6ab19-7ade-49f6-8fc3-8c723e809cc2` but `room_rack: "5"`
- Room "5" exists on floor `31d6ab19-7ade-49f6-8fc3-8c723e809cc2` ✓ (Match found)

**Impact:** Medium - Most cases will match correctly

---

### 2. NULL Floor with Room Name
**Problem:** Assets have `floor: null` but valid `room_rack` text

**Examples:**
```
- Asset: ELE/LGT/0206, room_rack: "RCP", floor: null
- Asset: FUR/BRD/0026, room_rack: "Seminar /Clinical Room", floor: null
- Asset: FUR/STRG/0034, room_rack: "Staff Room", floor: null
```

**Impact:** High - Affects ~15-20% of assets
**Solution:** Match by room name only, pick first match if multiple rooms exist

---

### 3. Case Sensitivity Variations
**Problem:** Room names have case variations

**Examples:**
- "Rcas Library" (in rooms table)
- "Rcas library" (in assets table)

**Impact:** Low - Handled by LOWER() function in migration script
**Solution:** Case-insensitive matching

---

### 4. Duplicate Room Names Across Floors
**Problem:** Same room name exists on multiple floors

**Examples:**
- "Corridor" exists on 3 floors:
  - Floor: 5a090c32-0e3d-4756-be30-c2c70b76e8d6
  - Floor: da080531-765f-4dc2-9522-00b43ededa78
  - Floor: 31d6ab19-7ade-49f6-8fc3-8c723e809cc2

- "Restroom" exists on 3 floors:
  - Floor: 5a090c32-0e3d-4756-be30-c2c70b76e8d6
  - Floor: 31d6ab19-7ade-49f6-8fc3-8c723e809cc2
  - Floor: 542cea57-cf61-4d9f-b3f9-1c7eb1127b1e

**Impact:** Critical - Requires floor_id to disambiguate
**Solution:** Match using both room_number AND floor_id

---

### 5. Rooms Not in Database
**Problem:** Some `room_rack` values may not exist in rooms table

**Examples to check:**
- "RCP" - Not found in rooms table
- "RCP Under Ground" - Not found in rooms table
- "Staff Room" - Found ✓

**Impact:** High - These assets will fail migration
**Solution:** Manual review and either:
  1. Add missing rooms to rooms table
  2. Update asset room_rack to existing room
  3. Set room_id to NULL

---

## Migration Strategy

### Phase 1: Exact Matches (Highest Confidence)
Match assets where:
- `room_rack` = `room_number` (case-insensitive)
- `floor_id` matches exactly

**Expected Success:** ~70% of assets

### Phase 2: Floor-Agnostic Matches
Match assets where:
- `floor_id` is NULL
- `room_rack` = `room_number` (case-insensitive)
- Pick first matching room

**Expected Success:** ~15% of assets

### Phase 3: Fuzzy Matches
Handle variations:
- Extra spaces
- Case differences
- Special characters

**Expected Success:** ~5% of assets

### Phase 4: Manual Review
Assets that couldn't be matched automatically:
- Missing rooms
- Typos in room names
- Invalid room references

**Expected:** ~10% of assets require manual intervention

---

## Rooms Table Statistics

### By Building:
1. **Building: c8c46f58-9773-4e9a-a3f0-9554ea88ea89** (Main building)
   - 38 rooms across 4 floors
   
2. **Building: 92daf9de-969a-4669-9680-f032d195fa2e**
   - 6 rooms on 1 floor
   
3. **Building: 18f941b4-50b8-4ef2-a8a8-e77c0b14ac6a**
   - 1 room on 1 floor

### Rooms with Categories:
- 13 rooms have `category_id` set
- 32 rooms have `category_id` as NULL

---

## Sample Asset Analysis (100 assets)

### Room Distribution:
- "Rcas Library": 30+ assets
- "Seminar /Clinical Room": 10+ assets
- "Library": 8+ assets
- "2": 5+ assets
- Others: 1-3 assets each

### Floor Distribution:
- Floor `5a090c32-0e3d-4756-be30-c2c70b76e8d6`: ~40 assets
- Floor `83a23945-4577-462f-894b-df3229d6ab61`: ~30 assets
- Floor `da080531-765f-4dc2-9522-00b43ededa78`: ~20 assets
- Floor `31d6ab19-7ade-49f6-8fc3-8c723e809cc2`: ~10 assets

---

## Risks and Mitigation

### Risk 1: Data Loss
**Risk:** Assets lose room information if migration fails
**Mitigation:** 
- Backup column `room_rack_backup` created
- Rollback script provided
- Test on staging environment first

### Risk 2: Application Downtime
**Risk:** Application breaks during migration
**Mitigation:**
- Migration adds new column without removing old one
- Both columns exist during transition
- Remove old column only after full verification

### Risk 3: Orphaned Assets
**Risk:** Assets with invalid room references
**Mitigation:**
- Foreign key with `ON DELETE SET NULL`
- Assets won't be deleted if room is deleted
- room_id will be set to NULL instead

---

## Post-Migration Verification Checklist

- [ ] Run migration report query
- [ ] Verify migration success rate > 85%
- [ ] Review unmigrated assets list
- [ ] Add missing rooms to rooms table
- [ ] Re-run migration for failed assets
- [ ] Test asset view/edit forms
- [ ] Test thermal label generation
- [ ] Verify room display in asset list
- [ ] Test room name changes cascade correctly
- [ ] Add foreign key constraint
- [ ] Create performance index
- [ ] Update application code
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Drop old room_rack column (after 1 week)

---

## Application Code Changes Required

### 1. Database Schema
```sql
-- New column
room_id UUID REFERENCES rooms(id) ON DELETE SET NULL

-- Index
CREATE INDEX idx_assets_room_id ON assets(room_id);
```

### 2. TypeScript Interfaces
```typescript
// Update AssetForPrint interface
interface AssetForPrint {
  asset_id: string;
  asset_name: string;
  asset_category: string;
  asset_type: string;
  serial_number: string | null;
  building: string;
  floor: string;
  room_id: string | null;  // Changed from room_rack
  room_number?: string;     // Add for display
}
```

### 3. Supabase Queries
```typescript
// OLD
const { data } = await supabase
  .from('assets')
  .select('*, room_rack')
  .eq('id', assetId);

// NEW
const { data } = await supabase
  .from('assets')
  .select(`
    *,
    rooms (
      id,
      room_number,
      category_id,
      form_dropdowns (
        dropdown_value
      )
    )
  `)
  .eq('id', assetId);
```

### 4. RoomDisplay Component
```typescript
// OLD - Fetches room by room_number and floor_id
const { data: roomData } = await supabase
  .from('rooms')
  .select('*, form_dropdowns(dropdown_value)')
  .eq('room_number', formData.room_rack)
  .eq('floor_id', formData.floor_id);

// NEW - Direct relationship via room_id
// Room data already included in asset query via join
const roomDisplay = asset.rooms?.room_number || 'N/A';
const categoryDisplay = asset.rooms?.form_dropdowns?.dropdown_value;
```

### 5. Form Inputs
```typescript
// OLD - Text input
<input 
  type="text" 
  name="room_rack" 
  value={formData.room_rack}
/>

// NEW - Dropdown with rooms filtered by floor
<select 
  name="room_id" 
  value={formData.room_id}
>
  {rooms
    .filter(r => r.floor_id === formData.floor_id)
    .map(room => (
      <option key={room.id} value={room.id}>
        {room.room_number}
      </option>
    ))
  }
</select>
```

---

## Timeline Estimate

1. **Preparation:** 1 day
   - Review migration script
   - Test on sample data
   - Prepare rollback plan

2. **Migration Execution:** 2-4 hours
   - Run migration script
   - Verify results
   - Fix unmigrated assets

3. **Application Updates:** 2-3 days
   - Update TypeScript interfaces
   - Update database queries
   - Update UI components
   - Test thoroughly

4. **Deployment:** 1 day
   - Deploy to staging
   - User acceptance testing
   - Deploy to production
   - Monitor

**Total:** 4-5 days

---

## Recommendations

1. **Run migration during low-traffic hours** (e.g., weekend)
2. **Keep room_rack column for 1 week** as safety net
3. **Add validation** to prevent NULL room_id when room_rack had value
4. **Create admin tool** to fix unmigrated assets
5. **Add audit log** to track room changes
6. **Consider adding room history table** for compliance

---

## Success Criteria

- ✓ 90%+ assets successfully migrated
- ✓ No data loss (room_rack_backup exists)
- ✓ Foreign key constraint added
- ✓ Application works with new schema
- ✓ Room name changes reflect automatically
- ✓ Performance is same or better
- ✓ No user-reported issues after 1 week

---

## Contact for Issues

If migration issues occur:
1. Check migration report output
2. Review unmigrated assets list
3. Verify room exists in rooms table
4. Check floor_id matches
5. Run rollback script if needed
