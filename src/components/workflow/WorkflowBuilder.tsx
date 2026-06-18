// =====================================================
// WORKFLOW BUILDER COMPONENT
// =====================================================
// Purpose: Visual workflow builder using React Flow
// Features: Drag-and-drop, node configuration, validation
// =====================================================

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Plus, Save, Play, Trash2, X, ArrowLeft } from 'lucide-react';
import { NodeType, ApprovalType, ConditionOperator } from '../../types/workflow.types';
import { workflowService } from '../../services/workflowService';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

// =====================================================
// CUSTOM NODE COMPONENTS
// =====================================================

const MovementRequestNode = ({ data }: any) => (
  <div className="px-6 py-4 bg-green-500 text-white rounded-lg font-semibold shadow-lg">
    MOVEMENT REQUEST
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
);

const ApprovalNode = ({ data }: any) => (
  <div className="px-6 py-4 bg-blue-500 text-white rounded-lg shadow-lg min-w-[200px]">
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="font-semibold mb-2">{data.label}</div>
    <div className="text-xs opacity-90">
      {data.config?.approval_type} • {data.config?.approver_user_ids?.length || 0} approvers
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
);

const ConditionApprovedNode = ({ data }: any) => (
  <div className="px-6 py-4 bg-green-500 text-white rounded-lg shadow-lg min-w-[150px]">
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="font-semibold">IF APPROVED</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
);

const ConditionRejectedNode = ({ data }: any) => (
  <div className="px-6 py-4 bg-red-500 text-white rounded-lg shadow-lg min-w-[150px]">
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="font-semibold">IF REJECTED</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
);

