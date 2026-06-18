// =====================================================
// WORKFLOW MANAGEMENT PAGE
// =====================================================
// Purpose: List and manage workflows
// Features: Create, edit, delete, publish workflows
// =====================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Search, 
  GitBranch,
  CheckCircle,
  XCircle,
  Power,
  PowerOff,
  ArrowLeft
} from 'lucide-react';
import { workflowService } from '../../services/workflowService';
import { supabase } from '../../lib/supabaseClient';
import { Workflow } from '../../types/workflow.types';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

export const WorkflowManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<any[]>([]);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantSelectionOpen, setTenantSelectionOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState<'tenant' | 'system'>('tenant');
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [filteredSystemUsers, setFilteredSystemUsers] = useState<any[]>([]);
  const [systemUserSearchTerm, setSystemUserSearchTerm] = useState('');
  const [selectedSystemUsers, setSelectedSystemUsers] = useState<string[]>([]);
  const [usersInActiveWorkflows, setUsersInActiveWorkflows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTenants();
    loadWorkflows();
    loadSystemUsers();
    loadUsersInActiveWorkflows();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [workflows, searchTerm]);

  useEffect(() => {
    applyTenantFilters();
  }, [tenants, tenantSearchTerm]);

  useEffect(() => {
    applySystemUserFilters();
  }, [systemUsers, systemUserSearchTerm]);

  const applyTenantFilters = () => {
    let filtered = [...tenants];
    if (tenantSearchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(tenantSearchTerm.toLowerCase()) ||
          t.company.toLowerCase().includes(tenantSearchTerm.toLowerCase())
      );
    }
    setFilteredTenants(filtered);
  };

  const applySystemUserFilters = () => {
    let filtered = [...systemUsers];
    if (systemUserSearchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(systemUserSearchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(systemUserSearchTerm.toLowerCase())
      );
    }
    setFilteredSystemUsers(filtered);
  };

  const loadTenants = async () => {
    try {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, company')
        .order('name');
      
      if (tenantsError) throw tenantsError;

      const tenantsWithDetails = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { data: agreements } = await supabase
            .from('agreements')
            .select('space_assignments')
            .eq('tenant_id', tenant.id)
            .eq('status', 'Active');

          if (!agreements || agreements.length === 0) {
            return { ...tenant, buildings: [] };
          }

          const allSpaceAssignments = agreements.flatMap(a => a.space_assignments || []);

          if (allSpaceAssignments.length === 0) {
            return { ...tenant, buildings: [] };
          }

          const buildingIds = [...new Set(
            allSpaceAssignments
              .map((sa: any) => sa.buildingId || sa.building_id || sa.building)
              .filter(Boolean)
          )];

          if (buildingIds.length === 0) {
            return { ...tenant, buildings: [] };
          }

          const { data: buildings } = await supabase
            .from('buildings')
            .select('id, name')
            .in('id', buildingIds);

          return { ...tenant, buildings: buildings || [] };
        })
      );

      setTenants(tenantsWithDetails);
      setFilteredTenants(tenantsWithDetails);
    } catch (error) {
      console.error('Failed to load tenants:', error);
      toast.error('Failed to load tenants');
    }
  };

  const loadSystemUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .neq('role', 'Tenant')
        .order('name');
      
      if (usersError) throw usersError;

      setSystemUsers(usersData || []);
      setFilteredSystemUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load system users:', error);
      toast.error('Failed to load system users');
    }
  };

  const loadUsersInActiveWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_users')
        .select('user_id, workflows!inner(is_active, tenant_id)')
        .eq('workflows.is_active', true)
        .is('workflows.tenant_id', null);
      
      if (error) throw error;
      
      const userIds = new Set(data?.map(wu => wu.user_id) || []);
      setUsersInActiveWorkflows(userIds);
    } catch (error) {
      console.error('Failed to load users in active workflows:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      const data = await workflowService.listWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const getTenantName = (tenantId?: string) => {
    if (!tenantId) return 'System Workflow';
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.company || tenant?.name || 'Unknown';
  };

  const applyFilters = () => {
    let filtered = [...workflows];

    if (searchTerm) {
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredWorkflows(filtered);
  };

  const handleCreate = () => {
    setActiveTab('tenant');
    setSelectedSystemUsers([]);
    setTenantSelectionOpen(true);
  };

  const handleTenantSelect = (tenantId: string) => {
    setTenantSelectionOpen(false);
    navigate(`/admin/workflows/builder?tenantId=${tenantId}`);
  };

  const handleSystemWorkflowCreate = () => {
    if (selectedSystemUsers.length === 0) {
      toast.error('Please select at least one system user');
      return;
    }
    
    // Check if any selected users are in active workflows
    const conflictUsers = selectedSystemUsers.filter(uid => usersInActiveWorkflows.has(uid));
    if (conflictUsers.length > 0) {
      const conflictNames = conflictUsers
        .map(uid => systemUsers.find(u => u.id === uid)?.name)
        .filter(Boolean)
        .join(', ');
      toast.error(`Warning: ${conflictNames} already assigned to active workflows. Creating this workflow may fail.`);
    }
    
    setTenantSelectionOpen(false);
    navigate(`/admin/workflows/builder?system=true&users=${selectedSystemUsers.join(',')}`);
  };

  const toggleSystemUser = (userId: string) => {
    setSelectedSystemUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleEdit = (workflowId: string) => {
    navigate(`/admin/workflows/builder/${workflowId}`);
  };

  const handleDelete = async () => {
    if (!selectedWorkflow) return;

    try {
      const { data: allInstances } = await supabase
        .from('workflow_instances')
        .select('id, status')
        .eq('workflow_id', selectedWorkflow.id);
      
      const activeCount = allInstances?.filter(i => ['pending', 'in_progress'].includes(i.status)).length || 0;
      const completedCount = allInstances?.filter(i => ['completed', 'rejected'].includes(i.status)).length || 0;
      
      if (activeCount > 0 || completedCount > 0) {
        const totalCount = activeCount + completedCount;
        const confirmDelete = confirm(
          `This workflow has ${totalCount} workflow instance(s) (${activeCount} active, ${completedCount} completed). ` +
          `Do you want to force delete the workflow and all its instances? This will remove all workflow history.`
        );
        if (!confirmDelete) {
          setDeleteDialogOpen(false);
          return;
        }
        
        if (allInstances && allInstances.length > 0) {
          const instanceIds = allInstances.map(i => i.id);
          
          await supabase
            .from('workflow_instance_steps')
            .delete()
            .in('instance_id', instanceIds);
          
          await supabase
            .from('workflow_actions')
            .delete()
            .in('instance_id', instanceIds);
          
          await supabase
            .from('workflow_instances')
            .delete()
            .eq('workflow_id', selectedWorkflow.id);
        }
      }
      
      await workflowService.deleteWorkflow(selectedWorkflow.id);
      toast.success('Workflow and all related instances deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedWorkflow(null);
      loadWorkflows();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete workflow');
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      if (workflow.is_active) {
        const { data, error } = await supabase
          .from('workflows')
          .update({ is_active: false })
          .eq('id', workflow.id)
          .select()
          .single();
        
        if (error) throw error;
        toast.success('Workflow deactivated successfully');
      } else {
        await workflowService.publishWorkflow(workflow.id);
        toast.success('Workflow activated successfully');
      }
      await loadWorkflows();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle workflow status');
    }
  };

  const openDeleteDialog = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading workflows...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GitBranch className="w-8 h-8" />
              Workflow Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage approval workflows
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Workflows Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'No workflows match your search'
                : 'Get started by creating your first workflow'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description || 'No description'}
                    </p>
                  </div>
                  {workflow.is_active ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="w-3 h-3 mr-1" />
                      Draft
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex justify-between">
                    <span>Company:</span>
                    <span className="font-medium">{getTenantName(workflow.tenant_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-medium">{workflow.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entity Type:</span>
                    <span className="font-medium">{workflow.entity_type}</span>
                  </div>
                  {workflow.is_default && (
                    <Badge variant="outline" className="w-full justify-center">
                      Default Workflow
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(workflow.id)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={workflow.is_active ? "secondary" : "default"}
                    onClick={() => handleToggleActive(workflow)}
                    className="flex-1"
                    title={workflow.is_active ? "Deactivate workflow" : "Activate workflow"}
                  >
                    {workflow.is_active ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDeleteDialog(workflow)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedWorkflow?.name}"? This action cannot be undone.
              {selectedWorkflow?.is_active && (
                <span className="block mt-2 text-red-500 font-semibold">
                  Warning: This is an active workflow!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={tenantSelectionOpen} onOpenChange={setTenantSelectionOpen}>
        <AlertDialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle>Create Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Select tenant or system users for workflow
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex border-b flex-shrink-0">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'tenant'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('tenant')}
            >
              Tenants
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'system'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('system')}
            >
              System Users
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {activeTab === 'tenant' && (
              <>
                <div className="mb-4 flex-shrink-0">
                  <Input
                    placeholder="Search tenants by name or company..."
                    value={tenantSearchTerm}
                    onChange={(e) => setTenantSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredTenants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No tenants found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Tenant Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Buildings</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredTenants.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium align-top">{tenant.company}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground align-top">{tenant.name}</td>
                            <td className="px-4 py-3 align-top">
                              {tenant.buildings && tenant.buildings.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {tenant.buildings.map((building: any) => (
                                    <span key={building.id} className="text-sm font-medium">
                                      {building.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No buildings</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <Button
                                size="sm"
                                onClick={() => handleTenantSelect(tenant.id)}
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {activeTab === 'system' && (
              <>
                <div className="mb-4 flex-shrink-0">
                  <Input
                    placeholder="Search users by name or email..."
                    value={systemUserSearchTerm}
                    onChange={(e) => setSystemUserSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg flex-shrink-0">
                  <p className="text-sm text-blue-700">
                    Selected: {selectedSystemUsers.length} user(s)
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredSystemUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No system users found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Select</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredSystemUsers.map((user) => {
                          const isInActiveWorkflow = usersInActiveWorkflows.has(user.id);
                          return (
                            <tr key={user.id} className={`hover:bg-gray-50 ${isInActiveWorkflow ? 'bg-yellow-50' : ''}`}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedSystemUsers.includes(user.id)}
                                  onChange={() => toggleSystemUser(user.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {user.name}
                                {isInActiveWorkflow && (
                                  <span className="ml-2 text-xs text-yellow-600 font-semibold">⚠ In Active Workflow</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                              <td className="px-4 py-3 text-sm">{user.role}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-4 flex-shrink-0">
                  <Button
                    onClick={handleSystemWorkflowCreate}
                    disabled={selectedSystemUsers.length === 0}
                    className="w-full"
                  >
                    Create System Workflow ({selectedSystemUsers.length} users selected)
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <AlertDialogFooter className="flex-shrink-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
