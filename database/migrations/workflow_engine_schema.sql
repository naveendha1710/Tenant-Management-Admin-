-- =====================================================
-- WORKFLOW ENGINE - DATABASE SCHEMA
-- =====================================================
-- Purpose: Complete workflow engine for asset movement approvals
-- Features: Multi-step approvals, conditions, versioning, audit trail
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. WORKFLOWS TABLE
-- =====================================================
-- Stores workflow definitions (templates)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'asset_movement', -- Future: invoice, expense, etc.
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Fallback workflow if tenant has none
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_workflow_version UNIQUE(tenant_id, entity_type, version),
    CONSTRAINT check_version_positive CHECK(version > 0)
);

-- Indexes for performance
CREATE INDEX idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_workflows_entity ON workflows(entity_type);
CREATE INDEX idx_workflows_default ON workflows(is_default, entity_type) WHERE is_default = true;

-- =====================================================
-- 2. WORKFLOW NODES TABLE
-- =====================================================
-- Stores individual nodes in workflow graph
CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- Client-generated ID for graph positioning
    node_type VARCHAR(50) NOT NULL, -- 'start', 'approval', 'condition', 'end'
    label VARCHAR(255),
    
    -- Position data for UI (canvas coordinates)
    position_x DECIMAL(10,2),
    position_y DECIMAL(10,2),
    
    -- Approval Node Configuration
    approval_type VARCHAR(50), -- 'single', 'all', 'any'
    approver_user_ids UUID[], -- Array of user IDs
    sla_hours INTEGER, -- SLA timeout in hours
    escalation_user_ids UUID[], -- Escalation approvers if SLA breached
    
    -- Condition Node Configuration
    condition_field VARCHAR(100), -- Field to evaluate (e.g., 'movement_type', 'total_assets')
    condition_operator VARCHAR(20), -- '=', '!=', '>', '<', '>=', '<=', 'contains', 'in'
    condition_value TEXT, -- Value to compare against
    
    -- Metadata
    metadata JSONB, -- Additional config (notifications, custom fields)
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_node_in_workflow UNIQUE(workflow_id, node_id),
    CONSTRAINT check_node_type CHECK(node_type IN ('start', 'approval', 'condition', 'end')),
    CONSTRAINT check_approval_type CHECK(approval_type IS NULL OR approval_type IN ('single', 'all', 'any')),
    CONSTRAINT check_sla_positive CHECK(sla_hours IS NULL OR sla_hours > 0)
);

-- Indexes
CREATE INDEX idx_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_nodes_type ON workflow_nodes(node_type);
CREATE INDEX idx_nodes_approvers ON workflow_nodes USING GIN(approver_user_ids);

-- =====================================================
-- 3. WORKFLOW EDGES TABLE
-- =====================================================
-- Stores connections between nodes (graph edges)
CREATE TABLE workflow_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    edge_id VARCHAR(100) NOT NULL, -- Client-generated ID
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    
    -- Condition for edge traversal
    condition_label VARCHAR(100), -- 'approved', 'rejected', 'true', 'false', 'default'
    condition_value TEXT, -- For condition nodes: expected value to take this path
    
    -- Edge metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_edge_in_workflow UNIQUE(workflow_id, edge_id),
    CONSTRAINT fk_source_node FOREIGN KEY (workflow_id, source_node_id) 
        REFERENCES workflow_nodes(workflow_id, node_id) ON DELETE CASCADE,
    CONSTRAINT fk_target_node FOREIGN KEY (workflow_id, target_node_id) 
        REFERENCES workflow_nodes(workflow_id, node_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX idx_edges_source ON workflow_edges(source_node_id);
CREATE INDEX idx_edges_target ON workflow_edges(target_node_id);

-- =====================================================
-- 4. WORKFLOW INSTANCES TABLE
-- =====================================================
-- Runtime instances of workflows (one per asset movement)
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    workflow_version INTEGER NOT NULL,
    
    -- Entity reference
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL, -- asset_movement.id
    tenant_id UUID REFERENCES tenants(id),
    
    -- Execution state
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected', 'cancelled', 'escalated'
    current_node_id VARCHAR(100), -- Current position in workflow
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Metadata
    context_data JSONB, -- Snapshot of entity data at workflow start
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT check_instance_status CHECK(status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled', 'escalated'))
);

-- Indexes for performance
CREATE INDEX idx_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX idx_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_instances_tenant ON workflow_instances(tenant_id);
CREATE INDEX idx_instances_status ON workflow_instances(status);
CREATE INDEX idx_instances_current_node ON workflow_instances(current_node_id);

-- =====================================================
-- 5. WORKFLOW INSTANCE STEPS TABLE
-- =====================================================
-- Tracks each step execution in workflow instance
CREATE TABLE workflow_instance_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,
    step_number INTEGER NOT NULL, -- Sequential step counter
    
    -- Step details
    node_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'skipped', 'escalated'
    
    -- Approval tracking
    assigned_user_ids UUID[], -- Users who can approve this step
    approval_type VARCHAR(50), -- 'single', 'all', 'any'
    required_approvals INTEGER, -- How many approvals needed
    received_approvals INTEGER DEFAULT 0, -- How many received so far
    
    -- SLA tracking
    sla_deadline TIMESTAMP, -- When SLA expires
    is_sla_breached BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP,
    escalated_to UUID[], -- Escalation approvers
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT check_step_status CHECK(status IN ('pending', 'approved', 'rejected', 'skipped', 'escalated')),
    CONSTRAINT check_step_number_positive CHECK(step_number > 0),
    CONSTRAINT check_approvals_positive CHECK(required_approvals IS NULL OR required_approvals > 0)
);

