# Workflow Engine Integration with Asset Movement

## Overview
This document explains how to integrate the workflow engine with the existing asset movement system.

---

## 1. Database Integration

### Update asset_movements table
Add workflow tracking columns:

```sql
ALTER TABLE asset_movements
ADD COLUMN workflow_instance_id UUID REFERENCES workflow_instances(id),
ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN requires_approval BOOLEAN DEFAULT true;

CREATE INDEX idx_asset_movements_workflow ON asset_movements(workflow_instance_id);
CREATE INDEX idx_asset_movements_workflow_status ON asset_movements(workflow_status);
```

---

## 2. Service Layer Integration

### Update assetService.ts

```typescript
import { workflowEngine } from './workflowEngine';

// Modify createAssetMovement function
export async function createAssetMovement(movementData: any) {
  try {
    // 1. Create asset movement record
    const { data: movement, error } = await supabase
      .from('asset_movements')
      .insert({
        ...movementData,
        status: 'Pending', // Initial status
        workflow_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Start workflow if approval required
    if (movement.requires_approval) {
      const workflowInstance = await workflowEngine.startWorkflow(
        'asset_movement',
        movement.id,
        movementData.tenant_id,
        {
          movement_type: movement.movement_type,
          from_building_id: movement.from_building_id,
          to_building_id: movement.to_building_id,
          total_assets: movement.assets?.length || 0,
          requested_by: movement.requested_by
        }
      );

      // 3. Update movement with workflow instance ID
      await supabase
        .from('asset_movements')
        .update({
          workflow_instance_id: workflowInstance.id,
          workflow_status: 'in_progress'
        })
        .eq('id', movement.id);
    }

    return movement;
  } catch (error) {
    console.error('Error creating asset movement:', error);
    throw error;
  }
}
```

---

## 3. Workflow Completion Handler

### Create workflow completion trigger

```sql
-- Function to handle workflow completion
CREATE OR REPLACE FUNCTION handle_workflow_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed or rejected workflows
  IF NEW.status IN ('completed', 'rejected') AND OLD.status != NEW.status THEN
    
    -- Update asset movement status
    IF NEW.entity_type = 'asset_movement' THEN
      UPDATE asset_movements
      SET 
        workflow_status = NEW.status,
        status = CASE 
          WHEN NEW.status = 'completed' THEN 'Approved'
          WHEN NEW.status = 'rejected' THEN 'Rejected'
          ELSE status
        END,
        approval_date = CASE 
          WHEN NEW.status = 'completed' THEN NOW()
          ELSE NULL
        END
      WHERE id = NEW.entity_id;

      -- If approved, execute the movement (update asset locations)
      IF NEW.status = 'completed' THEN
        PERFORM execute_asset_movement(NEW.entity_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_workflow_completion
AFTER UPDATE ON workflow_instances
FOR EACH ROW
EXECUTE FUNCTION handle_workflow_completion();
```

### Create asset movement execution function

```sql
-- Function to execute approved asset movement
CREATE OR REPLACE FUNCTION execute_asset_movement(p_movement_id UUID)
RETURNS VOID AS $$
DECLARE
  v_movement RECORD;
  v_asset JSONB;
BEGIN
  -- Get movement details
  SELECT * INTO v_movement
  FROM asset_movements
  WHERE id = p_movement_id;

  -- Update each asset's location
  FOR v_asset IN SELECT * FROM jsonb_array_elements(v_movement.assets)
  LOOP
    UPDATE assets
    SET 
      building_id = v_movement.to_building_id,
      floor_id = v_movement.to_floor_id,
      room_rack = v_movement.to_location,
      tenant_id = CASE 
        WHEN v_movement.handover_to = 'Tenant' THEN v_movement.tenant_id
        ELSE tenant_id
      END,
      updated_at = NOW()
    WHERE id = (v_asset->>'asset_id')::UUID;

    -- Create history record
    INSERT INTO asset_history (
      asset_id,
      change_type,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_at,
      movement_request_id
    ) VALUES (
      (v_asset->>'asset_id')::UUID,
      'location',
      'building',
      v_movement.from_building_id::TEXT,
      v_movement.to_building_id::TEXT,
      v_movement.requested_by,
      NOW(),
      p_movement_id
    );
  END LOOP;

  -- Update movement status
  UPDATE asset_movements
  SET 
    status = 'Completed',
    actual_return_date = NOW()
  WHERE id = p_movement_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Frontend Integration

### Update AssetMovement.tsx

```typescript
import { WorkflowExecutionViewer } from '../workflow/WorkflowExecutionViewer';

