// =====================================================
// WORKFLOW ENGINE - TYPESCRIPT TYPES
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export enum NodeType {
  MOVEMENT_REQUEST = 'MOVEMENT_REQUEST',
  APPROVAL = 'APPROVAL',
  CONDITION_APPROVED = 'CONDITION_APPROVED',
  CONDITION_REJECTED = 'CONDITION_REJECTED',
  END = 'END'
}

export enum ApprovalType {
  ANY = 'any',            // Any one approver
  ALL = 'all'             // All must approve
}

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  ESCALATED = 'escalated'
}

export enum StepStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
  ESCALATED = 'escalated'
}

export enum ActionType {
  APPROVE = 'approve',
  REJECT = 'reject',
  ESCALATE = 'escalate',
  CANCEL = 'cancel',
  REASSIGN = 'reassign',
  COMMENT = 'comment'
}

export enum ConditionOperator {
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum NotificationType {
  APPROVAL_REQUIRED = 'approval_required',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  SLA_WARNING = 'sla_warning',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// =====================================================
// WORKFLOW DEFINITION TYPES
// =====================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tenant_id?: string;
  entity_type: string;
  version: number;
  is_active: boolean;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_id: string;
  node_type: NodeType;
  label?: string;
  
  // Position for canvas
  position_x?: number;
  position_y?: number;
  
  // Approval configuration
  approval_type?: ApprovalType;
  approver_user_ids?: string[];
  sla_hours?: number;
  escalation_user_ids?: string[];
  
  // Condition configuration
  condition_field?: string;
  condition_operator?: ConditionOperator;
  condition_value?: string;
  
  metadata?: Record<string, any>;
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  condition_label?: string;
  condition_value?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// =====================================================
// WORKFLOW INSTANCE TYPES (Runtime)
// =====================================================

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  workflow_version: number;
  entity_type: string;
  entity_id: string;
  tenant_id?: string;
  status: WorkflowStatus;
  current_node_id?: string;
  started_at: string;
  completed_at?: string;
  context_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface WorkflowInstanceStep {
  id: string;
  instance_id: string;
  node_id: string;
  step_number: number;
  node_type: NodeType;
  status: StepStatus;
  
  // Approval tracking
  assigned_user_ids?: string[];
  approval_type?: ApprovalType;
  required_approvals?: number;
  received_approvals: number;
  
  // SLA tracking
  sla_deadline?: string;
  is_sla_breached: boolean;
  escalated_at?: string;
  escalated_to?: string[];
  
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowAction {
  id: string;
  instance_id: string;
  step_id: string;
  action_type: ActionType;
  action_by: string;
  action_at: string;
  remarks?: string;
  attachments?: Array<{url: string; name: string}>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowNotification {
  id: string;
  instance_id: string;
  step_id?: string;
  notification_type: NotificationType;
  recipient_user_id: string;
  sent_at: string;
  read_at?: string;
  is_read: boolean;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

// =====================================================
// WORKFLOW BUILDER TYPES (Frontend)
// =====================================================

export interface WorkflowBuilderNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: ApprovalNodeConfig | ConditionNodeConfig;
  };
}

export interface ApprovalNodeConfig {
  approval_type: ApprovalType;
  approver_user_ids: string[];
  sla_hours?: number;
  escalation_user_ids?: string[];
  notification_template?: string;
}

export interface ConditionNodeConfig {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
  description?: string;
}

export interface WorkflowBuilderEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'approved' | 'rejected' | 'true' | 'false';
}

export interface WorkflowBuilderData {
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  tenant_id?: string;
  entity_type: string;
  nodes: Omit<WorkflowNode, 'id' | 'workflow_id' | 'created_at'>[];
  edges: Omit<WorkflowEdge, 'id' | 'workflow_id' | 'created_at'>[];
}

export interface UpdateWorkflowRequest extends Partial<CreateWorkflowRequest> {
  is_active?: boolean;
  tenant_id?: string;
}

export interface ExecuteWorkflowRequest {
  entity_type: string;
  entity_id: string;
  tenant_id?: string;
  context_data?: Record<string, any>;
}

export interface ApproveStepRequest {
  step_id: string;
  user_id: string;
  remarks?: string;
  attachments?: Array<{url: string; name: string}>;
}

export interface RejectStepRequest extends ApproveStepRequest {}

// =====================================================
// VIEW TYPES (Database Views)
// =====================================================

export interface PendingApproval {
  step_id: string;
  instance_id: string;
  entity_type: string;
  entity_id: string;
  tenant_id?: string;
  node_id: string;
  step_number: number;
  approval_type: ApprovalType;
  required_approvals: number;
  received_approvals: number;
  sla_deadline?: string;
  is_sla_breached: boolean;
  user_id: string;
  started_at: string;
  workflow_name: string;
}

export interface WorkflowMetrics {
  workflow_id: string;
  workflow_name: string;
  tenant_id?: string;
  total_instances: number;
  completed_count: number;
  rejected_count: number;
  in_progress_count: number;
  avg_completion_hours: number;
  sla_breach_count: number;
}

// =====================================================
// WORKFLOW EXECUTION TYPES
// =====================================================

export interface WorkflowExecutionContext {
  instance: WorkflowInstance;
  current_step: WorkflowInstanceStep;
  workflow: Workflow;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entity_data: Record<string, any>;
}

export interface NextNodeResult {
  next_node: WorkflowNode | null;
  should_complete: boolean;
  error?: string;
}

export interface StepExecutionResult {
  success: boolean;
  step: WorkflowInstanceStep;
  next_node?: WorkflowNode;
  completed: boolean;
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface WorkflowValidationError {
  field: string;
  message: string;
  node_id?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
}

export interface WorkflowGraph {
  nodes: Map<string, WorkflowNode>;
  edges: Map<string, WorkflowEdge[]>; // source_node_id -> edges
  start_node: WorkflowNode | null;
  end_nodes: WorkflowNode[];
}
