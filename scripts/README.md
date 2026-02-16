# Database Export/Import Guide

## Prerequisites
```bash
npm install @supabase/supabase-js tsx
```

## Step 1: Export from Source Database

1. Open `scripts/export-database.ts`
2. Update credentials:
   ```typescript
   const SOURCE_URL = 'https://your-project.supabase.co';
   const SOURCE_KEY = 'your-anon-key';
   ```
3. Run export:
   ```bash
   npm run db:export
   ```
4. File saved to: `database-exports/supabase-export-YYYY-MM-DD.json`

## Step 2: Setup Target Database

1. Create new Supabase project
2. Run ALL migrations from `src/supabase/migrations/` in SQL Editor
3. This creates the schema (tables, columns, indexes)

## Step 3: Import to Target Database

1. Open `scripts/import-database.ts`
2. Update credentials:
   ```typescript
   const TARGET_URL = 'https://your-new-project.supabase.co';
   const TARGET_KEY = 'your-new-anon-key';
   ```
3. Run import:
   ```bash
   npm run db:import supabase-export-YYYY-MM-DD.json
   ```

## Tables Exported

- tenants
- buildings
- floors
- units
- users
- app_settings
- company_groups
- invoices
- payments
- maintenance_tickets
- deposits
- expenses
- audit_logs
- notifications
- leads
- applications

## Troubleshooting

### "Table doesn't exist"
Run migrations first in target database

### "Duplicate key error"
Clear target table before import:
```sql
DELETE FROM table_name;
```

### "Permission denied"
Use service_role key instead of anon key

### Large database
Increase batch size in import script (default: 100)

## Alternative: Manual SQL Export

If scripts fail, use SQL:

```sql
-- Export (run in source)
COPY tenants TO '/tmp/tenants.csv' CSV HEADER;

-- Import (run in target)
COPY tenants FROM '/tmp/tenants.csv' CSV HEADER;
```

## Notes

- Export creates JSON file with all data
- Import inserts in batches to avoid timeout
- Preserves all IDs and relationships
- Safe for testing - doesn't affect source