-- Indexes
CREATE INDEX idx_steps_instance ON workflow_instance_steps(instance_id);
CREATE INDEX idx_steps_status ON workflow_instance_steps(status);
CREATE INDEX idx_steps_assignees ON workflow_instance_steps USING GIN(assigned_user_ids);
CREATE INDEX idx_steps_sla ON workflow_instance_steps(sla_deadline) WHERE is_sla_breached = false;

-- =====================================================
-- 6. WORKFLOW ACTIONS TABLE
-- =====================================================
-- Audit trail of all actions taken on workflow steps
CREATE TABLE workflow_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_instance_steps(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- 'approve', 'reject', 'escalate', 'cancel', 'reassign'
    action_by UUID NOT NULL REFERENCES users(id),
    action_at TIMESTAMP DEFAULT NOW(),
    
    -- Action data
    remarks TEXT,
    attachments JSONB, -- Array of file URLs
    
    -- IP and user agent for security audit
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT check_action_type CHECK(action_type IN ('approve', 'reject', 'escalate', 'cancel', 'reassign', 'comment'))
);

-- Indexes
CREATE INDEX idx_actions_instance ON workflow_actions(instance_id);
CREATE INDEX idx_actions_step ON workflow_actions(step_id);
CREATE INDEX idx_actions_user ON workflow_actions(action_by);
CREATE INDEX idx_actions_timestamp ON workflow_actions(action_at DESC);

