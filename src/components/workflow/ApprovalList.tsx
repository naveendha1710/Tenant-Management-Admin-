import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalRecord {
  id: string;
  step_number: number;
  node_type: string;
  status: string;
  assigned_user_ids: string[];
  started_at: string;
  completed_at: string | null;
  approver_name?: string;
  action_type?: string;
  action_at?: string;
  remarks?: string;
}

interface ApprovalListProps {
  movementId: string;
}

export function ApprovalList({ movementId }: ApprovalListProps) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, [movementId]);

  const loadApprovals = async () => {
    try {
      // Get workflow instance for this movement
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('id')
        .eq('entity_type', 'asset_movement')
        .eq('entity_id', movementId)
        .single();

      if (!instance) {
        setLoading(false);
        return;
      }

      // Get all steps for this workflow instance
      const { data: steps } = await supabase
        .from('workflow_instance_steps')
        .select('*')
        .eq('instance_id', instance.id)
        .order('step_number', { ascending: true });

      if (!steps) {
        setLoading(false);
        return;
      }

      // Get actions for each step
      const { data: actions } = await supabase
        .from('workflow_actions')
        .select('*')
        .eq('instance_id', instance.id)
        .order('action_at', { ascending: true });

      // Get user names
      const userIds = new Set<string>();
      steps.forEach(step => {
        step.assigned_user_ids?.forEach((id: string) => userIds.add(id));
      });
      actions?.forEach(action => {
        if (action.action_by) userIds.add(action.action_by);
      });

      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', Array.from(userIds));

      const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

      // Enrich steps with action data
      const enrichedSteps = steps.map(step => {
        const stepActions = actions?.filter(a => a.step_id === step.id) || [];
        const action = stepActions[0]; // Get first action (approve/reject)
        
        return {
          ...step,
          approver_name: action?.action_by ? userMap.get(action.action_by) : null,
          action_type: action?.action_type,
          action_at: action?.action_at,
          remarks: action?.remarks,
          assigned_user_names: step.assigned_user_ids?.map((id: string) => userMap.get(id) || 'Unknown') || []
        };
      });

      setApprovals(enrichedSteps);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string, actionType?: string) => {
    if (status === 'approved' || actionType === 'approve') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (status === 'rejected' || actionType === 'reject') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <Clock className="h-5 w-5 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string, actionType?: string) => {
    if (status === 'approved' || actionType === 'approve') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Approved
        </span>
      );
    } else if (status === 'rejected' || actionType === 'reject') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Rejected
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Pending
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No approval workflow found for this movement</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase">Approval History</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {/* Approval steps */}
        <div className="space-y-6">
          {approvals.map((approval, index) => (
            <div key={approval.id} className="relative flex gap-4">
              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-200">
                {getStatusIcon(approval.status, approval.action_type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        Step {approval.step_number}: {approval.node_type === 'APPROVAL' ? 'Approval Required' : approval.node_type}
                      </h4>
                      {getStatusBadge(approval.status, approval.action_type)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        <span>Assigned to: {(approval as any).assigned_user_names?.join(', ') || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <div>Started: {format(new Date(approval.started_at), 'MMM dd, yyyy')}</div>
                    <div>{format(new Date(approval.started_at), 'hh:mm a')}</div>
                  </div>
                </div>
                
                {approval.action_type && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-600">Action by: </span>
                        <span className="font-medium text-gray-900">{approval.approver_name || 'Unknown'}</span>
                      </div>
                      {approval.action_at && (
                        <div className="text-xs text-gray-500">
                          {format(new Date(approval.action_at), 'MMM dd, yyyy hh:mm a')}
                        </div>
                      )}
                    </div>
                    {approval.remarks && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Remarks: </span>
                        {approval.remarks}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