const EndNode = ({ data }: any) => (
  <div className={`px-6 py-4 text-white rounded-lg font-semibold shadow-lg ${
    data.endType === 'approved' ? 'bg-green-600' : 'bg-red-600'
  }`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    END: {data.endType === 'approved' ? 'APPROVED' : 'REJECTED'}
  </div>
);

const nodeTypes = {
  MOVEMENT_REQUEST: MovementRequestNode,
  APPROVAL: ApprovalNode,
  CONDITION_APPROVED: ConditionApprovedNode,
  CONDITION_REJECTED: ConditionRejectedNode,
  END: EndNode
};

// =====================================================
// MAIN WORKFLOW BUILDER
// =====================================================

interface WorkflowBuilderProps {
  workflowId?: string;
  tenantId?: string;
  onSave?: (workflowId: string) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  tenantId,
  onSave
}) => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [eligibleApprovers, setEligibleApprovers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load workflow if editing
  useEffect(() => {
    // Get tenant ID or system users from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlTenantId = urlParams.get('tenantId');
    const isSystem = urlParams.get('system') === 'true';
    const userIds = urlParams.get('users');
    
    if (isSystem && userIds) {
      // System workflow creation - no tenant
      setSelectedTenantId('');
      setTenantName('System Workflow');
    } else if (urlTenantId) {
      setSelectedTenantId(urlTenantId);
      loadTenantName(urlTenantId);
    } else if (tenantId) {
      setSelectedTenantId(tenantId);
      loadTenantName(tenantId);
    }

    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId, tenantId]);

  // Reload approvers when tenant changes
  useEffect(() => {
    if (selectedTenantId) {
      loadEligibleApprovers();
    } else {
      // System workflow - load all admin approvers
      loadEligibleApprovers();
    }
  }, [selectedTenantId]);

  const loadTenantName = async (tenantId: string) => {
    try {
      const { data } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();
      
      if (data) {
        setTenantName(data.name);
      }
    } catch (error) {
      console.error('Failed to load tenant:', error);
    }
  };

  const loadWorkflow = async (id: string) => {
    try {
      const data = await workflowService.getWorkflowById(id);
      if (data) {
        setWorkflowName(data.workflow.name);
        setWorkflowDescription(data.workflow.description || '');
        setSelectedTenantId(data.workflow.tenant_id || '');
        
        // Check if this is a system workflow
        if (!data.workflow.tenant_id) {
          setTenantName('System Workflow');
          
          // Load workflow_users to get assigned users
          const { data: workflowUsers } = await supabase
            .from('workflow_users')
            .select('user_id')
            .eq('workflow_id', id);
          
          if (workflowUsers && workflowUsers.length > 0) {
            const userIds = workflowUsers.map(wu => wu.user_id).join(',');
            // Update URL to include system workflow params
            const newUrl = `${window.location.pathname}?system=true&users=${userIds}`;
            window.history.replaceState({}, '', newUrl);
          }
        } else if (data.workflow.tenant_id) {
          loadTenantName(data.workflow.tenant_id);
        }
        
        // Convert database nodes to React Flow nodes
        const flowNodes = data.nodes.map(node => ({
          id: node.node_id,
          type: node.node_type,
          position: { x: node.position_x || 0, y: node.position_y || 0 },
          data: {
            label: node.label || node.node_type,
            endType: (node as any).end_type || (node.node_type === 'END' ? (node.label?.toLowerCase().includes('reject') ? 'rejected' : 'approved') : undefined),
            config: {
              approval_type: node.approval_type,
              approver_user_ids: node.approver_user_ids,
              sla_hours: node.sla_hours,
              escalation_user_ids: node.escalation_user_ids,
              field: node.condition_field,
              operator: node.condition_operator,
              value: node.condition_value
            }
          }
        }));
        
        // Convert database edges to React Flow edges
        const flowEdges = data.edges.map(edge => ({
          id: edge.edge_id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          label: edge.condition_label,
          markerEnd: { type: MarkerType.ArrowClosed }
        }));
        
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (error) {
      toast.error('Failed to load workflow');
    }
  };

  const loadEligibleApprovers = async () => {
    try {
      const approvers = await workflowService.getEligibleApprovers(selectedTenantId || undefined);
      setEligibleApprovers(approvers);
    } catch (error) {
      console.error('Failed to load approvers:', error);
    }
  };

  // Handle edge connection
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Add new node
  const addNode = (type: NodeType, endType?: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: type.toUpperCase(),
        endType: endType,
        config: {}
      }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Handle edge click for deletion
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (window.confirm('Delete this connection?')) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
  }, [setEdges]);

  // Handle node click for configuration
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  }, []);

  // Save node configuration
  const saveNodeConfig = (config: any) => {
    if (!selectedNode) return;
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, ...config } }
          : node
      )
    );
    setShowNodeConfig(false);
    setSelectedNode(null);
  };

  // Delete selected node
  const deleteNode = () => {
    if (!selectedNode) return;
    
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== selectedNode.id && edge.target !== selectedNode.id
    ));
    setShowNodeConfig(false);
    setSelectedNode(null);
  };

  // Save workflow
  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter workflow name');
      return;
    }

    // Check if system workflow
    const urlParams = new URLSearchParams(window.location.search);
    const isSystem = urlParams.get('system') === 'true';
    const userIds = urlParams.get('users');

    if (!isSystem && !selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    setIsSaving(true);
    try {
      // Convert React Flow nodes to database format
      const dbNodes = nodes.map(node => ({
        node_id: node.id,
        node_type: node.type as NodeType,
        label: node.data.label,
        position_x: node.position.x,
        position_y: node.position.y,
        approval_type: node.data.config?.approval_type,
        approver_user_ids: node.data.config?.approver_user_ids,
        sla_hours: node.data.config?.sla_hours,
        escalation_user_ids: node.data.config?.escalation_user_ids,
        condition_field: node.data.config?.field,
        condition_operator: node.data.config?.operator,
        condition_value: node.data.config?.value,
        end_type: node.data.endType // Save END node type (approved/rejected)
      }));
      
      console.log('[WorkflowBuilder] Saving workflow with nodes:', dbNodes);
      console.log('[WorkflowBuilder] APPROVAL node approvers:', dbNodes.find(n => n.node_type === 'APPROVAL')?.approver_user_ids);

      // Convert React Flow edges to database format
      const dbEdges = edges.map(edge => ({
        edge_id: edge.id!,
        source_node_id: edge.source,
        target_node_id: edge.target,
        condition_label: edge.label as string
      }));

      if (workflowId) {
        // Check if this is a system workflow update
        const urlParams = new URLSearchParams(window.location.search);
        const isSystemUpdate = urlParams.get('system') === 'true';
        const userIds = urlParams.get('users');
        
        await workflowService.updateWorkflow(workflowId, {
          name: workflowName,
          description: workflowDescription,
          tenant_id: isSystemUpdate ? undefined : selectedTenantId,
          nodes: dbNodes,
          edges: dbEdges
        });
        
        // If system workflow, update workflow_users
        if (isSystemUpdate && userIds) {
          // Delete existing workflow_users
          await supabase
            .from('workflow_users')
            .delete()
            .eq('workflow_id', workflowId);
          
          // Insert new workflow_users
          const userIdArray = userIds.split(',');
          const workflowUsers = userIdArray.map(uid => ({
            workflow_id: workflowId,
            user_id: uid.trim()
          }));
          
          const { error: insertError } = await supabase
            .from('workflow_users')
            .insert(workflowUsers);
          
          if (insertError) {
            console.error('[WorkflowBuilder] Error updating workflow_users:', insertError);
            toast.error('Failed to update user assignments: ' + insertError.message);
          }
        }
        
        toast.success('Workflow updated successfully');
      } else {
        const workflow = await workflowService.createWorkflow({
          name: workflowName,
          description: workflowDescription,
          tenant_id: isSystem ? undefined : selectedTenantId,
          entity_type: 'asset_movement',
          nodes: dbNodes,
          edges: dbEdges
        });
        
        // If system workflow, create workflow_users entries
        if (isSystem && userIds) {
          console.log('[WorkflowBuilder] Creating workflow_users for system workflow');
          console.log('[WorkflowBuilder] isSystem:', isSystem);
          console.log('[WorkflowBuilder] userIds:', userIds);
          console.log('[WorkflowBuilder] workflow.id:', workflow.id);
          
          const userIdArray = userIds.split(',');
          console.log('[WorkflowBuilder] userIdArray:', userIdArray);
          
          const workflowUsers = userIdArray.map(uid => ({
            workflow_id: workflow.id,
            user_id: uid.trim() // Trim whitespace
          }));
          
          console.log('[WorkflowBuilder] workflowUsers to insert:', workflowUsers);
          
          const { data: insertedUsers, error: insertError } = await supabase
            .from('workflow_users')
            .insert(workflowUsers)
            .select();
          
          if (insertError) {
            console.error('[WorkflowBuilder] Error inserting workflow_users:', insertError);
            
            // Check if it's the unique constraint error
            if (insertError.message.includes('already assigned to another active')) {
              toast.error('One or more users are already assigned to another active workflow. Please deactivate the other workflow first.');
            } else {
              toast.error('Failed to assign users to workflow: ' + insertError.message);
            }
            
            // Delete the workflow since user assignment failed
            await supabase.from('workflows').delete().eq('id', workflow.id);
            return;
          } else {
            console.log('[WorkflowBuilder] Successfully inserted workflow_users:', insertedUsers);
          }
          
          // Auto-activate system workflows
          try {
            await workflowService.publishWorkflow(workflow.id);
          } catch (activationError: any) {
            console.error('[WorkflowBuilder] Error activating workflow:', activationError);
            
            if (activationError.message.includes('already assigned to another active')) {
              toast.error('Cannot activate: One or more users are already in another active workflow.');
            } else {
              toast.error('Failed to activate workflow: ' + activationError.message);
            }
            
            // Keep workflow as draft
            toast.info('Workflow created as draft. Please deactivate conflicting workflows and activate manually.');
            onSave?.(workflow.id);
            return;
          }
        }
        
        toast.success('Workflow created successfully' + (isSystem ? ' and activated' : ''));
        onSave?.(workflow.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // If there's history, go back, otherwise go to workflows list
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/admin/workflows');
                }
              }}
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Workflow Name"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveWorkflow} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tenant</Label>
            <Input
              value={tenantName}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              placeholder="Workflow description"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          
          {/* Node Palette */}
          <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg">
            <div className="text-sm font-semibold mb-2">Add Nodes</div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => addNode(NodeType.MOVEMENT_REQUEST)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Movement Request
              </Button>
              <Button size="sm" onClick={() => addNode(NodeType.APPROVAL)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Approval
              </Button>
              <Button size="sm" onClick={() => addNode(NodeType.CONDITION_APPROVED)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                If Approved
              </Button>
              <Button size="sm" onClick={() => addNode(NodeType.CONDITION_REJECTED)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                If Rejected
              </Button>
              <Button size="sm" onClick={() => addNode(NodeType.END, 'approved')} variant="outline" className="bg-green-50">
                <Plus className="w-4 h-4 mr-2" />
                End (Approved)
              </Button>
              <Button size="sm" onClick={() => addNode(NodeType.END, 'rejected')} variant="outline" className="bg-red-50">
                <Plus className="w-4 h-4 mr-2" />
                End (Rejected)
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Node Configuration Dialog */}
      <NodeConfigDialog
        node={selectedNode}
        open={showNodeConfig}
        onClose={() => {
          setShowNodeConfig(false);
          setSelectedNode(null);
        }}
        onSave={saveNodeConfig}
        onDelete={deleteNode}
        eligibleApprovers={eligibleApprovers}
      />
    </div>
  );
};

// =====================================================
// NODE CONFIGURATION DIALOG
// =====================================================

interface NodeConfigDialogProps {
  node: Node | null;
  open: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  onDelete: () => void;
  eligibleApprovers: any[];
}

const NodeConfigDialog: React.FC<NodeConfigDialogProps> = ({
  node,
  open,
  onClose,
  onSave,
  onDelete,
  eligibleApprovers
}) => {
  const [label, setLabel] = useState('');
  const [approvalType, setApprovalType] = useState<ApprovalType>(ApprovalType.ANY);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [slaHours, setSlaHours] = useState<number>(24);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setApprovalType(node.data.config?.approval_type || ApprovalType.ANY);
      setSelectedApprovers(node.data.config?.approver_user_ids || []);
      setSlaHours(node.data.config?.sla_hours || 24);
    }
  }, [node]);

  const handleSave = () => {
    const config: any = { label };

    if (node?.type === NodeType.APPROVAL) {
      config.config = {
        approval_type: approvalType,
        approver_user_ids: selectedApprovers,
        sla_hours: slaHours
      };
    }

    onSave(config);
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure {node.type.toUpperCase()} Node</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Node label"
            />
          </div>

          {node.type === NodeType.APPROVAL && (
            <>
              <div>
                <Label>Approval Type</Label>
                <Select value={approvalType} onValueChange={(v) => setApprovalType(v as ApprovalType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ApprovalType.ANY}>Any One Approves</SelectItem>
                    <SelectItem value={ApprovalType.ALL}>All Must Approve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Approvers</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (!selectedApprovers.includes(v)) {
                      setSelectedApprovers([...selectedApprovers, v]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select approvers" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleApprovers.map((approver) => (
                      <SelectItem key={approver.id} value={approver.id}>
                        {approver.name} ({approver.email}) - {approver.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedApprovers.map((id) => {
                    const approver = eligibleApprovers.find((a) => a.id === id);
                    return (
                      <span key={id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1">
                        {approver?.name} ({approver?.role})
                        <button
                          type="button"
                          onClick={() => setSelectedApprovers(selectedApprovers.filter(aid => aid !== id))}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>SLA (Hours)</Label>
                <Input
                  type="number"
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {(node.type === NodeType.CONDITION_APPROVED || node.type === NodeType.CONDITION_REJECTED) && (
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-muted-foreground">
                {node.type === NodeType.CONDITION_APPROVED 
                  ? 'Routes workflow when previous approval is approved.'
                  : 'Routes workflow when previous approval is rejected.'}
              </p>
            </div>
          )}

          {node.type === NodeType.END && (
            <>
              <div>
                <Label>End Type</Label>
                <Select 
                  value={node.data.endType || 'approved'} 
                  onValueChange={(v) => {
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === node.id
                          ? { ...n, data: { ...n.data, endType: v } }
                          : n
                      )
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved (Green)</SelectItem>
                    <SelectItem value="rejected">Rejected (Red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Node
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
