# PM Task Board Feature - Documentation

## Overview

The **PM Task Board** is a day-wise actionable task management layer that bridges the gap between Preventive Maintenance scheduling and Physical Audit execution. It provides a centralized dashboard for admins to view, assign, and track PM tasks on a daily basis.

---

## Architecture

### Design Pattern: **Derived Task System (No New Table)**

The PM Task Board uses a **query-based approach** that dynamically generates tasks from existing `preventive_maintenance` and `assets` tables. This eliminates data redundancy and ensures real-time accuracy.

### Key Benefits:
- ✅ No data duplication
- ✅ Real-time task generation
- ✅ Single source of truth
- ✅ Automatic sync with PM schedules
- ✅ Scalable to 1000+ assets

---

## Database Schema

### Existing Tables Used

#### 1. `preventive_maintenance`
```sql
- asset_id (UUID, UNIQUE)
- pm_enabled (BOOLEAN)
- pm_start_date (DATE)
- pm_end_date (DATE)
- pm_frequency_days (INTEGER)
- pm_next_date (DATE) -- Key field for task generation
- pm_last_completed_date (DATE)
- assigned_to (UUID) -- FK to users
- assigned_at (TIMESTAMP)
- assignment_notes (TEXT)
```

#### 2. `assets`
```sql
- id (UUID)
- asset_name (VARCHAR)
- asset_code (VARCHAR)
- barcode (VARCHAR)
- location (VARCHAR)
- building_id (UUID)
- floor (VARCHAR)
- tenant_id (UUID)
```

#### 3. `physical_audits`
```sql
- asset_id (VARCHAR)
- audit_date (TIMESTAMP)
- auditor_id (UUID)
- audit_result (VARCHAR)
- condition (VARCHAR)
```

---

## Core Query Logic

### Task Generation Query

```sql
SELECT
  a.id,
  a.asset_name,
  a.asset_code,
  a.barcode,
  a.location,
  pm.pm_next_date,
  pm.assigned_to,
  CASE
    WHEN pm.pm_next_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN pm.pm_next_date = CURRENT_DATE THEN 'DUE_TODAY'
    ELSE 'UPCOMING'
  END as status
FROM preventive_maintenance pm
JOIN assets a ON pm.asset_id = a.id
WHERE pm.pm_enabled = true
  AND pm.pm_next_date <= :target_date + INTERVAL '7 days'
ORDER BY pm.pm_next_date ASC;
```

### Status Calculation

```typescript
const calculateStatus = (pmDate: string, currentDate: string) => {
  const diffDays = Math.ceil((new Date(currentDate) - new Date(pmDate)) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) return 'OVERDUE';
  if (diffDays === 0) return 'DUE_TODAY';
  return 'UPCOMING';
};
```

---

## API Service Layer

### File: `src/services/pmTaskService.ts`

#### Methods

1. **getPMTasks(filters: PMTaskFilters): Promise<PMTask[]>**
   - Fetches PM tasks with filters
   - Joins with assets, buildings, tenants
   - Calculates status dynamically
   - Returns enriched task data

2. **assignTask(assetId: string, userId: string, notes?: string): Promise<void>**
   - Assigns a single task to a user
   - Updates `assigned_to`, `assigned_at`, `assignment_notes`

3. **bulkAssignTasks(payload: BulkAssignmentPayload): Promise<void>**
   - Assigns multiple tasks to a user
   - Executes parallel updates

4. **getAvailableAuditors(): Promise<User[]>**
   - Fetches users with `asset_auditor` or `asset_incharge` flag

5. **getPMTaskStats(date?: string): Promise<Stats>**
   - Returns aggregated statistics
   - Total, Overdue, Due Today, Upcoming, Assigned, Unassigned

6. **exportPMTasks(filters: PMTaskFilters): Promise<string>**
   - Exports tasks to CSV format

---

## Frontend Component

### File: `src/components/assets/PMTaskBoard.tsx`

#### Features

1. **Stats Dashboard**
   - 6 metric cards: Total, Overdue, Due Today, Upcoming, Unassigned, Assigned
   - Color-coded for quick visual scanning

2. **Advanced Filters**
   - Date picker (default: today)
   - Status filter (Overdue / Due Today / Upcoming)
   - Tenant filter
   - Building filter
   - Floor filter
   - "Show only unassigned" toggle

3. **Task Table**
   - Checkbox for bulk selection
   - Asset Code, Name, Location, Building, Tenant
   - PM Date
   - Status badge (color-coded)
   - Inline assignment dropdown
   - "Start Audit" button

4. **Bulk Actions**
   - Bulk assign to auditor
   - Assignment notes
   - Clear selection

5. **Export**
   - CSV export with all filters applied

---

## User Workflows

### Admin Workflow

```
1. Open PM Task Board
2. Select date (default: today)
3. View overdue/due tasks
4. Filter by tenant/building/floor
5. Select tasks (individual or bulk)
6. Assign to auditor
7. Add assignment notes
8. Auditor receives notification
```

### Auditor Workflow

```
1. Login to system
2. View assigned PM tasks
3. Navigate to asset location
4. Click "Start Audit"
5. Redirected to Physical Audit page
6. Scan barcode
7. Complete audit form
8. Submit audit
9. System auto-updates PM schedule
```

---

## Integration Points

