# Workflow Engine API Endpoints

## Base URL
```
/api/workflows
```

---

## 1. Workflow Management

### Create Workflow
```http
POST /api/workflows
```

**Request Body:**
```json
{
  "name": "Asset Movement Approval - Tech Park",
  "description": "Two-level approval for asset movements",
  "tenant_id": "uuid",
  "entity_type": "asset_movement",
  "nodes": [
    {
      "node_id": "start-1",
      "node_type": "start",
      "label": "Start",
      "position_x": 100,
      "position_y": 100
    },
    {
      "node_id": "approval-1",
      "node_type": "approval",
      "label": "Manager Approval",
      "position_x": 300,
      "position_y": 100,
      "approval_type": "single",
      "approver_user_ids": ["user-uuid-1"],
      "sla_hours": 24
    },
    {
      "node_id": "condition-1",
      "node_type": "condition",
      "label": "Check Movement Type",
      "position_x": 500,
      "position_y": 100,
      "condition_field": "movement_type",
      "condition_operator": "=",
      "condition_value": "Disposal"
    },
    {
      "node_id": "approval-2",
      "node_type": "approval",
      "label": "Finance Approval",
      "position_x": 700,
      "position_y": 50,
      "approval_type": "all",
      "approver_user_ids": ["user-uuid-2", "user-uuid-3"],
      "sla_hours": 48
    },
    {
      "node_id": "end-1",
      "node_type": "end",
      "label": "End",
      "position_x": 900,
      "position_y": 100
    }
  ],
  "edges": [
    {
      "edge_id": "edge-1",
      "source_node_id": "start-1",
      "target_node_id": "approval-1"
    },
    {
      "edge_id": "edge-2",
      "source_node_id": "approval-1",
      "target_node_id": "condition-1",
      "condition_label": "approved"
    },
    {
      "edge_id": "edge-3",
      "source_node_id": "condition-1",
      "target_node_id": "approval-2",
      "condition_label": "true"
    },
    {
      "edge_id": "edge-4",
      "source_node_id": "condition-1",
      "target_node_id": "end-1",
      "condition_label": "false"
    },
    {
      "edge_id": "edge-5",
      "source_node_id": "approval-2",
      "target_node_id": "end-1",
      "condition_label": "approved"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow-uuid",
    "name": "Asset Movement Approval - Tech Park",
    "version": 1,
    "is_active": false,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### Get Workflow
```http
GET /api/workflows/:workflowId
```

**Response:**
```json
{
  "workflow": {
    "id": "workflow-uuid",
    "name": "Asset Movement Approval",
    "version": 1,
    "is_active": true
  },
  "nodes": [...],
  "edges": [...]
}
```

---

### List Workflows
```http
GET /api/workflows?tenant_id=uuid&entity_type=asset_movement
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "workflow-uuid",
      "name": "Asset Movement Approval",
      "version": 2,
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### Update Workflow
```http
PUT /api/workflows/:workflowId
```

**Request Body:** (Same as create, partial updates allowed)

---

