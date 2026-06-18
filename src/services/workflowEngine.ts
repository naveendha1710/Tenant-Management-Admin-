// =====================================================
// WORKFLOW EXECUTION ENGINE
// =====================================================
// Purpose: Core engine for executing workflows
// Features: Graph traversal, condition evaluation, approval logic
// =====================================================

import { supabase } from '../lib/supabaseClient';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowInstance,
  WorkflowInstanceStep,
  WorkflowAction,
  NodeType,
  WorkflowStatus,
  StepStatus,
  ActionType,
  ApprovalType,
  ConditionOperator,
  WorkflowExecutionContext,
  NextNodeResult,
  StepExecutionResult,
  WorkflowGraph
} from '../types/workflow.types';

export class WorkflowExecutionEngine {
  
  // =====================================================
  // 1. START WORKFLOW
  // =====================================================
  
  /**
   * Initiates a new workflow instance for an entity
   */
  async startWorkflow(
    entityType: string,
    entityId: string,
    tenantId?: string,
    contextData?: Record<string, any>,
    userId?: string
  ): Promise<WorkflowInstance> {
    try {
      console.log('[WorkflowEngine] Starting workflow for user:', userId);
      
      // 1. Find active workflow for tenant or system user
      const workflow = await this.getActiveWorkflow(tenantId, entityType, userId);
      
      if (!workflow) {
        throw new Error(`No active workflow found for entity type: ${entityType}`);
      }
      
      console.log('[WorkflowEngine] Found workflow:', workflow.id, workflow.name);
      
      // 2. Load workflow graph
      const graph = await this.loadWorkflowGraph(workflow.id);
      
      console.log('[WorkflowEngine] Loaded graph with nodes:', Array.from(graph.nodes.values()).map(n => ({ type: n.node_type, approvers: n.approver_user_ids })));
      
      if (!graph.start_node) {
        throw new Error('Workflow has no movement request node');
      }
      
      // 3. Create workflow instance
      const { data: instance, error } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_id: workflow.id,
          workflow_version: workflow.version,
          entity_type: entityType,
          entity_id: entityId,
          tenant_id: tenantId,
          status: WorkflowStatus.IN_PROGRESS,
          current_node_id: graph.start_node.node_id,
          context_data: contextData,
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // 4. Move to first approval node (after MOVEMENT_REQUEST)
      await this.moveToNextNode(instance, graph);
      
      // 5. Store all approver IDs in the movement record for quick access
      if (entityType === 'asset_movement') {
        const allApproverIds = this.getAllApproverIds(graph);
        console.log('[WorkflowEngine] All approver IDs from graph:', allApproverIds);
        
        await supabase
          .from('asset_movements')
          .update({ workflow_approver_ids: allApproverIds })
          .eq('id', entityId);
      }
      
      return instance;
      
    } catch (error) {
      console.error('Error starting workflow:', error);
      throw error;
    }
  }
  
  // =====================================================
  // 2. GRAPH TRAVERSAL
  // =====================================================
  
