// =====================================================
// WORKFLOW SERVICE
// =====================================================
// Purpose: Service layer for workflow management
// Features: CRUD operations, validation, queries
// =====================================================

import { supabase } from '../lib/supabaseClient';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowInstance,
  WorkflowInstanceStep,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  PendingApproval,
  WorkflowMetrics,
  WorkflowValidationResult,
  WorkflowValidationError,
  NodeType
} from '../types/workflow.types';

export class WorkflowService {
  
  // =====================================================
  // WORKFLOW CRUD
  // =====================================================
  
  /**
   * Creates a new workflow
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    try {
      // 1. Validate workflow structure
      const validation = this.validateWorkflow(request.nodes, request.edges);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      // 2. Create workflow record
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert({
          name: request.name,
          description: request.description,
          tenant_id: request.tenant_id,
          entity_type: request.entity_type,
          is_active: false, // Start as draft
          is_default: false
        })
        .select()
        .single();
      
      if (workflowError) throw workflowError;
      
      // 3. Create nodes
      const nodesWithWorkflowId = request.nodes.map(node => ({
        node_id: node.node_id,
        workflow_id: workflow.id,
        node_type: node.node_type,
        label: node.label,
        position_x: node.position_x,
        position_y: node.position_y,
        approval_type: node.approval_type,
        approver_user_ids: node.approver_user_ids,
        sla_hours: node.sla_hours,
        escalation_user_ids: node.escalation_user_ids,
        condition_field: node.condition_field,
        condition_operator: node.condition_operator,
        condition_value: node.condition_value,
        end_type: (node as any).end_type // Include END node type
      }));
      
      const { error: nodesError } = await supabase
        .from('workflow_nodes')
        .insert(nodesWithWorkflowId);
      
      if (nodesError) throw nodesError;
      
      // 4. Create edges
      const edgesWithWorkflowId = request.edges.map(edge => ({
        edge_id: edge.edge_id,
        workflow_id: workflow.id,
        source_node_id: edge.source_node_id,
        target_node_id: edge.target_node_id,
        condition_label: edge.condition_label
      }));
      
      const { error: edgesError } = await supabase
        .from('workflow_edges')
        .insert(edgesWithWorkflowId);
      
      if (edgesError) throw edgesError;
      
      return workflow;
      
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }
  
  /**
   * Updates existing workflow
   */
  async updateWorkflow(workflowId: string, request: UpdateWorkflowRequest): Promise<Workflow> {
    try {
      // 1. Update workflow metadata
      const updateData: any = {};
      if (request.name) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.tenant_id !== undefined) updateData.tenant_id = request.tenant_id;
      if (request.is_active !== undefined) updateData.is_active = request.is_active;
      
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', workflowId)
        .select()
        .single();
      
      if (workflowError) throw workflowError;
      
      // 2. If nodes/edges provided, replace them
      if (request.nodes && request.edges) {
        // Delete existing nodes and edges
        await supabase.from('workflow_nodes').delete().eq('workflow_id', workflowId);
        await supabase.from('workflow_edges').delete().eq('workflow_id', workflowId);
        
        // Insert new nodes
        const nodesWithWorkflowId = request.nodes.map(node => ({
          ...node,
          workflow_id: workflowId
        }));
        await supabase.from('workflow_nodes').insert(nodesWithWorkflowId);
        
        // Insert new edges
        const edgesWithWorkflowId = request.edges.map(edge => ({
          ...edge,
          workflow_id: workflowId
        }));
        await supabase.from('workflow_edges').insert(edgesWithWorkflowId);
      }
      
      return workflow;
      
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }
  
