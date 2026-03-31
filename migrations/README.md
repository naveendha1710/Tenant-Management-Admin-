# Database Migration Guide for PM Task Board

## Summary

**NO new tables created.** The PM Task Board uses existing tables with a derived task system.

---

## Required Columns Check

The feature requires these columns in `preventive_maintenance` table:

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `assigned_to` | UUID | YES | FK to users.id - Who is assigned |
| `assigned_at` | TIMESTAMP | YES | When assignment was made |
| `assignment_notes` | TEXT | YES | Special instructions for auditor |

---

## Step 1: Check if Columns Exist

Run this query in your database:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'preventive_maintenance'
AND column_name IN ('assigned_to', 'assigned_at', 'assignment_notes')
ORDER BY column_name;
```

**Expected Result:**
- If you see 3 rows → ✅ Columns exist, no migration needed
- If you see 0-2 rows → ⚠️ Run migration script

---

## Step 2: Run Migration (If Needed)

If columns are missing, run the migration script:

```bash
# Using psql
psql -U your_username -d your_database -f migrations/add_pm_assignment_columns.sql

# Or using Supabase SQL Editor
# Copy and paste the content of add_pm_assignment_columns.sql
```

The script is **idempotent** - safe to run multiple times.

---

## Step 3: Verify Migration

After running migration, verify:

```sql
-- Check columns exist
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'preventive_maintenance'
AND column_name IN ('assigned_to', 'assigned_at', 'assignment_notes');

-- Check index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'preventive_maintenance' 
AND indexname = 'idx_pm_assigned_to';

-- Check foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'preventive_maintenance'
AND kcu.column_name = 'assigned_to';
```

---

## Step 4: Test Assignment

Test the new columns work:

```sql
-- Test insert with assignment
UPDATE preventive_maintenance
SET 
    assigned_to = (SELECT id FROM users WHERE asset_auditor = true LIMIT 1),
    assigned_at = NOW(),
    assignment_notes = 'Test assignment'
WHERE id = (SELECT id FROM preventive_maintenance LIMIT 1)
RETURNING *;

-- Verify update worked
SELECT 
    pm.id,
    pm.assigned_to,
    pm.assigned_at,
    pm.assignment_notes,
    u.name as assigned_user_name
FROM preventive_maintenance pm
LEFT JOIN users u ON pm.assigned_to = u.id
WHERE pm.assigned_to IS NOT NULL
LIMIT 5;
```

---

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_pm_assigned_to;

-- Remove columns
ALTER TABLE preventive_maintenance DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE preventive_maintenance DROP COLUMN IF EXISTS assigned_at;
ALTER TABLE preventive_maintenance DROP COLUMN IF EXISTS assignment_notes;

-- Verify removal
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'preventive_maintenance'
AND column_name IN ('assigned_to', 'assigned_at', 'assignment_notes');
-- Should return 0 rows
```

---

## Data Impact

### Before Migration
```sql
preventive_maintenance:
- asset_id
- pm_enabled
- pm_start_date
- pm_end_date
- pm_frequency_days
- pm_next_date
- pm_last_completed_date
```

### After Migration
```sql
preventive_maintenance:
- asset_id
- pm_enabled
- pm_start_date
- pm_end_date
- pm_frequency_days
- pm_next_date
- pm_last_completed_date
- assigned_to          ← NEW
- assigned_at          ← NEW
- assignment_notes     ← NEW
```

**Existing data is NOT affected** - new columns are nullable.

---

## Performance Impact

### New Index
```sql
CREATE INDEX idx_pm_assigned_to ON preventive_maintenance(assigned_to);
```

**Purpose**: Speeds up queries filtering by assigned user

**Impact**: 
- Minimal storage overhead (~1-2% of table size)
- Faster queries for auditor-specific task lists
- Slightly slower INSERT/UPDATE (negligible)

---

## Compatibility

### Backward Compatible
✅ Existing PM schedules continue to work
✅ Existing queries unaffected
✅ New columns are optional (nullable)

### Forward Compatible
✅ PM Task Board uses new columns when available
✅ Falls back gracefully if columns missing
✅ No breaking changes to existing features

---

## Troubleshooting

### Issue: Migration fails with "column already exists"
**Solution**: Columns already exist, no action needed

### Issue: Foreign key constraint fails
**Solution**: Ensure `users` table exists and has `id` column

### Issue: Permission denied
**Solution**: Run migration with database owner/admin user

### Issue: Index creation fails
**Solution**: Index might already exist, safe to ignore

---

## Summary Checklist

- [ ] Check if columns exist
- [ ] Run migration if needed
- [ ] Verify columns created
- [ ] Verify index created
- [ ] Test assignment functionality
- [ ] Check PM Task Board loads correctly

---

## Migration Status

After running migration, you should see:

```
✅ Column assigned_to added successfully
✅ Column assigned_at added successfully  
✅ Column assignment_notes added successfully
✅ Index idx_pm_assigned_to created
✅ Migration completed successfully!
```

---

## Next Steps

1. Run the migration (if needed)
2. Restart your application
3. Navigate to **Preventive Maintenance > PM Task Board**
4. Start assigning tasks!

---

**Note**: This migration is **optional** if your `preventive_maintenance` table already has these columns from the schema you provided earlier.