  /**
   * Moves workflow instance to next node
   */
  private async moveToNextNode(
    instance: WorkflowInstance,
    graph: WorkflowGraph,
    conditionResult?: string
  ): Promise<void> {
    const currentNode = graph.nodes.get(instance.current_node_id!);
    
    if (!currentNode) {
      throw new Error(`Current node not found: ${instance.current_node_id}`);
    }
    
    // Get outgoing edges from current node
    const outgoingEdges = graph.edges.get(currentNode.node_id) || [];
    
    // Determine next node based on node type
    let nextEdge: WorkflowEdge | null = null;
    
    if (currentNode.node_type === NodeType.MOVEMENT_REQUEST) {
      // MOVEMENT_REQUEST node: take default edge
      nextEdge = outgoingEdges[0] || null;
      
    } else if (currentNode.node_type === NodeType.CONDITION_APPROVED || currentNode.node_type === NodeType.CONDITION_REJECTED) {
      // CONDITION nodes: take default edge (condition already evaluated by approval result)
      nextEdge = outgoingEdges[0] || null;
      
    } else if (currentNode.node_type === NodeType.APPROVAL) {
      // APPROVAL node: route based on approval/rejection result
      if (conditionResult === 'approved') {
        // Find edge to CONDITION_APPROVED node
        nextEdge = outgoingEdges.find(e => {
          const targetNode = graph.nodes.get(e.target_node_id);
          return targetNode?.node_type === NodeType.CONDITION_APPROVED;
        }) || outgoingEdges[0] || null;
      } else if (conditionResult === 'rejected') {
        // Find edge to CONDITION_REJECTED node
        nextEdge = outgoingEdges.find(e => {
          const targetNode = graph.nodes.get(e.target_node_id);
          return targetNode?.node_type === NodeType.CONDITION_REJECTED;
        }) || outgoingEdges[0] || null;
      } else {
        // No condition result yet (step not complete), don't move
        return;
      }
    }
    
    if (!nextEdge) {
      // No next node - workflow incomplete or end reached
      throw new Error(`Workflow graph incomplete: No outgoing edge from ${currentNode.node_type} node`);
    }
    
    const nextNode = graph.nodes.get(nextEdge.target_node_id);
    
    if (!nextNode) {
      throw new Error(`Next node not found: ${nextEdge.target_node_id}`);
    }
    
    // Update instance current node
    await supabase
      .from('workflow_instances')
      .update({ current_node_id: nextNode.node_id })
      .eq('id', instance.id);
    
    // Handle next node based on type
    if (nextNode.node_type === NodeType.END) {
      // Check END node type to determine workflow result
      const endType = (nextNode as any).end_type || 'approved';
      const finalStatus = endType === 'approved' ? WorkflowStatus.COMPLETED : WorkflowStatus.REJECTED;
      await this.completeWorkflow(instance.id, finalStatus);
      
    } else if (nextNode.node_type === NodeType.APPROVAL) {
      await this.createApprovalStep(instance.id, nextNode);
      
    } else if (nextNode.node_type === NodeType.CONDITION_APPROVED || nextNode.node_type === NodeType.CONDITION_REJECTED) {
      // Auto-traverse condition nodes
      instance.current_node_id = nextNode.node_id;
      await this.moveToNextNode(instance, graph, conditionResult);
    }
  }
  
  // =====================================================
  // 3. APPROVAL STEP CREATION
  // =====================================================
  