// Add workflow viewer to movement detail view
const AssetMovementDetail = ({ movementId }: { movementId: string }) => {
  const [movement, setMovement] = useState<any>(null);

  useEffect(() => {
    loadMovement();
  }, [movementId]);

  const loadMovement = async () => {
    const { data } = await supabase
      .from('asset_movements')
      .select('*')
      .eq('id', movementId)
      .single();
    setMovement(data);
  };

  return (
    <div className="space-y-6">
      {/* Movement Details */}
      <Card>
        <CardHeader>
          <CardTitle>Movement Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ... existing movement details ... */}
        </CardContent>
      </Card>

      {/* Workflow Progress */}
      {movement?.workflow_instance_id && (
        <WorkflowExecutionViewer
          instanceId={movement.workflow_instance_id}
          onComplete={() => {
            loadMovement();
            toast.success('Asset movement approved and executed');
          }}
        />
      )}
    </div>
  );
};
```

---

## 5. Notification Integration

### Update notificationService.ts

```typescript
// Add workflow notification types
export async function sendWorkflowNotification(
  userId: string,
  type: 'approval_required' | 'approved' | 'rejected',
  workflowName: string,
  entityType: string,
  entityId: string
) {
  const messages = {
    approval_required: `You have a pending approval for ${entityType}`,
    approved: `Your ${entityType} request has been approved`,
    rejected: `Your ${entityType} request has been rejected`
  };

  await supabase.from('notifications').insert({
    user_id: userId,
    title: `Workflow: ${workflowName}`,
    message: messages[type],
    type: 'workflow',
    link: `/workflow/instance/${entityId}`,
    created_date: new Date().toISOString()
  });
}
```

---

## 6. Permission Updates

### Update users table

```sql
-- Add workflow-related permissions
ALTER TABLE users
ADD COLUMN can_create_workflows BOOLEAN DEFAULT false,
ADD COLUMN can_manage_workflows BOOLEAN DEFAULT false;

-- Grant permissions to Super Admin
UPDATE users
SET 
  can_create_workflows = true,
  can_manage_workflows = true
WHERE role = 'Super Admin';
```

---

## 7. API Routes

### Add to App.tsx

```typescript
import { WorkflowBuilder } from './components/workflow/WorkflowBuilder';
import { PendingApprovalsDashboard } from './components/workflow/PendingApprovalsDashboard';

// Add routes
<Route path="/admin/workflows" element={
  <ProtectedRoute>
    <PermissionGuard path="/admin/workflows">
      <WorkflowManagementPage />
    </PermissionGuard>
  </ProtectedRoute>
} />

<Route path="/admin/workflows/builder/:workflowId?" element={
  <ProtectedRoute>
    <WorkflowBuilder />
  </ProtectedRoute>
} />

<Route path="/admin/approvals" element={
  <ProtectedRoute>
    <PendingApprovalsDashboard />
  </ProtectedRoute>
} />
```

---

## 8. Menu Integration

### Update roleBasedMenus.ts

```typescript
// Add workflow menu items
{
  title: 'Workflows',
  icon: GitBranch,
  items: [
    {
      title: 'Pending Approvals',
      href: '/admin/approvals',
      badge: pendingApprovalsCount
    },
    {
      title: 'Manage Workflows',
      href: '/admin/workflows',
      permission: 'can_manage_workflows'
    }
  ]
}
```

---

## 9. Testing Checklist

- [ ] Create default workflow for asset movements
- [ ] Test workflow creation via builder
- [ ] Test asset movement creation triggers workflow
- [ ] Test approval flow (single, all, any)
- [ ] Test rejection flow
- [ ] Test condition nodes
- [ ] Test SLA tracking and breach detection
- [ ] Test notification delivery
- [ ] Test workflow completion updates asset locations
- [ ] Test audit trail recording
- [ ] Test tenant isolation
- [ ] Test permission enforcement

---

## 10. Migration Script

```sql
-- Run this to set up initial workflows
BEGIN;

-- Create default workflow
INSERT INTO workflows (name, description, entity_type, is_default, is_active)
VALUES (
  'Default Asset Movement Approval',
  'Two-level approval for all asset movements',
  'asset_movement',
  true,
  true
) RETURNING id INTO @workflow_id;

-- Create START node
INSERT INTO workflow_nodes (workflow_id, node_id, node_type, label, position_x, position_y)
VALUES (@workflow_id, 'start-1', 'start', 'Start', 100, 100);

-- Create Manager Approval node
INSERT INTO workflow_nodes (
  workflow_id, node_id, node_type, label, position_x, position_y,
  approval_type, approver_user_ids, sla_hours
)
SELECT 
  @workflow_id, 'approval-1', 'approval', 'Manager Approval', 300, 100,
  'single', ARRAY[id], 24
FROM users
WHERE asset_movement_approver = true
LIMIT 1;

-- Create END node
INSERT INTO workflow_nodes (workflow_id, node_id, node_type, label, position_x, position_y)
VALUES (@workflow_id, 'end-1', 'end', 'End', 500, 100);

-- Create edges
INSERT INTO workflow_edges (workflow_id, edge_id, source_node_id, target_node_id)
VALUES 
  (@workflow_id, 'edge-1', 'start-1', 'approval-1'),
  (@workflow_id, 'edge-2', 'approval-1', 'end-1');

COMMIT;
```

---

## Complete Integration Flow

```
1. User creates asset movement
   ↓
2. System creates movement record (status: Pending)
   ↓
3. Workflow engine starts workflow instance
   ↓
4. First approval step created
   ↓
5. Notification sent to approver(s)
   ↓
6. Approver views pending approvals dashboard
   ↓
7. Approver reviews and approves/rejects
   ↓
8. Workflow engine moves to next step or completes
   ↓
9. On completion: Trigger fires
   ↓
10. Asset locations updated automatically
    ↓
11. History records created
    ↓
12. Notification sent to requester
```
