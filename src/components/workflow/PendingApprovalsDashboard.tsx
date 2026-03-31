// =====================================================
// PENDING APPROVALS DASHBOARD
// =====================================================
// Purpose: Display all pending approvals for current user
// Features: List view, quick actions, filters, SLA indicators
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Clock, AlertTriangle, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { PendingApproval } from '../../types/workflow.types';
import { useAuth } from '../../contexts/AuthContext';
import { WorkflowExecutionViewer } from './WorkflowExecutionViewer';
import { Dialog, DialogContent } from '../ui/dialog';

export const PendingApprovalsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSLA, setFilterSLA] = useState<'all' | 'breached' | 'warning'>('all');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadPendingApprovals();
      const interval = setInterval(loadPendingApprovals, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [approvals, searchTerm, filterSLA]);

  const loadPendingApprovals = async () => {
    if (!user) return;
    
    try {
      const data = await workflowService.getPendingApprovals(user.id);
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...approvals];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.entity_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // SLA filter
    if (filterSLA === 'breached') {
      filtered = filtered.filter((a) => a.is_sla_breached);
    } else if (filterSLA === 'warning') {
      filtered = filtered.filter((a) => {
        if (!a.sla_deadline) return false;
        const hoursRemaining = (new Date(a.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursRemaining > 0 && hoursRemaining <= 4 && !a.is_sla_breached;
      });
    }

    setFilteredApprovals(filtered);
  };

  const getSLAStatus = (approval: PendingApproval) => {
    if (!approval.sla_deadline) return null;

    if (approval.is_sla_breached) {
      return {
        label: 'SLA BREACHED',
        color: 'bg-red-500',
        icon: <AlertTriangle className="w-4 h-4" />
      };
    }

    const hoursRemaining = (new Date(approval.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursRemaining <= 4) {
      return {
        label: `${Math.floor(hoursRemaining)}h remaining`,
        color: 'bg-orange-500',
        icon: <Clock className="w-4 h-4" />
      };
    }

    return {
      label: `${Math.floor(hoursRemaining)}h remaining`,
      color: 'bg-blue-500',
      icon: <Clock className="w-4 h-4" />
    };
  };

  const handleViewWorkflow = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setShowWorkflowDialog(true);
  };

  const handleWorkflowComplete = () => {
    setShowWorkflowDialog(false);
    loadPendingApprovals();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading pending approvals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">
            You have {approvals.length} pending approval{approvals.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-3xl font-bold">{approvals.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Breached</p>
                <p className="text-3xl font-bold text-red-500">
                  {approvals.filter((a) => a.is_sla_breached).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Soon (&lt;4h)</p>
                <p className="text-3xl font-bold text-orange-500">
                  {approvals.filter((a) => {
                    if (!a.sla_deadline || a.is_sla_breached) return false;
                    const hoursRemaining = (new Date(a.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60);
                    return hoursRemaining > 0 && hoursRemaining <= 4;
                  }).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by workflow name or entity ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterSLA} onValueChange={(v: any) => setFilterSLA(v)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Approvals</SelectItem>
                <SelectItem value="breached">SLA Breached</SelectItem>
                <SelectItem value="warning">Due Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Pending Approvals</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterSLA !== 'all'
                ? 'No approvals match your filters'
                : 'You have no pending approvals at this time'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => {
            const slaStatus = getSLAStatus(approval);
            return (
              <Card key={approval.step_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{approval.workflow_name}</h3>
                        <Badge variant="outline">Step {approval.step_number}</Badge>
                        {slaStatus && (
                          <Badge className={`${slaStatus.color} text-white`}>
                            {slaStatus.icon}
                            <span className="ml-1">{slaStatus.label}</span>
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Entity Type:</span> {approval.entity_type}
                        </div>
                        <div>
                          <span className="font-medium">Entity ID:</span> {approval.entity_id}
                        </div>
                        <div>
                          <span className="font-medium">Approval Type:</span> {approval.approval_type.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">Progress:</span> {approval.received_approvals} / {approval.required_approvals}
                        </div>
                        <div>
                          <span className="font-medium">Started:</span> {new Date(approval.started_at).toLocaleString()}
                        </div>
                        {approval.sla_deadline && (
                          <div>
                            <span className="font-medium">SLA Deadline:</span> {new Date(approval.sla_deadline).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleViewWorkflow(approval.instance_id)}
                        size="sm"
                      >
                        View & Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Workflow Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedInstanceId && (
            <WorkflowExecutionViewer
              instanceId={selectedInstanceId}
              onComplete={handleWorkflowComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
