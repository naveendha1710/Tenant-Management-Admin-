import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Edit, Trash2, Plus, Eye, UserCheck, Building2, Mail, Phone, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mockSpaces } from '@/data/mockData';
import { tenantDataService, type Tenant } from '@/data/tenantData';
import { TenantForm } from '@/components/admin/TenantForm';
import { SpaceAssignment } from '@/components/admin/SpaceAssignment';
import { TenantViewDialog } from '@/components/admin/TenantViewDialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/utils/permissions';

export default function CompanyGroup() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const permissions = usePermissions(user?.appUser?.permissions || []);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isViewTenantOpen, setIsViewTenantOpen] = useState(false);
  const [isAssignUnitsOpen, setIsAssignUnitsOpen] = useState(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [assigningTenant, setAssigningTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<any | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloors, setSelectedFloors] = useState<number[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const { toast } = useToast();

  // Check permissions for Companies module
  const canView = permissions.hasPermission('Companies', 'view');
  const canAdd = permissions.hasPermission('Companies', 'add');
  const canEdit = permissions.hasPermission('Companies', 'edit');
  const canDelete = permissions.hasPermission('Companies', 'delete');

  useEffect(() => {
    loadTenants();
  }, [groupId]);

  const loadTenants = async () => {
    if (groupId) {
      const decodedGroupId = decodeURIComponent(groupId);
      const groupTenants = await tenantDataService.getTenantsByGroup(decodedGroupId);
      setTenants(groupTenants);
      setGroupName(decodedGroupId);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800 border-green-200',
      'Pending Move-In': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Vacated': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors['Active'];
  };

  const handleView = (tenant: Tenant) => {
    setViewingTenant(tenant);
    setIsViewTenantOpen(true);
  };

  const handleAssignment = (tenant: Tenant) => {
    setAssigningTenant(tenant);
    setIsAssignUnitsOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    if (canEdit) {
      setEditingTenant(tenant);
      setEditingAgreementIndex(tenant.agreements?.length === 1 ? 0 : null);
      setIsEditTenantOpen(true);
    }
  };

  const [editingAgreementIndex, setEditingAgreementIndex] = useState<number | null>(null);

  const handleEditAgreement = (tenant: Tenant, agreementIndex: number) => {
    setEditingTenant(tenant);
    setEditingAgreementIndex(agreementIndex);
    setIsViewTenantOpen(false);
    setIsEditTenantOpen(true);
  };

  const handleAddAgreement = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditingAgreementIndex(-1);
    setIsViewTenantOpen(false);
    setIsEditTenantOpen(true);
  };

  const handleDeleteAgreement = async (tenant: Tenant, agreementIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this agreement?')) return;
    
    try {
      const agreement = tenant.agreements?.[agreementIndex];
      if (!agreement?.id) return;
      
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('agreements')
        .delete()
        .eq('id', agreement.id);
      
      if (!error) {
        await loadTenants();
        const updatedTenants = await tenantDataService.getAllTenants();
        const updatedTenant = updatedTenants.find(t => t.id === tenant.id);
        if (updatedTenant) {
          setViewingTenant(updatedTenant);
        }
      }
    } catch (error) {
      console.error('Error deleting agreement:', error);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (canDelete && confirm(`Are you sure you want to delete ${tenant.company}?`)) {
      const success = await tenantDataService.deleteTenant(tenant.id);
      
      if (success) {
        toast({ title: "Success", description: `${tenant.company} deleted successfully` });
        loadTenants(); // Reload tenants
      } else {
        toast({ title: "Error", description: "Failed to delete tenant" });
      }
    }
  };

  const handleAddTenant = async (tenantData: Partial<Tenant>) => {
    if (canAdd) {
      const decodedGroupId = groupId ? decodeURIComponent(groupId) : '';
      const newTenant = await tenantDataService.addTenant({
        ...tenantData,
        companyGroup: decodedGroupId
      } as Omit<Tenant, 'id' | 'created_at' | 'updated_at'>);
      
      if (newTenant) {
        toast({ title: "Success", description: `${newTenant.company} added successfully` });
        loadTenants(); // Reload tenants
      } else {
        toast({ title: "Error", description: "Failed to add tenant" });
      }
      setIsAddTenantOpen(false);
      setPendingAssignments(null);
    }
  };

  const handleSpaceAssignment = async (spaceData: any) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const affectedFloorIds = new Set<string>();
      spaceData.assignments.forEach((a: any) => {
        if (a.floorId) affectedFloorIds.add(a.floorId);
      });

      const skipClose = !!spaceData.skipClose;
      const isParentFormOpen = isAddTenantOpen || isEditTenantOpen;

      // Find agreement to update (prefer explicit editing index)
      let agreementId: string | null = null;
      if (editingAgreementIndex !== null && editingAgreementIndex >= 0) {
        agreementId = assigningTenant?.agreements?.[editingAgreementIndex]?.id || null;
      } else if (assigningTenant?.agreements && assigningTenant.agreements.length > 0) {
        agreementId = assigningTenant.agreements[0].id || null;
      }

      if (agreementId) {
        // If add/edit tenant form is open, don't persist here — merge into parent form instead
        if (isParentFormOpen) {
          const updatedTenant = assigningTenant ? { ...assigningTenant } as any : null;
          if (updatedTenant) {
            const newAgreements = (updatedTenant.agreements || []).slice();
            if (editingAgreementIndex !== null && editingAgreementIndex >= 0) {
              const idx = editingAgreementIndex;
              const existing = { ...(newAgreements[idx] || {}) };
              existing.space_assignments = spaceData.assignments;
              existing.rent_amount = spaceData.totalAmount;
              newAgreements[idx] = existing;
            } else {
              const existing = { ...(newAgreements[0] || {}) };
              existing.space_assignments = spaceData.assignments;
              existing.rent_amount = spaceData.totalAmount;
              newAgreements[0] = existing;
            }
            updatedTenant.agreements = newAgreements;
            // Also expose top-level spaceAssignments for the add form
            (updatedTenant as any).spaceAssignments = spaceData.assignments;
          }
          setAssigningTenant(updatedTenant);
          setEditingTenant(updatedTenant);
          setPendingAssignments({ assignments: spaceData.assignments, totalAmount: spaceData.totalAmount });
          toast({ title: 'Success', description: 'Space assignment updated in form' });
          setIsAssignUnitsOpen(false);
          return;
        }

        const { error } = await supabase
          .from('agreements')
          .update({ space_assignments: spaceData.assignments, rent_amount: spaceData.totalAmount })
          .eq('id', agreementId);

        if (error) {
          console.error('Error updating agreement:', error);
        } else {
          for (const floorId of affectedFloorIds) {
            await supabase.rpc('recalculate_floor_occupied_sqft', { p_floor_id: floorId });
          }
          toast({ title: 'Success', description: 'Space assignments updated' });

          if (skipClose) {
            // Keep modal open: propagate assignments to form without reinitializing the whole form
            setPendingAssignments({ assignments: spaceData.assignments, totalAmount: spaceData.totalAmount });
            return;
          }

          // Reload tenants and update editing/assigning tenant so form reflects changes
          const decodedGroupId = groupId ? decodeURIComponent(groupId) : '';
          const updatedTenants = await tenantDataService.getTenantsByGroup(decodedGroupId);
          const updated = updatedTenants.find(t => t.id === assigningTenant?.id) || null;
          if (updated) {
            setEditingTenant(updated);
            setAssigningTenant(updated);
          }
          setIsAssignUnitsOpen(false);
        }
        return;
      }

      // No existing agreement - if tenant exists, insert a new agreement
      if (assigningTenant?.id) {
        if (isParentFormOpen) {
          // Merge a new agreement into the parent form (don't persist yet)
          const updatedTenant = { ...(assigningTenant || {}) } as any;
          const newAgreement = {
            id: undefined,
            tenant_id: assigningTenant.id,
            status: 'Active',
            space_assignments: spaceData.assignments,
            rent_amount: spaceData.totalAmount
          };
          updatedTenant.agreements = [...(updatedTenant.agreements || []), newAgreement];
          updatedTenant.spaceAssignments = spaceData.assignments;
          setAssigningTenant(updatedTenant);
          setEditingTenant(updatedTenant);
          setPendingAssignments({ assignments: spaceData.assignments, totalAmount: spaceData.totalAmount });
          toast({ title: 'Success', description: 'Space assignment applied to form' });
          setIsAssignUnitsOpen(false);
          return;
        }

        const { error } = await supabase.from('agreements').insert([{
          tenant_id: assigningTenant.id,
          status: 'Active',
          space_assignments: spaceData.assignments,
          rent_amount: spaceData.totalAmount
        }]);

        if (error) {
          console.error('Error inserting agreement:', error);
        } else {
          for (const floorId of affectedFloorIds) {
            await supabase.rpc('recalculate_floor_occupied_sqft', { p_floor_id: floorId });
          }
          toast({ title: 'Success', description: 'Space assignments saved' });

          if (skipClose) {
            setPendingAssignments({ assignments: spaceData.assignments, totalAmount: spaceData.totalAmount });
            return;
          }

          const decodedGroupId = groupId ? decodeURIComponent(groupId) : '';
          const updatedTenants = await tenantDataService.getTenantsByGroup(decodedGroupId);
          const updated = updatedTenants.find(t => t.id === assigningTenant?.id) || null;
          if (updated) {
            setEditingTenant(updated);
            setAssigningTenant(updated);
          }
          setIsAssignUnitsOpen(false);
        }
        return;
      }

      // New tenant (no id) - merge assignments into pending assigningTenant so the Add form shows them
      const merged = { ...(assigningTenant || {}), spaceAssignments: spaceData.assignments, rentAmount: spaceData.totalAmount } as Tenant;
      setAssigningTenant(merged);
      setPendingAssignments({ assignments: spaceData.assignments, totalAmount: spaceData.totalAmount });
      toast({ title: 'Success', description: 'Space assignment updated in form' });
      if (!skipClose) setIsAssignUnitsOpen(false);
    } catch (error) {
      console.error('Error in handleSpaceAssignment:', error);
    }
  };

  const handleEditTenant = async (tenantData: Partial<Tenant>) => {
    if (editingTenant && canEdit) {
      try {
        if (editingAgreementIndex !== null && editingAgreementIndex >= 0) {
          // Update specific agreement
          const { supabase } = await import('@/lib/supabase');
          const agreementId = editingTenant.agreements?.[editingAgreementIndex]?.id;
          
          if (agreementId) {
            await supabase
              .from('agreements')
              .update({
                space_assignments: tenantData.spaceAssignments || [],
                rent_amount: Number(tenantData.rentAmount) || 0,
                security_deposit: Number(tenantData.securityDeposit) || 0,
                payment_cycle: tenantData.paymentCycle || 'Monthly',
                status: tenantData.status || 'Active',
                lease_agreement_date: tenantData.leaseAgreementDate || null,
                operation_date: tenantData.operationDate || null,
                rent_commencement_date: tenantData.rentCommencementDate || null,
                lock_in_period: tenantData.lockInPeriod ? Number(tenantData.lockInPeriod) : null,
                lease_tenure: tenantData.leaseTenure ? Number(tenantData.leaseTenure) : null,
                lease_end_date: tenantData.leaseEndDate || null,
                escalations: tenantData.escalations || [],
                documents: tenantData.documents || [],
                maintenance_charges: tenantData.maintenanceCharges || [],
                general_charges: tenantData.generalCharges || [],
                service_charge: tenantData.serviceCharge || { serviceNames: [], amount: 0, isIncludedInRent: false }
              })
              .eq('id', agreementId);
          }
        } else if (editingAgreementIndex === -1) {
          // Add new agreement
          const { supabase } = await import('@/lib/supabase');
          await supabase
            .from('agreements')
            .insert([{
              tenant_id: editingTenant.id,
              status: tenantData.status || 'Active',
              space_assignments: tenantData.spaceAssignments || [],
              rent_amount: tenantData.rentAmount ? Number(tenantData.rentAmount) : 0,
              security_deposit: tenantData.securityDeposit ? Number(tenantData.securityDeposit) : 0,
              payment_cycle: tenantData.paymentCycle || 'Monthly',
              lease_agreement_date: tenantData.leaseAgreementDate || null,
              operation_date: tenantData.operationDate || null,
              rent_commencement_date: tenantData.rentCommencementDate || null,
              lock_in_period: tenantData.lockInPeriod || null,
              lease_tenure: tenantData.leaseTenure || null,
              lease_end_date: tenantData.leaseEndDate || null,
              escalations: tenantData.escalations || [],
              documents: tenantData.documents || [],
              maintenance_charges: tenantData.maintenanceCharges || [],
              general_charges: tenantData.generalCharges || [],
              service_charge: tenantData.serviceCharge || { serviceNames: [], amount: 0, isIncludedInRent: false }
            }]);
        } else {
          // Update tenant personal info
          await tenantDataService.updateTenant(editingTenant.id, tenantData);
        }
        
        toast({ title: "Success", description: `${tenantData.company || editingTenant.company} updated successfully` });
        loadTenants();
      } catch (error) {
        console.error('Error updating tenant:', error);
        toast({ title: "Error", description: "Failed to update tenant" });
      }
      setIsEditTenantOpen(false);
      setEditingTenant(null);
      setEditingAgreementIndex(null);
      setPendingAssignments(null);
    }
  };

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <DashboardLayout title={`${groupName} Tenants`} subtitle={`Manage tenants in ${groupName}`}>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Lock className="h-16 w-16 text-gray-400" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view Companies.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${groupName} Tenants`} subtitle={`Manage tenants in ${groupName}`}>
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.filter(t => t.status === 'Active').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{groupName} Tenants</h2>
            {canAdd ? (
              <Button onClick={() => setIsAddTenantOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add tenants">
                <Lock className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            )}
          </div>
          {tenants.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No tenants found in {groupName}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tenant.company}</CardTitle>
                          <p className="text-sm text-muted-foreground">{tenant.name}</p>
                        </div>
                      </div>
                      <Badge variant={tenant.status === 'Active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{tenant.phone}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Monthly Rent</div>
                      <div className="text-sm font-medium">₹{(tenant.rentAmount || 0).toLocaleString()}</div>
                    </div>
                    
                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(tenant)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {canEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tenant)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-1"
                          title="You don't have permission to edit tenants"
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {canDelete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(tenant)}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-1"
                          title="You don't have permission to delete tenants"
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add Tenant Dialog */}
        <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
          <DialogContent className="max-w-[98vw] w-full h-[98vh] flex flex-col p-0">
            <div className="p-6 pb-0">
              <DialogHeader>
                <DialogTitle>Add New Tenant to {groupName}</DialogTitle>
                <DialogDescription>
                  Add a new tenant to {groupName} company group
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              <TenantForm
                tenant={assigningTenant || undefined}
                isAddingNew={true}
                pendingAssignments={pendingAssignments}
                onSubmit={handleAddTenant}
                onCancel={() => setIsAddTenantOpen(false)}
                defaultCompanyGroup={groupId ? decodeURIComponent(groupId) : ''}
                onAssignSpace={(tenantData) => {
                  // Keep the Add dialog open; just open the SpaceAssignment modal
                  handleAssignment(tenantData as Tenant);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Tenant Dialog */}
        <Dialog open={isEditTenantOpen} onOpenChange={setIsEditTenantOpen}>
          <DialogContent className="max-w-[98vw] w-full h-[98vh] flex flex-col p-0">
            <div className="p-6 pb-0">
              <DialogHeader>
                <DialogTitle>Edit Tenant - {editingTenant?.company}</DialogTitle>
                <DialogDescription>
                  Update tenant information for {editingTenant?.company}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {editingTenant && (
                <TenantForm
                  tenant={editingTenant}
                  agreement={editingAgreementIndex !== null && editingAgreementIndex >= 0 
                    ? editingTenant.agreements?.[editingAgreementIndex] 
                    : undefined}
                  agreementIndex={editingAgreementIndex}
                  mode={editingAgreementIndex !== null ? 'agreement-only' : 'full'}
                  pendingAssignments={pendingAssignments}
                  onSubmit={handleEditTenant}
                  onCancel={() => {
                    setIsEditTenantOpen(false);
                    setEditingTenant(null);
                    setEditingAgreementIndex(null);
                  }}
                    onAssignSpace={(tenantData) => {
                      // Keep the Edit dialog open; just open the SpaceAssignment modal
                      handleAssignment(tenantData as Tenant);
                    }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View Tenant Dialog */}
        {/* Space Assignment Modal */}
        <SpaceAssignment
          isOpen={isAssignUnitsOpen}
          onClose={() => { setIsAssignUnitsOpen(false); }}
          tenant={
            editingAgreementIndex !== null && editingAgreementIndex >= 0
              ? { ...assigningTenant, spaceAssignments: assigningTenant?.agreements?.[editingAgreementIndex]?.spaceAssignments || [] }
              : editingAgreementIndex === -1
              ? { ...assigningTenant, spaceAssignments: [] }
              : assigningTenant
          }
          onAssign={handleSpaceAssignment}
        />

        <TenantViewDialog
          tenant={viewingTenant}
          isOpen={isViewTenantOpen}
          onClose={() => setIsViewTenantOpen(false)}
          onEdit={canEdit ? (tenant) => {
            setIsViewTenantOpen(false);
            setEditingTenant(tenant);
            setEditingAgreementIndex(null);
            setIsEditTenantOpen(true);
          } : undefined}
          onEditAgreement={canEdit ? handleEditAgreement : undefined}
          onAddAgreement={canEdit ? handleAddAgreement : undefined}
          onDeleteAgreement={canEdit ? handleDeleteAgreement : undefined}
          canEdit={canEdit}
        />
      </div>
    </DashboardLayout>
  );
}