-- =====================================================
-- 7. WORKFLOW NOTIFICATIONS TABLE
-- =====================================================
-- Tracks notification delivery for workflow events
CREATE TABLE workflow_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id UUID REFERENCES workflow_instance_steps(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL, -- 'approval_required', 'approved', 'rejected', 'escalated', 'sla_warning'
    recipient_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Delivery tracking
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    
    -- Notification content
    title VARCHAR(255),
    message TEXT,
    link VARCHAR(500), -- Deep link to workflow UI
    
    -- Metadata
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT check_notification_type CHECK(notification_type IN 
        ('approval_required', 'approved', 'rejected', 'escalated', 'sla_warning', 'completed', 'cancelled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_instance ON workflow_notifications(instance_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON workflow_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_wf_notifications_unread ON workflow_notifications(is_read) WHERE is_read = false;

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function: Get active workflow for tenant and entity type
CREATE OR REPLACE FUNCTION get_active_workflow(
    p_tenant_id UUID,
    p_entity_type VARCHAR
)
RETURNS TABLE(workflow_id UUID, version INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.version
    FROM workflows w
    WHERE w.tenant_id = p_tenant_id
      AND w.entity_type = p_entity_type
      AND w.is_active = true
    ORDER BY w.version DESC
    LIMIT 1;
    
    -- If no tenant-specific workflow, return default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT w.id, w.version
        FROM workflows w
        WHERE w.is_default = true
          AND w.entity_type = p_entity_type
          AND w.is_active = true
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user can approve step
CREATE OR REPLACE FUNCTION can_user_approve_step(
    p_step_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_approve BOOLEAN;
BEGIN
    SELECT p_user_id = ANY(assigned_user_ids)
    INTO v_can_approve
    FROM workflow_instance_steps
    WHERE id = p_step_id
      AND status = 'pending';
    
    RETURN COALESCE(v_can_approve, false);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate SLA deadline
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
    p_started_at TIMESTAMP,
    p_sla_hours INTEGER
)
RETURNS TIMESTAMP AS $$
BEGIN
    IF p_sla_hours IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN p_started_at + (p_sla_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Trigger: Update workflow updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_timestamp
BEFORE UPDATE ON workflows
FOR EACH ROW
EXECUTE FUNCTION update_workflow_timestamp();

-- Trigger: Auto-increment workflow version
CREATE OR REPLACE FUNCTION auto_increment_workflow_version()
RETURNS TRIGGER AS $$
DECLARE
    v_max_version INTEGER;
BEGIN
    IF NEW.version IS NULL OR NEW.version = 1 THEN
        SELECT COALESCE(MAX(version), 0) + 1
        INTO v_max_version
        FROM workflows
        WHERE tenant_id = NEW.tenant_id
          AND entity_type = NEW.entity_type;
        
        NEW.version = v_max_version;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_increment_version
BEFORE INSERT ON workflows
FOR EACH ROW
EXECUTE FUNCTION auto_increment_workflow_version();

-- Trigger: Check SLA breach on step update
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sla_deadline IS NOT NULL AND NOW() > NEW.sla_deadline THEN
        NEW.is_sla_breached = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_sla_breach
BEFORE UPDATE ON workflow_instance_steps
FOR EACH ROW
EXECUTE FUNCTION check_sla_breach();

-- =====================================================
-- 10. VIEWS FOR REPORTING
-- =====================================================

-- View: Pending approvals per user
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT 
    wis.id AS step_id,
    wi.id AS instance_id,
    wi.entity_type,
    wi.entity_id,
    wi.tenant_id,
    wis.node_id,
    wis.step_number,
    wis.approval_type,
    wis.required_approvals,
    wis.received_approvals,
    wis.sla_deadline,
    wis.is_sla_breached,
    unnest(wis.assigned_user_ids) AS user_id,
    wis.started_at,
    w.name AS workflow_name
FROM workflow_instance_steps wis
JOIN workflow_instances wi ON wis.instance_id = wi.id
JOIN workflows w ON wi.workflow_id = w.id
WHERE wis.status = 'pending';

-- View: Workflow performance metrics
CREATE OR REPLACE VIEW v_workflow_metrics AS
SELECT 
    w.id AS workflow_id,
    w.name AS workflow_name,
    w.tenant_id,
    COUNT(wi.id) AS total_instances,
    COUNT(CASE WHEN wi.status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN wi.status = 'rejected' THEN 1 END) AS rejected_count,
    COUNT(CASE WHEN wi.status = 'in_progress' THEN 1 END) AS in_progress_count,
    AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))/3600) AS avg_completion_hours,
    COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM workflow_instance_steps wis 
        WHERE wis.instance_id = wi.id AND wis.is_sla_breached = true
    ) THEN 1 END) AS sla_breach_count
FROM workflows w
LEFT JOIN workflow_instances wi ON w.id = wi.workflow_id
GROUP BY w.id, w.name, w.tenant_id;

-- =====================================================
-- 11. SAMPLE DATA (FOR TESTING)
-- =====================================================

-- Insert default workflow (fallback)
INSERT INTO workflows (name, description, entity_type, is_default, is_active)
VALUES ('Default Asset Movement Approval', 'Fallback workflow for tenants without custom workflow', 'asset_movement', true, true);

-- =====================================================
-- END OF SCHEMA
-- =====================================================

COMMENT ON TABLE workflows IS 'Workflow definitions (templates) for approval processes';
COMMENT ON TABLE workflow_nodes IS 'Individual nodes in workflow graph (start, approval, condition, end)';
COMMENT ON TABLE workflow_edges IS 'Connections between workflow nodes (graph edges)';
COMMENT ON TABLE workflow_instances IS 'Runtime instances of workflows (one per entity)';
COMMENT ON TABLE workflow_instance_steps IS 'Individual step executions within workflow instance';
COMMENT ON TABLE workflow_actions IS 'Audit trail of all actions taken on workflow steps';
COMMENT ON TABLE workflow_notifications IS 'Notification delivery tracking for workflow events';