### Delete Workflow
```http
DELETE /api/workflows/:workflowId
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

---

### Publish Workflow
```http
POST /api/workflows/:workflowId/publish
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow-uuid",
    "is_active": true,
    "published_at": "2024-01-15T10:00:00Z"
  }
}
```

---

## 2. Workflow Execution

### Start Workflow
```http
POST /api/workflows/execute
```

**Request Body:**
```json
{
  "entity_type": "asset_movement",
  "entity_id": "movement-uuid",
  "tenant_id": "tenant-uuid",
  "context_data": {
    "movement_type": "Location",
    "total_assets": 5,
    "from_building": "Building A",
    "to_building": "Building B"
  }
}
```

**Response:**
```json
{
  "success": true,
  "instance": {
    "id": "instance-uuid",
    "workflow_id": "workflow-uuid",
    "status": "in_progress",
    "current_node_id": "approval-1",
    "started_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### Get Workflow Instance
```http
GET /api/workflows/instances/:instanceId
```

**Response:**
```json
{
  "instance": {
    "id": "instance-uuid",
    "status": "in_progress",
    "current_node_id": "approval-1"
  },
  "steps": [
    {
      "id": "step-uuid",
      "step_number": 1,
      "node_type": "approval",
      "status": "pending",
      "assigned_user_ids": ["user-uuid-1"],
      "required_approvals": 1,
      "received_approvals": 0,
      "sla_deadline": "2024-01-16T10:00:00Z"
    }
  ],
  "workflow": {
    "name": "Asset Movement Approval"
  }
}
```

---

### Get Entity Workflow History
```http
GET /api/workflows/entity/:entityType/:entityId
```

**Response:**
```json
{
  "instances": [
    {
      "id": "instance-uuid",
      "workflow_name": "Asset Movement Approval",
      "status": "completed",
      "started_at": "2024-01-15T10:00:00Z",
      "completed_at": "2024-01-16T14:30:00Z"
    }
  ]
}
```

---

## 3. Approval Actions

### Approve Step
```http
POST /api/workflows/steps/:stepId/approve
```

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "remarks": "Approved - all documents verified",
  "attachments": [
    {
      "url": "/uploads/approval-doc.pdf",
      "name": "approval-doc.pdf"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "step": {
    "id": "step-uuid",
    "status": "approved",
    "received_approvals": 1,
    "completed_at": "2024-01-15T11:00:00Z"
  },
  "workflow_completed": false
}
```

---

### Reject Step
```http
POST /api/workflows/steps/:stepId/reject
```

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "remarks": "Rejected - missing documentation"
}
```

**Response:**
```json
{
  "success": true,
  "step": {
    "id": "step-uuid",
    "status": "rejected"
  },
  "workflow_completed": true,
  "workflow_status": "rejected"
}
```

---

## 4. User Queries

### Get Pending Approvals
```http
GET /api/workflows/pending-approvals/:userId
```

**Response:**
```json
{
  "approvals": [
    {
      "step_id": "step-uuid",
      "instance_id": "instance-uuid",
      "entity_type": "asset_movement",
      "entity_id": "movement-uuid",
      "workflow_name": "Asset Movement Approval",
      "step_number": 1,
      "approval_type": "single",
      "sla_deadline": "2024-01-16T10:00:00Z",
      "is_sla_breached": false,
      "started_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### Get Eligible Approvers
```http
GET /api/workflows/approvers?tenant_id=uuid
```

**Response:**
```json
{
  "approvers": [
    {
      "id": "user-uuid-1",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

---

## 5. Analytics & Reporting

### Get Workflow Metrics
```http
GET /api/workflows/metrics?workflow_id=uuid&tenant_id=uuid
```

**Response:**
```json
{
  "metrics": [
    {
      "workflow_id": "workflow-uuid",
      "workflow_name": "Asset Movement Approval",
      "total_instances": 150,
      "completed_count": 120,
      "rejected_count": 10,
      "in_progress_count": 20,
      "avg_completion_hours": 18.5,
      "sla_breach_count": 5
    }
  ]
}
```

---

### Get Workflow Actions (Audit Trail)
```http
GET /api/workflows/instances/:instanceId/actions
```

**Response:**
```json
{
  "actions": [
    {
      "id": "action-uuid",
      "action_type": "approve",
      "action_by": "user-uuid",
      "action_by_name": "John Doe",
      "action_at": "2024-01-15T11:00:00Z",
      "remarks": "Approved - all documents verified",
      "step_number": 1
    }
  ]
}
```

---

## 6. Notifications

### Get Workflow Notifications
```http
GET /api/workflows/notifications/:userId?unread_only=true
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-uuid",
      "notification_type": "approval_required",
      "title": "Approval Required",
      "message": "You have a pending approval request (Step 1)",
      "link": "/workflow/approve/step-uuid",
      "is_read": false,
      "sent_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### Mark Notification as Read
```http
POST /api/workflows/notifications/:notificationId/read
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Workflow must have a START node",
    "details": [...]
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - User not authorized
- `WORKFLOW_ERROR` - Workflow execution error
- `SLA_BREACHED` - SLA deadline exceeded
- `ALREADY_ACTIONED` - Step already approved/rejected
