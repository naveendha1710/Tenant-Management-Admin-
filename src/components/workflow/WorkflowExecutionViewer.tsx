// =====================================================
// WORKFLOW EXECUTION VIEWER
// =====================================================
// Purpose: Display workflow progress and handle approvals
// Features: Step tracking, approve/reject actions, timeline
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { CheckCircle, XCircle, Clock, AlertCircle, User } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { workflowEngine } from '../../services/workflowEngine';
import { WorkflowInstance, WorkflowInstanceStep, StepStatus, WorkflowStatus } from '../../types/workflow.types';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface WorkflowExecutionViewerProps {
  instanceId: string;
  onComplete?: () => void;
}

export const WorkflowExecutionViewer: React.FC<WorkflowExecutionViewerProps> = ({
  instanceId,
  onComplete
}) => {
  const { user } = useAuth();
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [steps, setSteps] = useState<WorkflowInstanceStep[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState<WorkflowInstanceStep | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWorkflowInstance();
    const interval = setInterval(loadWorkflowInstance, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [instanceId]);

  const loadWorkflowInstance = async () => {
    try {
      const data = await workflowService.getWorkflowInstance(instanceId);
      if (data) {
        setInstance(data.instance);
        setSteps(data.steps);
        setWorkflowName(data.workflow.name);
      }
    } catch (error) {
      console.error('Failed to load workflow instance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (step: WorkflowInstanceStep) => {
    setSelectedStep(step);
    setActionType('approve');
    setShowActionDialog(true);
  };

  const handleReject = (step: WorkflowInstanceStep) => {
    setSelectedStep(step);
    setActionType('reject');
    setShowActionDialog(true);
  };

  const submitAction = async () => {
    if (!selectedStep || !user) return;

    setIsSubmitting(true);
    try {
      let result;
      if (actionType === 'approve') {
        result = await workflowEngine.approveStep(selectedStep.id, user.id, remarks);
      } else {
        result = await workflowEngine.rejectStep(selectedStep.id, user.id, remarks);
      }

      if (result.success) {
        toast.success(`Step ${actionType}d successfully`);
        setShowActionDialog(false);
        setRemarks('');
        await loadWorkflowInstance();
        
        if (result.completed && instance?.status === WorkflowStatus.COMPLETED) {
          onComplete?.();
        }
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canUserApprove = (step: WorkflowInstanceStep): boolean => {
    if (!user || step.status !== StepStatus.PENDING) return false;
    return step.assigned_user_ids?.includes(user.id) || false;
  };

  const getStepStatusIcon = (status: StepStatus) => {
    switch (status) {
      case StepStatus.APPROVED:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case StepStatus.REJECTED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      case StepStatus.PENDING:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case StepStatus.ESCALATED:
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepStatusBadge = (status: StepStatus) => {
    const variants: Record<StepStatus, any> = {
      [StepStatus.PENDING]: 'warning',
      [StepStatus.APPROVED]: 'success',
      [StepStatus.REJECTED]: 'destructive',
      [StepStatus.ESCALATED]: 'warning',
      [StepStatus.SKIPPED]: 'secondary'
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const getWorkflowStatusBadge = (status: WorkflowStatus) => {
    const colors: Record<WorkflowStatus, string> = {
      [WorkflowStatus.PENDING]: 'bg-gray-500',
      [WorkflowStatus.IN_PROGRESS]: 'bg-blue-500',
      [WorkflowStatus.COMPLETED]: 'bg-green-500',
      [WorkflowStatus.REJECTED]: 'bg-red-500',
      [WorkflowStatus.CANCELLED]: 'bg-gray-500',
      [WorkflowStatus.ESCALATED]: 'bg-orange-500'
    };
    return (
      <Badge className={colors[status]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Loading workflow...</div>;
  }

  if (!instance) {
    return <div className="p-8 text-center">Workflow not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{workflowName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Started: {new Date(instance.started_at).toLocaleString()}
              </p>
            </div>
            {getWorkflowStatusBadge(instance.status)}
          </div>
        </CardHeader>
      </Card>

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Steps */}
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    {getStepStatusIcon(step.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <Card className={step.status === StepStatus.PENDING ? 'border-blue-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">
                              Step {step.step_number}: {step.node_type.toUpperCase()}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Started: {new Date(step.started_at).toLocaleString()}
                            </p>
                          </div>
                          {getStepStatusBadge(step.status)}
                        </div>

                        {/* Approval Details */}
                        {step.node_type === 'approval' && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4" />
                              <span>
                                Approvals: {step.received_approvals} / {step.required_approvals}
                              </span>
                            </div>

                            {step.approval_type && (
                              <div className="text-sm text-muted-foreground">
                                Type: {step.approval_type.toUpperCase()}
                              </div>
                            )}

                            {step.sla_deadline && (
                              <div className={`text-sm ${step.is_sla_breached ? 'text-red-500' : 'text-muted-foreground'}`}>
                                SLA: {new Date(step.sla_deadline).toLocaleString()}
                                {step.is_sla_breached && ' (BREACHED)'}
                              </div>
                            )}

                            {/* Action Buttons */}
                            {canUserApprove(step) && (
                              <div className="flex gap-2 mt-4">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(step)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(step)}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {step.completed_at && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Completed: {new Date(step.completed_at).toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Step
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={`Enter ${actionType} remarks...`}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={isSubmitting}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting ? 'Submitting...' : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