  /**
   * Creates a new approval step
   */
  private async createApprovalStep(
    instanceId: string,
    node: WorkflowNode
  ): Promise<WorkflowInstanceStep> {
    
    // Calculate required approvals based on approval type
    let requiredApprovals = 1;
    if (node.approval_type === ApprovalType.ALL) {
      requiredApprovals = node.approver_user_ids?.length || 1;
    } else if (node.approval_type === ApprovalType.SINGLE || node.approval_type === ApprovalType.ANY) {
      requiredApprovals = 1;
    }
    
    // Calculate SLA deadline
    const slaDeadline = node.sla_hours
      ? new Date(Date.now() + node.sla_hours * 60 * 60 * 1000).toISOString()
      : null;
    
    // Get current step number
    const { data: existingSteps } = await supabase
      .from('workflow_instance_steps')
      .select('step_number')
      .eq('instance_id', instanceId)
      .order('step_number', { ascending: false })
      .limit(1);
    
    const stepNumber = (existingSteps?.[0]?.step_number || 0) + 1;
    
    // Create step
    const { data: step, error } = await supabase
      .from('workflow_instance_steps')
      .insert({
        instance_id: instanceId,
        node_id: node.node_id,
        step_number: stepNumber,
        node_type: node.node_type,
        status: StepStatus.PENDING,
        assigned_user_ids: node.approver_user_ids,
        approval_type: node.approval_type,
        required_approvals: requiredApprovals,
        received_approvals: 0,
        sla_deadline: slaDeadline,
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Send notifications to approvers
    await this.notifyApprovers(step);
    
    return step;
  }
  
  // =====================================================
  // 4. APPROVAL ACTIONS
  // =====================================================
  
  /**
   * Handles approval action
   */
  async approveStep(
    stepId: string,
    userId: string,
    remarks?: string,
    attachments?: Array<{url: string; name: string}>
  ): Promise<StepExecutionResult> {
    try {
      // 1. Validate user can approve
      const canApprove = await this.canUserApprove(stepId, userId);
      if (!canApprove) {
        throw new Error('User not authorized to approve this step');
      }
      
      // 2. Get step details
      const { data: step, error: stepError } = await supabase
        .from('workflow_instance_steps')
        .select('*')
        .eq('id', stepId)
        .single();
      
      if (stepError || !step) throw new Error('Step not found');
      
      if (step.status !== StepStatus.PENDING) {
        throw new Error('Step is not in pending state');
      }
      
      // 3. Record action
      await this.recordAction(step.instance_id, stepId, ActionType.APPROVE, userId, remarks, attachments);
      
      // 4. Update approval count
      const newApprovalCount = step.received_approvals + 1;
      
      // 5. Check if step is complete
      const isStepComplete = newApprovalCount >= step.required_approvals;
      
      const updateData: any = {
        received_approvals: newApprovalCount
      };
      
      if (isStepComplete) {
        updateData.status = StepStatus.APPROVED;
        updateData.completed_at = new Date().toISOString();
      }
      
      await supabase
        .from('workflow_instance_steps')
        .update(updateData)
        .eq('id', stepId);
      
      // 6. If step complete, move to next node
      if (isStepComplete) {
        const { data: instance } = await supabase
          .from('workflow_instances')
          .select('*')
          .eq('id', step.instance_id)
          .single();
        
        if (instance) {
          try {
            const graph = await this.loadWorkflowGraph(instance.workflow_id);
            // Pass 'approved' to indicate approval path
            await this.moveToNextNode(instance, graph, 'approved');
          } catch (moveError) {
            console.error('Error moving to next node:', moveError);
            // Don't throw - step is already approved, just log the error
            // The workflow will still be marked as approved
          }
        }
      }
      
      return {
        success: true,
        step: { ...step, ...updateData },
        completed: isStepComplete
      };
      
    } catch (error) {
      console.error('Error approving step:', error);
      return {
        success: false,
        step: null as any,
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Handles rejection action
   */
  async rejectStep(
    stepId: string,
    userId: string,
    remarks?: string,
    attachments?: Array<{url: string; name: string}>
  ): Promise<StepExecutionResult> {
    try {
      // 1. Validate user can reject
      const canApprove = await this.canUserApprove(stepId, userId);
      if (!canApprove) {
        throw new Error('User not authorized to reject this step');
      }
      
      // 2. Get step details
      const { data: step, error: stepError } = await supabase
        .from('workflow_instance_steps')
        .select('*')
        .eq('id', stepId)
        .single();
      
      if (stepError || !step) throw new Error('Step not found');
      
      // 3. Record action
      await this.recordAction(step.instance_id, stepId, ActionType.REJECT, userId, remarks, attachments);
      
      // 4. Update step status
      await supabase
        .from('workflow_instance_steps')
        .update({
          status: StepStatus.REJECTED,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepId);
      
      // 5. Get workflow instance and graph to follow rejection path
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('id', step.instance_id)
        .single();
      
      if (instance) {
        const graph = await this.loadWorkflowGraph(instance.workflow_id);
        // Follow the graph - move to CONDITION_REJECTED node
        await this.moveToNextNode(instance, graph, 'rejected');
      }
      
      return {
        success: true,
        step: { ...step, status: StepStatus.REJECTED },
        completed: true
      };
      
    } catch (error) {
      console.error('Error rejecting step:', error);
      return {
        success: false,
        step: null as any,
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // =====================================================
  // 5. CONDITION EVALUATION
  // =====================================================
  
  /**
   * Evaluates condition node
   */
  private async evaluateCondition(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<string> {
    if (!node.condition_field || !node.condition_operator) {
      return 'true'; // Default path
    }
    
    // Get entity data from context
    const entityData = instance.context_data || {};
    const fieldValue = entityData[node.condition_field];
    const expectedValue = node.condition_value;
    
    let result = false;
    
    switch (node.condition_operator) {
      case ConditionOperator.EQUALS:
        result = fieldValue == expectedValue;
        break;
      case ConditionOperator.NOT_EQUALS:
        result = fieldValue != expectedValue;
        break;
      case ConditionOperator.GREATER_THAN:
        result = Number(fieldValue) > Number(expectedValue);
        break;
      case ConditionOperator.LESS_THAN:
        result = Number(fieldValue) < Number(expectedValue);
        break;
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        result = Number(fieldValue) >= Number(expectedValue);
        break;
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        result = Number(fieldValue) <= Number(expectedValue);
        break;
      case ConditionOperator.CONTAINS:
        result = String(fieldValue).includes(String(expectedValue));
        break;
      case ConditionOperator.IN:
        const values = String(expectedValue).split(',').map(v => v.trim());
        result = values.includes(String(fieldValue));
        break;
      default:
        result = false;
    }
    
    return result ? 'true' : 'false';
  }
  
  // =====================================================
  // 6. HELPER METHODS
  // =====================================================
  
  /**
   * Gets active workflow for tenant or system user
   */
  private async getActiveWorkflow(
    tenantId: string | undefined,
    entityType: string,
    userId?: string
  ): Promise<Workflow | null> {
    const { data, error } = await supabase.rpc('get_active_workflow', {
      p_tenant_id: tenantId || null,
      p_entity_type: entityType,
      p_user_id: userId || null
    });
    
    if (error || !data || data.length === 0) return null;
    
    const { data: workflow } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', data[0].workflow_id)
      .single();
    
    return workflow;
  }
  
  /**
   * Loads workflow graph structure
   */
  private async loadWorkflowGraph(workflowId: string): Promise<WorkflowGraph> {
    // Load nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId);
    
    if (nodesError) throw nodesError;
    
    // Load edges
    const { data: edges, error: edgesError } = await supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId);
    
    if (edgesError) throw edgesError;
    
    // Build graph structure
    const nodeMap = new Map<string, WorkflowNode>();
    const edgeMap = new Map<string, WorkflowEdge[]>();
    let startNode: WorkflowNode | null = null;
    const endNodes: WorkflowNode[] = [];
    
    nodes?.forEach(node => {
      nodeMap.set(node.node_id, node);
      if (node.node_type === NodeType.MOVEMENT_REQUEST) startNode = node;
      if (node.node_type === NodeType.END) endNodes.push(node);
    });
    
    edges?.forEach(edge => {
      const existing = edgeMap.get(edge.source_node_id) || [];
      existing.push(edge);
      edgeMap.set(edge.source_node_id, existing);
    });
    
    return {
      nodes: nodeMap,
      edges: edgeMap,
      start_node: startNode,
      end_nodes: endNodes
    };
  }
  
  /**
   * Checks if user can approve step
   */
  private async canUserApprove(stepId: string, userId: string): Promise<boolean> {
    const { data } = await supabase.rpc('can_user_approve_step', {
      p_step_id: stepId,
      p_user_id: userId
    });
    
    return data === true;
  }
  
  /**
   * Records workflow action
   */
  private async recordAction(
    instanceId: string,
    stepId: string,
    actionType: ActionType,
    userId: string,
    remarks?: string,
    attachments?: Array<{url: string; name: string}>
  ): Promise<void> {
    await supabase
      .from('workflow_actions')
      .insert({
        instance_id: instanceId,
        step_id: stepId,
        action_type: actionType,
        action_by: userId,
        remarks,
        attachments,
        action_at: new Date().toISOString()
      });
  }
  
  /**
   * Completes workflow instance
   */
  private async completeWorkflow(
    instanceId: string,
    status: WorkflowStatus
  ): Promise<void> {
    // First update the workflow status
    await supabase
      .from('workflow_instances')
      .update({
        status,
        completed_at: new Date().toISOString()
      })
      .eq('id', instanceId);
    
    // Then try to update entity - if this fails, workflow is still marked complete
    try {
      await this.updateEntityOnCompletion(instanceId, status);
    } catch (entityUpdateError) {
      console.error('Error updating entity on completion (workflow still completed):', entityUpdateError);
      // Don't throw - workflow is already marked as complete
    }
  }
  
  /**
   * Sends notifications to approvers
   */
  private async notifyApprovers(step: WorkflowInstanceStep): Promise<void> {
    if (!step.assigned_user_ids || step.assigned_user_ids.length === 0) return;
    
    const notifications = step.assigned_user_ids.map(userId => ({
      instance_id: step.instance_id,
      step_id: step.id,
      notification_type: 'approval_required',
      recipient_user_id: userId,
      title: 'Approval Required',
      message: `You have a pending approval request (Step ${step.step_number})`,
      link: `/workflow/approve/${step.id}`,
      sent_at: new Date().toISOString()
    }));
    
    await supabase
      .from('workflow_notifications')
      .insert(notifications);
  }
  
  /**
   * Updates entity when workflow completes
   */
  private async updateEntityOnCompletion(
    instanceId: string,
    status: WorkflowStatus
  ): Promise<void> {
    try {
      // Get workflow instance details
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('entity_type, entity_id')
        .eq('id', instanceId)
        .single();
      
      if (!instance) return;
      
      // Handle asset movement completion
      if (instance.entity_type === 'asset_movement') {
        const movementStatus = status === WorkflowStatus.COMPLETED ? 'Approved' : 'Rejected';
        const approvalStatus = status === WorkflowStatus.COMPLETED ? 'Approved' : 'Rejected';
        
        await supabase
          .from('asset_movements')
          .update({
            movement_status: movementStatus,
            approval_status: approvalStatus,
            approved_date: status === WorkflowStatus.COMPLETED ? new Date().toISOString() : null
          })
          .eq('id', instance.entity_id);
        
        // If approved, update asset locations
        if (status === WorkflowStatus.COMPLETED) {
          const { data: movement } = await supabase
            .from('asset_movements')
            .select('assets, movement_type, to_building, to_floor, to_room, handover_to, handover_name, handover_email, handover_mobile, to_tenant, from_tenant, from_building, from_floor, from_room')
            .eq('id', instance.entity_id)
            .single();
          
          if (movement && movement.assets && movement.assets.length > 0) {
            
            // Handle Disposal movement type
            if (movement.movement_type === 'Disposal') {
              // Update asset status to Disposed for all assets in the movement
              for (const assetId of movement.assets) {
                // Get current asset status for history
                const { data: currentAsset } = await supabase
                  .from('assets')
                  .select('asset_status')
                  .eq('id', assetId)
                  .single();
                
                const oldStatus = currentAsset?.asset_status || 'Active';
                
                await supabase
                  .from('assets')
                  .update({ 
                    asset_status: 'Disposed'
                  })
                  .eq('id', assetId);
                
                // Add history record
                await supabase.from('asset_history').insert({
                  asset_id: assetId,
                  change_type: 'status',
                  field_name: 'asset_status',
                  old_value: oldStatus,
                  new_value: 'Disposed',
                  changed_by: 'System',
                  movement_request_id: instance.entity_id
                });
              }
              return; // Exit early for disposal movements
            }
            
            // Handle Maintenance movement type
            if (movement.movement_type === 'Maintenance') {
              // Update asset status to Maintenance for all assets in the movement
              for (const assetId of movement.assets) {
                try {
                  // Get current asset status for history
                  const { data: currentAsset, error: fetchError } = await supabase
                    .from('assets')
                    .select('asset_status')
                    .eq('id', assetId)
                    .single();
                  
                  if (fetchError) {
                    console.error(`Error fetching asset ${assetId}:`, fetchError);
                    continue;
                  }
                  
                  if (!currentAsset) {
                    console.warn(`Asset ${assetId} not found, skipping status update`);
                    continue;
                  }
                  
                  const oldStatus = currentAsset.asset_status || 'Active';
                  
                  // Only update if status is different
                  if (oldStatus !== 'Maintenance') {
                    const { error: updateError } = await supabase
                      .from('assets')
                      .update({ 
                        asset_status: 'Maintenance'
                      })
                      .eq('id', assetId);
                    
                    if (updateError) {
                      console.error(`Error updating asset ${assetId}:`, updateError);
                      continue;
                    }
                    
                    // Add history record
                    const { error: historyError } = await supabase.from('asset_history').insert({
                      asset_id: assetId,
                      change_type: 'status',
                      field_name: 'asset_status',
                      old_value: oldStatus,
                      new_value: 'Maintenance',
                      changed_by: 'System',
                      movement_request_id: instance.entity_id
                    });
                    
                    if (historyError) {
                      console.error(`Error creating history for asset ${assetId}:`, historyError);
                    }
                  }
                } catch (assetError) {
                  console.error(`Error updating asset ${assetId} status:`, assetError);
                  // Continue with other assets even if one fails
                }
              }
              return; // Exit early for maintenance movements
            }
            
            // Convert names to UUIDs
            let buildingId = null;
            let floorId = null;
            let roomId = null;
            
            // Get building UUID from name
            if (movement.to_building) {
              const { data: building } = await supabase
                .from('buildings')
                .select('id')
                .eq('name', movement.to_building)
                .single();
              buildingId = building?.id || null;
            }
            
            // Get floor UUID from name
            if (movement.to_floor && buildingId) {
              // Try to match by floor_name first, then by floor_number
              let floor = null;
              
              // First try exact floor_name match
              const { data: floorByName } = await supabase
                .from('floors')
                .select('id')
                .eq('floor_name', movement.to_floor)
                .eq('building_id', buildingId)
                .maybeSingle();
              
              if (floorByName) {
                floor = floorByName;
              } else {
                // Try to extract floor number from "Floor X" format
                const floorNumberMatch = movement.to_floor.match(/Floor\s+(\d+)/);
                if (floorNumberMatch) {
                  const floorNumber = parseInt(floorNumberMatch[1]);
                  const { data: floorByNumber } = await supabase
                    .from('floors')
                    .select('id')
                    .eq('floor_number', floorNumber)
                    .eq('building_id', buildingId)
                    .maybeSingle();
                  floor = floorByNumber;
                }
              }
              
              floorId = floor?.id || null;
            }
            
            // Get room UUID from room number
            if (movement.to_room && floorId) {
              const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('room_number', movement.to_room)
                .eq('floor_id', floorId)
                .maybeSingle();
              roomId = room?.id || null;
            }
            
            // Prepare handover details
            let handoverToId = null;
            let handoverOtherName = null;
            let handoverOtherEmail = null;
            let handoverOtherContact = null;
            let toTenantName = movement.to_tenant || '';
            
            // Get tenant UUID from tenant NAME (same logic as building/floor)
            if (movement.handover_to === 'Tenant' && movement.to_tenant) {
              const { data: tenant } = await supabase
                .from('tenants')
                .select('id, company')
                .eq('company', movement.to_tenant)
                .maybeSingle();
              
              if (tenant) {
                handoverToId = tenant.id;
                toTenantName = tenant.company;
              }
            } else if (movement.handover_to === 'Other') {
              // Store "Other" handover details
              handoverOtherName = movement.handover_name;
              handoverOtherEmail = movement.handover_email;
              handoverOtherContact = movement.handover_mobile;
              toTenantName = movement.handover_name || 'Other';
            }
            
            // Update each asset's location and handover with UUIDs
            for (const assetId of movement.assets) {
              // Get current asset data for history
              const { data: currentAsset } = await supabase
                .from('assets')
                .select('building, floor_id, room_id, handover_to')
                .eq('id', assetId)
                .single();
              
              if (!currentAsset) continue;
              
              // Resolve current asset location names for history
              let oldBuildingName = 'N/A';
              let oldFloorName = 'N/A';
              let oldRoomName = 'N/A';
              let oldTenantName = 'N/A';
              
              if (currentAsset.building) {
                const { data: oldBuilding } = await supabase
                  .from('buildings')
                  .select('name')
                  .eq('id', currentAsset.building)
                  .single();
                oldBuildingName = oldBuilding?.name || currentAsset.building;
              }
              
              if (currentAsset.floor_id) {
                const { data: oldFloor } = await supabase
                  .from('floors')
                  .select('floor_name, floor_number')
                  .eq('id', currentAsset.floor_id)
                  .single();
                oldFloorName = oldFloor ? (oldFloor.floor_name || `Floor ${oldFloor.floor_number}`) : currentAsset.floor_id;
              }
              
              if (currentAsset.room_id) {
                const { data: oldRoom } = await supabase
                  .from('rooms')
                  .select('room_number')
                  .eq('id', currentAsset.room_id)
                  .single();
                oldRoomName = oldRoom?.room_number || currentAsset.room_id;
              }
              
              if (currentAsset.handover_to) {
                const { data: oldTenant } = await supabase
                  .from('tenants')
                  .select('company')
                  .eq('id', currentAsset.handover_to)
                  .single();
                oldTenantName = oldTenant?.company || currentAsset.handover_to;
              }
              
              // Prepare history records with human-readable names
              const historyRecords: any[] = [];
              
              if (buildingId && currentAsset.building !== buildingId) {
                historyRecords.push({
                  asset_id: assetId,
                  change_type: 'location',
                  field_name: 'building',
                  old_value: oldBuildingName,
                  new_value: movement.to_building,
                  changed_by: 'System',
                  movement_request_id: instance.entity_id
                });
              }
              
              if (floorId && currentAsset.floor_id !== floorId) {
                historyRecords.push({
                  asset_id: assetId,
                  change_type: 'location',
                  field_name: 'floor',
                  old_value: oldFloorName,
                  new_value: movement.to_floor,
                  changed_by: 'System',
                  movement_request_id: instance.entity_id
                });
              }
              
              if (roomId && currentAsset.room_id !== roomId) {
                historyRecords.push({
                  asset_id: assetId,
                  change_type: 'location',
                  field_name: 'room',
                  old_value: oldRoomName,
                  new_value: movement.to_room,
                  changed_by: 'System',
                  movement_request_id: instance.entity_id
                });
              }
              
              if (handoverToId && currentAsset.handover_to !== handoverToId) {
                historyRecords.push({
                  asset_id: assetId,
                  change_type: 'handover',
                  field_name: 'tenant',
                  old_value: oldTenantName,
                  new_value: toTenantName,
                  changed_by: 'System',
                  movement_request_id: instance.entity_id
                });
              }
              
              // Insert history records
              if (historyRecords.length > 0) {
                await supabase.from('asset_history').insert(historyRecords);
              }
              
              // Prepare asset update data
              const updateData: any = {};
              
              if (buildingId) updateData.building = buildingId;
              if (floorId) updateData.floor_id = floorId;
              if (roomId) updateData.room_id = roomId;
              if (handoverToId) updateData.handover_to = handoverToId;
              if (handoverOtherName) {
                updateData.handover_other_name = handoverOtherName;
                updateData.handover_other_email = handoverOtherEmail;
                updateData.handover_other_contact = handoverOtherContact;
              }
              
              if (Object.keys(updateData).length > 0) {
                await supabase
                  .from('assets')
                  .update(updateData)
                  .eq('id', assetId);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating entity on workflow completion:', error);
    }
  }
  
  /**
   * Gets all approver user IDs from workflow graph
   */
  private getAllApproverIds(graph: WorkflowGraph): string[] {
    const approverIds = new Set<string>();
    
    graph.nodes.forEach(node => {
      if (node.node_type === NodeType.APPROVAL && node.approver_user_ids) {
        node.approver_user_ids.forEach(id => approverIds.add(id));
      }
    });
    
    return Array.from(approverIds);
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowExecutionEngine();