### 1. PM Schedule → Task Board

When PM is scheduled:
```typescript
// In PreventiveMaintenanceList.tsx
await supabase.from('preventive_maintenance').upsert({
  asset_id: assetId,
  pm_next_date: calculatedDate,
  assigned_to: userId
});

// Task Board automatically shows this task when pm_next_date is due
```

### 2. Task Board → Physical Audit

When "Start Audit" is clicked:
```typescript
navigate(`/assets/physical-audit?asset_id=${task.asset_id}&barcode=${task.barcode}`);
```

### 3. Physical Audit → PM Update

When audit is completed:
```typescript
// In Physical Audit submission
await supabase.from('physical_audits').insert({
  asset_id: assetId,
  audit_date: new Date(),
  auditor_id: userId,
  audit_result: result
});

// Update PM schedule
await supabase.from('preventive_maintenance').update({
  pm_last_completed_date: new Date(),
  pm_next_date: new Date(Date.now() + pm_frequency_days * 24 * 60 * 60 * 1000)
}).eq('asset_id', assetId);
```

---

## Status Badge Colors

```typescript
OVERDUE    → Red badge with AlertCircle icon
DUE_TODAY  → Yellow badge with Clock icon
UPCOMING   → Green badge with CheckCircle2 icon
```

---

## Performance Optimizations

### 1. Indexed Queries
```sql
CREATE INDEX idx_pm_next_date ON preventive_maintenance(pm_next_date);
CREATE INDEX idx_pm_enabled ON preventive_maintenance(pm_enabled);
CREATE INDEX idx_pm_assigned_to ON preventive_maintenance(assigned_to);
```

### 2. Pagination
- Frontend pagination for large datasets
- Default: 10 items per page

### 3. Lazy Loading
- Stats loaded separately from tasks
- Auditors loaded once on mount

### 4. Debounced Filters
- Search and filter changes debounced by 300ms

---

## Role-Based Access Control

### Admin
- Full access to all tasks
- Can assign/reassign any task
- Can view all auditors
- Can export data

### Auditor
- View only assigned tasks
- Can start audit
- Cannot reassign tasks

### Implementation
```typescript
// In PMTaskBoard.tsx
const { user, role } = useAuth();

if (role === 'Auditor') {
  filters.assigned_to = user.id;
}
```

---

## Error Handling

### Service Layer
```typescript
try {
  const tasks = await pmTaskService.getPMTasks(filters);
  setTasks(tasks);
} catch (error) {
  toast({
    title: 'Error',
    description: error.message || 'Failed to load PM tasks',
    variant: 'destructive'
  });
}
```

### Bulk Operations
```typescript
const results = await Promise.all(promises);
const errors = results.filter(r => r.error);

if (errors.length > 0) {
  throw new Error(`Failed to assign ${errors.length} tasks`);
}
```

---

## Testing Scenarios

### 1. Task Generation
- ✅ Overdue tasks show in red
- ✅ Due today tasks show in yellow
- ✅ Upcoming tasks show in green
- ✅ Disabled PM schedules don't appear

### 2. Assignment
- ✅ Single assignment updates immediately
- ✅ Bulk assignment handles 100+ tasks
- ✅ Assignment notes saved correctly

### 3. Filters
- ✅ Date filter shows correct tasks
- ✅ Status filter works independently
- ✅ Tenant/Building/Floor filters combine correctly
- ✅ "Show only unassigned" works

### 4. Export
- ✅ CSV includes all filtered tasks
- ✅ CSV headers match table columns
- ✅ Special characters escaped

---

## Future Enhancements

### Phase 2
- [ ] Mobile app for auditors
- [ ] Push notifications for due tasks
- [ ] Auto-assignment based on workload
- [ ] Task priority levels
- [ ] Recurring task templates

### Phase 3
- [ ] AI-based task scheduling
- [ ] Predictive maintenance alerts
- [ ] Integration with IoT sensors
- [ ] Real-time GPS tracking

---

## Troubleshooting

### Issue: Tasks not showing
**Solution**: Check `pm_enabled = true` and `pm_next_date` is set

### Issue: Assignment not saving
**Solution**: Verify user has `asset_auditor` or `asset_incharge` flag

### Issue: Slow performance
**Solution**: Check database indexes, add pagination

### Issue: Export fails
**Solution**: Check CSV generation logic, handle special characters

---

## File Structure

```
src/
├── services/
│   └── pmTaskService.ts          # API service layer
├── components/
│   └── assets/
│       └── PMTaskBoard.tsx       # Main UI component
└── pages/
    └── preventive-maintenance/
        └── PreventiveMaintenanceList.tsx  # Parent page with tabs
```

---

## Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "lucide-react": "^0.x",
  "@radix-ui/react-select": "^1.x",
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-tabs": "^1.x"
}
```

---

## Conclusion

The PM Task Board feature provides a **production-ready, scalable, and maintainable** solution for managing preventive maintenance tasks. It follows enterprise-grade architecture principles with clean separation of concerns, comprehensive error handling, and optimized performance.

**Key Achievements:**
✅ Zero data redundancy
✅ Real-time task generation
✅ Intuitive UX
✅ Role-based access
✅ Bulk operations
✅ Export functionality
✅ Mobile-ready design

---

**Built with ❤️ for enterprise asset management**