  /**
   * Deletes workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    // Check if workflow has active instances (pending or in_progress)
    const { data: activeInstances } = await supabase
      .from('workflow_instances')
      .select('id')
      .eq('workflow_id', workflowId)
      .in('status', ['pending', 'in_progress'])
      .limit(1);
    
    if (activeInstances && activeInstances.length > 0) {
      throw new Error('Cannot delete workflow with pending or in-progress instances. Please wait for them to complete or reject them first.');
    }
    
    // Allow deletion even if there are completed/rejected instances (for historical data)
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', workflowId);
    
    if (error) throw error;
  }
  
  /**
   * Publishes workflow (activates it)
   */
  async publishWorkflow(workflowId: string): Promise<Workflow> {
    // Get workflow details
    const { data: workflow } = await supabase
      .from('workflows')
      .select('tenant_id, entity_type')
      .eq('id', workflowId)
      .single();
    
    if (workflow && workflow.tenant_id) {
      // Only deactivate for tenant workflows
      // System workflows can have multiple active (different users)
      await supabase
        .from('workflows')
        .update({ is_active: false })
        .eq('tenant_id', workflow.tenant_id)
        .eq('entity_type', workflow.entity_type)
        .neq('id', workflowId);
    }
    
    // Activate this workflow
    const { data: updated, error } = await supabase
      .from('workflows')
      .update({
        is_active: true,
        published_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }
  
  // =====================================================
  // WORKFLOW QUERIES
  // =====================================================
  
  /**
   * Gets workflow by ID with nodes and edges
   */
  async getWorkflowById(workflowId: string): Promise<{
    workflow: Workflow;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null> {
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();
    
    if (workflowError || !workflow) return null;
    
    const { data: nodes } = await supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId);
    
    const { data: edges } = await supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId);
    
    return {
      workflow,
      nodes: nodes || [],
      edges: edges || []
    };
  }
  
  /**
   * Lists workflows for tenant
   */
  async listWorkflows(tenantId?: string, entityType?: string): Promise<Workflow[]> {
    let query = supabase.from('workflows').select('*');
    
    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (entityType) query = query.eq('entity_type', entityType);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Gets pending approvals for user
   */
  async getPendingApprovals(userId: string): Promise<PendingApproval[]> {
    const { data, error } = await supabase
      .from('v_pending_approvals')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Gets workflow instance details
   */
  async getWorkflowInstance(instanceId: string): Promise<{
    instance: WorkflowInstance;
    steps: WorkflowInstanceStep[];
    workflow: Workflow;
  } | null> {
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('id', instanceId)
      .single();
    
    if (instanceError || !instance) return null;
    
    const { data: steps } = await supabase
      .from('workflow_instance_steps')
      .select('*')
      .eq('instance_id', instanceId)
      .order('step_number', { ascending: true });
    
    const { data: workflow } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', instance.workflow_id)
      .single();
    
    return {
      instance,
      steps: steps || [],
      workflow: workflow!
    };
  }
  
  /**
   * Gets workflow metrics
   */
  async getWorkflowMetrics(workflowId?: string, tenantId?: string): Promise<WorkflowMetrics[]> {
    let query = supabase.from('v_workflow_metrics').select('*');
    
    if (workflowId) query = query.eq('workflow_id', workflowId);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Gets workflow instances for entity
   */
  async getEntityWorkflowInstances(entityType: string, entityId: string): Promise<WorkflowInstance[]> {
    const { data, error } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('started_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  // =====================================================
  // VALIDATION
  // =====================================================
  
  /**
   * Validates workflow structure
   */
  validateWorkflow(
    nodes: Omit<WorkflowNode, 'id' | 'workflow_id' | 'created_at'>[],
    edges: Omit<WorkflowEdge, 'id' | 'workflow_id' | 'created_at'>[]
  ): WorkflowValidationResult {
    const errors: WorkflowValidationError[] = [];
    
    // 1. Must have at least one MOVEMENT_REQUEST node
    const movementRequestNodes = nodes.filter(n => n.node_type === NodeType.MOVEMENT_REQUEST);
    if (movementRequestNodes.length === 0) {
      errors.push({ field: 'nodes', message: 'Workflow must have a MOVEMENT_REQUEST node' });
    } else if (movementRequestNodes.length > 1) {
      errors.push({ field: 'nodes', message: 'Workflow can only have one MOVEMENT_REQUEST node' });
    }
    
    // 2. Must have at least one END node
    const endNodes = nodes.filter(n => n.node_type === NodeType.END);
    if (endNodes.length === 0) {
      errors.push({ field: 'nodes', message: 'Workflow must have at least one END node' });
    }
    
    // 3. All nodes must be connected
    const nodeIds = new Set(nodes.map(n => n.node_id));
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source_node_id)) {
        errors.push({
          field: 'edges',
          message: `Edge references non-existent source node: ${edge.source_node_id}`
        });
      }
      if (!nodeIds.has(edge.target_node_id)) {
        errors.push({
          field: 'edges',
          message: `Edge references non-existent target node: ${edge.target_node_id}`
        });
      }
    });
    
    // 4. Approval nodes must have approvers
    nodes.forEach(node => {
      if (node.node_type === NodeType.APPROVAL) {
        if (!node.approver_user_ids || node.approver_user_ids.length === 0) {
          errors.push({
            field: 'nodes',
            message: `Approval node "${node.label}" must have at least one approver`,
            node_id: node.node_id
          });
        }
        if (!node.approval_type) {
          errors.push({
            field: 'nodes',
            message: `Approval node "${node.label}" must have approval type`,
            node_id: node.node_id
          });
        }
      }
    });
    
    // 5. Check for orphaned nodes (no incoming edges except MOVEMENT_REQUEST)
    const targetNodes = new Set(edges.map(e => e.target_node_id));
    nodes.forEach(node => {
      if (node.node_type !== NodeType.MOVEMENT_REQUEST && !targetNodes.has(node.node_id)) {
        errors.push({
          field: 'nodes',
          message: `Node "${node.label}" is not reachable (no incoming edges)`,
          node_id: node.node_id
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Gets users eligible as approvers (includes admin users, tenant main users, and tenant sub-users)
   */
  async getEligibleApprovers(tenantId?: string): Promise<Array<{id: string; name: string; email: string; role: string}>> {
    // Get admin users who are approvers (only users with role 'Admin' or 'Super Admin')
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('asset_movement_approver', true)
      .eq('is_active', true)
      .in('role', ['Admin', 'Super Admin'])
      .order('name');
    
    if (adminError) throw adminError;
    
    // Get tenant users if tenantId is provided
    let tenantMainUsers: any[] = [];
    let tenantSubUsers: any[] = [];
    
    if (tenantId) {
      // Get main tenant record
      const { data: mainTenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, company, email')
        .eq('id', tenantId)
        .in('status', ['Active', 'Pending Move-In']);
      
      if (!tenantError && mainTenant) {
        tenantMainUsers = mainTenant.map(t => ({
          id: t.id,
          name: t.name || t.company,
          email: t.email,
          role: 'Tenant (Main)'
        }));
      }
      
      // Get tenant sub-users (users with tenant_id matching this tenant AND asset_movement_approver enabled)
      const { data: subUsers, error: subUsersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('tenant_id', tenantId)
        .eq('asset_movement_approver', true)
        .eq('is_active', true)
        .order('name');
      
      if (!subUsersError && subUsers) {
        tenantSubUsers = subUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: 'Tenant User'
        }));
      }
    }
    
    // Combine all users
    const allUsers = [
      ...(adminUsers || []).map(u => ({ ...u, role: u.role || 'Admin' })),
      ...tenantMainUsers,
      ...tenantSubUsers
    ];
    
    // Remove duplicates based on email (prioritize users table over tenants table)
    const uniqueUsers = allUsers.reduce((acc, user) => {
      const existingIndex = acc.findIndex(u => u.email === user.email);
      if (existingIndex === -1) {
        acc.push(user);
      } else {
        // If duplicate found, prioritize Tenant User over Tenant (Main)
        if (user.role === 'Tenant User' && acc[existingIndex].role === 'Tenant (Main)') {
          acc[existingIndex] = user;
        }
      }
      return acc;
    }, [] as Array<{id: string; name: string; email: string; role: string}>);
    
    return uniqueUsers;
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
