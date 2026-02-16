import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Mail, MessageSquare, Phone, Download, Send, Building, Lock, Settings, User as UserIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { mockSpaces } from '@/data/mockData';
import { TenantForm } from '@/components/admin/TenantForm';
import { SpaceAssignment } from '@/components/admin/SpaceAssignment';
import { TenantViewDialog } from '@/components/admin/TenantViewDialog';
import { tenantDataService, type Tenant } from '@/data/tenantData';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/utils/permissions';
import LoadingScreen from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';

const TenantManagement: React.FC = () => {
  const { user } = useAuth();
  const permissions = usePermissions(user?.appUser?.permissions || []);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSpaceAssignmentOpen, setIsSpaceAssignmentOpen] = useState(false);
  const [isViewTenantOpen, setIsViewTenantOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pendingTenantData, setPendingTenantData] = useState<any>(null);
  const [isChargeCategoryOpen, setIsChargeCategoryOpen] = useState(false);
  const [chargeCategories, setChargeCategories] = useState<string[]>([]);
  const [newChargeCategory, setNewChargeCategory] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [editingAgreementIndex, setEditingAgreementIndex] = useState<number | null>(null);
  const [editingPersonalOnly, setEditingPersonalOnly] = useState(false);
  const [newTenantId, setNewTenantId] = useState<string | null>(null);
  const [cameFromViewDialog, setCameFromViewDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate current rent with floor-wise escalations applied
  const calculateCurrentRent = (tenant: Tenant) => {
    const agreements = tenant.agreements || [];
    const activeAgreements = agreements.filter((a: any) => a.status === 'Active' || a.status === 'Pending Move-In');
    
    if (activeAgreements.length === 0) return 0;
    
    const today = new Date();
    let totalRent = 0;
    
    activeAgreements.forEach((agreement: any) => {
      const spaceAssignments = agreement.spaceAssignments || [];
      const escalations = agreement.escalations || [];
      const maintenanceCharges = agreement.maintenanceCharges || [];
      const generalCharges = agreement.generalCharges || [];
      const serviceCharge = agreement.serviceCharge || { amount: 0, isIncludedInRent: false };
      
      // Calculate escalated base rent
      let baseRent = 0;
      for (let idx = 0; idx < spaceAssignments.length; idx++) {
        const assignment = spaceAssignments[idx];
        const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
        let floorRent = assignment.amount || 0;
        
        for (const escalation of escalations) {
          if (!escalation.date) continue;
          const escalationDate = new Date(escalation.date);
          if (escalationDate > today) continue;
          
          const floorEsc = escalation.floorWiseEscalations?.find((f: any) => 
            f.floorId === uniqueId || f.floorId === assignment.floorId || f.floorId === assignment.id
          );
          if (floorEsc && floorEsc.percentage) {
            floorRent = floorRent + (floorRent * floorEsc.percentage / 100);
          }
        }
        baseRent += floorRent;
      }
      
      // Calculate maintenance charges
      const maintenanceTotal = maintenanceCharges
        .filter((c: any) => !c.isIncludedInRent)
        .reduce((sum: number, charge: any) => sum + ((charge.sqft || 0) * (charge.ratePerSqft || 0)), 0);
      
      // Calculate general charges (only current month)
      const generalTotal = generalCharges.reduce((sum: number, charge: any) => {
        if (charge.dueDate) {
          const dueDate = new Date(charge.dueDate);
          if (dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear()) {
            return sum + (charge.amount || 0);
          }
        }
        return sum;
      }, 0);
      
      // Add service charge if not included in rent
      const serviceTotal = serviceCharge.isIncludedInRent ? 0 : (serviceCharge.amount || 0);
      
      totalRent += baseRent + maintenanceTotal + generalTotal + serviceTotal;
    });
    
    return Math.round(totalRent);
  };

  // Check permissions for Tenants module
  const canView = permissions.hasPermission('Tenants', 'view');
  const canAdd = permissions.hasPermission('Tenants', 'add');
  const canEdit = permissions.hasPermission('Tenants', 'edit');
  const canDelete = permissions.hasPermission('Tenants', 'delete');

  useEffect(() => {
    loadTenants();
    loadChargeCategories();
    
    // Set up real-time subscription for tenants, agreements, and floors tables
    const setupRealtimeSubscription = async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      
      const subscription = supabase
        .channel('tenant-management-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tenants' },
          () => {
            loadTenants();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'agreements' },
          () => {
            loadTenants();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'floors' },
          () => {
            loadTenants();
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    };
    
    setupRealtimeSubscription();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    const allTenants = await tenantDataService.getAllTenants();
    setTenants(allTenants);
    
    // Update viewingTenant if it's currently open
    if (viewingTenant?.id) {
      const updatedViewingTenant = allTenants.find(t => t.id === viewingTenant.id);
      if (updatedViewingTenant) {
        setViewingTenant(updatedViewingTenant);
      }
    }
    
    setLoading(false);
  };

  const loadChargeCategories = async () => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'general_charge_categories')
        .maybeSingle();
      if (data?.value) {
        setChargeCategories(data.value);
      } else {
        const defaultCategories = ['Lift AMC', 'Generator AMC', 'Fire Safety AMC', 'AC AMC', 'Pest Control', 'Water Tank Cleaning', 'Security Charges', 'Parking Charges', 'Other'];
        setChargeCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Failed to load charge categories:', error);
    }
  };

  const getStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'success' => {
    switch (status) {
      case 'Active': return 'success';
      case 'Pending Move-In': return 'secondary';
      case 'Vacated': return 'destructive';
      default: return 'default';
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.space && tenant.space.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleSendReminder = (tenant: any, method: string) => {
    // Implementation for sending reminders
  };

  const handleAddTenant = () => {
    setSelectedTenant(null);
    setEditingAgreementIndex(null);
    setEditingPersonalOnly(false);
    setNewTenantId(null);
    setIsFormOpen(true);
  };

  const handleEditTenant = (tenant: any, agreementIndex?: number) => {
    setSelectedTenant(tenant);
    setEditingAgreementIndex(agreementIndex !== undefined ? agreementIndex : (tenant.agreements?.length === 1 ? 0 : null));
    setEditingPersonalOnly(false);
    setIsFormOpen(true);
  };

  const handleSaveTenant = async (tenantData: any) => {
    try {
      if ((!selectedTenant?.id || newTenantId) && canAdd) {
        // Add new tenant
        if (!newTenantId) {
          // First save: personal info to tenants table
          const result = await tenantDataService.addTenant({
            name: tenantData.name,
            company: tenantData.company,
            email: tenantData.email,
            phone: tenantData.phone,
            phone_numbers: tenantData.phoneNumbers || [tenantData.phone],
            password: tenantData.password,
            status: 'Pending Move-In',
            companygroup: tenantData.companyGroup || null,
            address: tenantData.address || null,
            idproof: tenantData.idProof || null,
            is_gst_company: tenantData.isGstCompany || false,
            gst_number: tenantData.gstNumber || null,
            tan_number: tenantData.tanNumber || null,
            pan_number: tenantData.panNumber || null,
            cin_number: tenantData.cinNumber || null
          });
          
          if (!result || !result.id) {
            throw new Error('Failed to create tenant record - no ID returned');
          }
          
          try {
            const { userService } = await import('@/data/userData');
            await userService.addUser({
              name: tenantData.name,
              email: tenantData.email,
              phone: tenantData.phone || '',
              password: tenantData.password || 'admin123',
              role: 'Tenant',
              department: tenantData.company,
              isActive: false,
              isApprover: false,
              twoFactorEnabled: false,
              userType: 'predefined'
            });
          } catch (userError) {
            console.error('Failed to create tenant user account:', userError);
          }
          
          setNewTenantId(result.id);
          // Update selectedTenant with the newly created tenant data
          setSelectedTenant({
            ...result,
            companyGroup: result.companygroup,
            idProof: result.idproof,
            isGstCompany: result.is_gst_company,
            gstNumber: result.gst_number,
            tanNumber: result.tan_number,
            panNumber: result.pan_number,
            cinNumber: result.cin_number,
            phoneNumbers: result.phone_numbers || [result.phone],
            agreements: []
          });
          // Reload tenant list to show the newly created tenant
          await loadTenants();
          toast({ title: 'Success', description: 'Tenant personal information saved successfully' });
        } else {
          // Subsequent saves: update/create agreement in agreements table
          const { supabase } = await import('@/lib/supabase');
          
          // Update status and company group in tenants table
          const { error: updateError } = await supabase
            .from('tenants')
            .update({ 
              status: tenantData.status || 'Pending Move-In',
              companygroup: tenantData.companyGroup || null
            })
            .eq('id', newTenantId);
          
          if (updateError) throw updateError;
          
          // Check if agreement exists
          const { data: existingAgreements } = await supabase
            .from('agreements')
            .select('id')
            .eq('tenant_id', newTenantId);
          
          const agreementData = {
            tenant_id: newTenantId,
            status: tenantData.status || 'Pending Move-In',
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
          };
          
          if (existingAgreements && existingAgreements.length > 0) {
            // Update existing agreement
            const { error: updateAgreementError } = await supabase
              .from('agreements')
              .update(agreementData)
              .eq('id', existingAgreements[0].id);
            
            if (updateAgreementError) throw updateAgreementError;
          } else {
            // Create new agreement
            const { error: insertAgreementError } = await supabase
              .from('agreements')
              .insert([agreementData]);
            
            if (insertAgreementError) throw insertAgreementError;
            
            // Reload tenants immediately after creating agreement
            await loadTenants();
          }
          

          
          // Update selectedTenant with latest data after saving agreement
          if (selectedTenant) {
            const updatedTenant = {
              ...selectedTenant,
              spaceAssignments: tenantData.spaceAssignments,
              rentAmount: tenantData.rentAmount,
              securityDeposit: tenantData.securityDeposit,
              paymentCycle: tenantData.paymentCycle,
              status: tenantData.status,
              agreements: existingAgreements && existingAgreements.length > 0 ? selectedTenant.agreements : [{
                id: existingAgreements?.[0]?.id,
                status: tenantData.status,
                spaceAssignments: tenantData.spaceAssignments,
                rentAmount: tenantData.rentAmount,
                securityDeposit: tenantData.securityDeposit,
                paymentCycle: tenantData.paymentCycle,
                escalations: tenantData.escalations,
                documents: tenantData.documents,
                maintenanceCharges: tenantData.maintenanceCharges,
                generalCharges: tenantData.generalCharges,
                serviceCharge: tenantData.serviceCharge
              }]
            };
            setSelectedTenant(updatedTenant);
          }
          
          // Only close form on last tab
          if (tenantData.activeTab === 'documents') {
            await loadTenants();
            setIsFormOpen(false);
            setNewTenantId(null);
            setSelectedTenant(null);
            toast({ title: 'Success', description: 'Tenant saved successfully' });
          } else {
            toast({ title: 'Saved', description: 'Changes saved to database' });
          }
        }
      } else if (editingAgreementIndex !== null && editingAgreementIndex >= 0) {
        // Update specific agreement in agreements table
        const { supabase } = await import('@/lib/supabase');
        const agreementId = selectedTenant.agreements?.[editingAgreementIndex]?.id;
        
        // Update status in tenants table
        const { error: statusError } = await supabase
          .from('tenants')
          .update({ status: tenantData.status || 'Active' })
          .eq('id', selectedTenant.id);
        
        if (statusError) throw statusError;
        
        // Update company group in tenants table if changed
        if (tenantData.companyGroup !== selectedTenant.companyGroup) {
          const { error: cgError } = await supabase
            .from('tenants')
            .update({ companygroup: tenantData.companyGroup })
            .eq('id', selectedTenant.id);
          
          if (cgError) throw cgError;
        }
        
        if (agreementId) {
          const { error: agreementUpdateError } = await supabase
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
          
          if (agreementUpdateError) throw agreementUpdateError;
        }
        
        await loadTenants();
        // Don't close the form, just show success message
        toast({ title: 'Success', description: 'Agreement updated successfully' });
      } else if (editingAgreementIndex === -1) {
        // Add new agreement to agreements table - only save on last tab
        if (tenantData.activeTab === 'documents') {
          const { supabase } = await import('@/lib/supabase');
          
          const { error: newAgreementError } = await supabase
            .from('agreements')
            .insert([{
              tenant_id: selectedTenant.id,
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
          
          if (newAgreementError) throw newAgreementError;
          
          await loadTenants();
          setIsFormOpen(false);
          setEditingAgreementIndex(null);
          toast({ title: 'Success', description: 'New agreement added successfully' });
        }
      } else if (editingPersonalOnly) {
        // Update personal info only
        const changedData: any = {};
        if (tenantData.name !== selectedTenant.name) changedData.name = tenantData.name;
        if (tenantData.company !== selectedTenant.company) changedData.company = tenantData.company;
        if (tenantData.email !== selectedTenant.email) changedData.email = tenantData.email;
        if (tenantData.phone !== selectedTenant.phone) changedData.phone = tenantData.phone;
        if (JSON.stringify(tenantData.phoneNumbers) !== JSON.stringify(selectedTenant.phoneNumbers)) changedData.phone_numbers = tenantData.phoneNumbers;
        if (tenantData.password !== selectedTenant.password) changedData.password = tenantData.password;
        if (tenantData.address !== selectedTenant.address) changedData.address = tenantData.address;
        if (tenantData.idProof !== selectedTenant.idProof) changedData.idproof = tenantData.idProof;
        if (tenantData.isGstCompany !== selectedTenant.isGstCompany) changedData.is_gst_company = tenantData.isGstCompany;
        if (tenantData.gstNumber !== selectedTenant.gstNumber) changedData.gst_number = tenantData.gstNumber;
        if (tenantData.tanNumber !== selectedTenant.tanNumber) changedData.tan_number = tenantData.tanNumber;
        if (tenantData.panNumber !== selectedTenant.panNumber) changedData.pan_number = tenantData.panNumber;
        if (tenantData.cinNumber !== selectedTenant.cinNumber) changedData.cin_number = tenantData.cinNumber;
        if (tenantData.companyGroup !== selectedTenant.companyGroup) changedData.companygroup = tenantData.companyGroup;
        
        if (Object.keys(changedData).length > 0) {
          await tenantDataService.updateTenant(selectedTenant.id, changedData);
          if (changedData.password) {
            try {
              const { userService } = await import('@/data/userData');
              const allUsers = await userService.getAllUsers();
              const userAccount = allUsers.find(u => u.email === selectedTenant.email);
              if (userAccount) {
                await userService.updateUser(userAccount.id, { password: changedData.password });
              }
            } catch (error) {
              console.error('Failed to update user password:', error);
            }
          }
          await loadTenants();
          toast({ title: 'Success', description: 'Personal information updated successfully' });
        }
        setIsFormOpen(false);
        setEditingPersonalOnly(false);
      } else if (selectedTenant?.id && !newTenantId && !editingAgreementIndex && !editingPersonalOnly) {
        // Editing existing tenant - update agreement or tenant data based on active tab
        const { supabase } = await import('@/lib/supabase');
        
        if (tenantData.activeTab === 'personal') {
          // Update personal info in tenants table
          const changedData: any = {};
          if (tenantData.name !== selectedTenant.name) changedData.name = tenantData.name;
          if (tenantData.company !== selectedTenant.company) changedData.company = tenantData.company;
          if (tenantData.email !== selectedTenant.email) changedData.email = tenantData.email;
          if (tenantData.phone !== selectedTenant.phone) changedData.phone = tenantData.phone;
          if (JSON.stringify(tenantData.phoneNumbers) !== JSON.stringify(selectedTenant.phoneNumbers)) changedData.phone_numbers = tenantData.phoneNumbers;
          if (tenantData.password !== selectedTenant.password) changedData.password = tenantData.password;
          if (tenantData.address !== selectedTenant.address) changedData.address = tenantData.address;
          if (tenantData.idProof !== selectedTenant.idProof) changedData.idproof = tenantData.idProof;
          if (tenantData.isGstCompany !== selectedTenant.isGstCompany) changedData.is_gst_company = tenantData.isGstCompany;
          if (tenantData.gstNumber !== selectedTenant.gstNumber) changedData.gst_number = tenantData.gstNumber;
          if (tenantData.tanNumber !== selectedTenant.tanNumber) changedData.tan_number = tenantData.tanNumber;
          if (tenantData.panNumber !== selectedTenant.panNumber) changedData.pan_number = tenantData.panNumber;
          if (tenantData.cinNumber !== selectedTenant.cinNumber) changedData.cin_number = tenantData.cinNumber;
          if (tenantData.companyGroup !== selectedTenant.companyGroup) changedData.companygroup = tenantData.companyGroup;
          
          if (Object.keys(changedData).length > 0) {
            await tenantDataService.updateTenant(selectedTenant.id, changedData);
          }
          await loadTenants();
          toast({ title: 'Success', description: 'Personal information updated successfully' });
        } else {
          // Update company group in tenants table
          if (tenantData.companyGroup !== selectedTenant.companyGroup) {
            const { error: cgError } = await supabase
              .from('tenants')
              .update({ companygroup: tenantData.companyGroup })
              .eq('id', selectedTenant.id);
            
            if (cgError) throw cgError;
          }
          
          // Update or create agreement
          const { data: existingAgreements } = await supabase
            .from('agreements')
            .select('id')
            .eq('tenant_id', selectedTenant.id);
          
          const agreementData = {
            tenant_id: selectedTenant.id,
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
          };
          
          if (existingAgreements && existingAgreements.length > 0) {
            const { error: updateError } = await supabase
              .from('agreements')
              .update(agreementData)
              .eq('id', existingAgreements[0].id);
            
            if (updateError) throw updateError;
            toast({ title: 'Success', description: 'Agreement updated successfully' });
          } else {
            const { error: insertError } = await supabase
              .from('agreements')
              .insert([agreementData]);
            
            if (insertError) throw insertError;
            toast({ title: 'Success', description: 'Agreement created successfully' });
          }
          
          await loadTenants();
        }
      }
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      const errorMessage = error?.message || 'Failed to save tenant data';
      toast({ 
        title: 'Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (canDelete) {
      setTenantToDelete(tenant);
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    
    try {
      // Delete tenant user account first
      try {
        const { userService } = await import('@/data/userData');
        const allUsers = await userService.getAllUsers();
        const userAccount = allUsers.find(u => u.email === tenantToDelete.email);
        if (userAccount) {
          await userService.deleteUser(userAccount.id);
        }
      } catch (error) {
        console.error('Failed to delete tenant user account:', error);
      }
      
      // Delete tenant and recalculate floor space
      await tenantDataService.deleteTenant(tenantToDelete.id);
      loadTenants();
      setDeleteConfirmOpen(false);
      setTenantToDelete(null);
      toast({ title: 'Success', description: 'Tenant deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to delete tenant', 
        variant: 'destructive' 
      });
    }
  };

  const handleSelectTenant = (tenantId: string, checked: boolean) => {
    if (checked) {
      setSelectedTenants(prev => [...prev, tenantId]);
    } else {
      setSelectedTenants(prev => prev.filter(id => id !== tenantId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTenants(filteredTenants.map(t => t.id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === 'export') {
      const ExcelJS = (await import('exceljs')).default;
      const selectedTenantsData = tenants.filter(t => selectedTenants.includes(t.id));
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tenants');
      worksheet.columns = [
        { header: 'Company', key: 'company', width: 20 },
        { header: 'Contact Person', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'ID Proof', key: 'idProof', width: 20 },
        { header: 'Company Type', key: 'companyType', width: 15 },
        { header: 'GST Number', key: 'gstNumber', width: 20 },
        { header: 'TAN Number', key: 'tanNumber', width: 15 },
        { header: 'PAN Number', key: 'panNumber', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Company Group', key: 'companyGroup', width: 20 },
        { header: 'Space', key: 'space', width: 30 },
        { header: 'Base Rent', key: 'baseRent', width: 15 },
        { header: 'Maintenance Charges', key: 'maintenanceCharges', width: 20 },
        { header: 'Total Rent', key: 'totalRent', width: 15 },
        { header: 'Security Deposit', key: 'securityDeposit', width: 18 },
        { header: 'Payment Cycle', key: 'paymentCycle', width: 15 },
        { header: 'Lease Agreement Date', key: 'leaseAgreementDate', width: 20 },
        { header: 'Operation Date', key: 'operationDate', width: 18 },
        { header: 'Rent Commencement Date', key: 'rentCommencementDate', width: 22 },
        { header: 'Lock-in Period (months)', key: 'lockInPeriod', width: 22 },
        { header: 'Lease End Date', key: 'leaseEndDate', width: 18 }
      ];
      selectedTenantsData.forEach(tenant => {
        const maintenanceCharges = (tenant.maintenanceCharges || []).reduce((total: number, charge: any) => {
          const sqft = (tenant.spaceAssignments || []).reduce((sum: number, sa: any) => sum + (sa.assignedSqft || 0), 0);
          return total + (sqft * (charge.ratePerSqft || 0));
        }, 0);
        worksheet.addRow({
          company: tenant.company,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          address: tenant.address || '',
          idProof: tenant.idProof || '',
          companyType: tenant.isGstCompany ? 'GST Registered' : 'Non-GST',
          gstNumber: tenant.gstNumber || '',
          tanNumber: tenant.tanNumber || '',
          panNumber: tenant.panNumber || '',
          status: tenant.status,
          companyGroup: tenant.companyGroup || '',
          space: tenant.space || '',
          baseRent: tenant.rentAmount || 0,
          maintenanceCharges,
          totalRent: (tenant.rentAmount || 0) + maintenanceCharges,
          securityDeposit: tenant.securityDeposit || 0,
          paymentCycle: tenant.paymentCycle || '',
          leaseAgreementDate: tenant.leaseAgreementDate || '',
          operationDate: tenant.operationDate || '',
          rentCommencementDate: tenant.rentCommencementDate || '',
          lockInPeriod: tenant.lockInPeriod || '',
          leaseEndDate: tenant.leaseEndDate || ''
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tenants_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleEditAgreement = (tenant: Tenant, agreementIndex: number) => {
    setSelectedTenant(tenant);
    setEditingAgreementIndex(agreementIndex);
    setCameFromViewDialog(true);
    setIsFormOpen(true);
    setIsViewTenantOpen(false);
  };

  const handleAddAgreement = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditingAgreementIndex(-1);
    setCameFromViewDialog(true);
    setIsFormOpen(true);
    setIsViewTenantOpen(false);
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

  const handleViewTenant = (tenant: Tenant) => {
    setViewingTenant(tenant);
    setIsViewTenantOpen(true);
  };

  const handleAssignSpace = (tenant: any) => {
    // Use newTenantId if available for new tenants
    const tenantToAssign = tenant?.id ? tenant : (newTenantId ? { ...tenant, id: newTenantId } : tenant);
    
    if (!tenantToAssign?.id) {
      setPendingTenantData(tenant);
    }
    setSelectedTenant(tenantToAssign);
    setIsSpaceAssignmentOpen(true);
  };

  const handleSpaceAssignment = async (spaceData: any) => {
    if (spaceData.skipClose) {
      // Just update the database without closing dialog
      try {
        const { supabase } = await import('@/lib/supabase');
        
        const affectedFloorIds = new Set<string>();
        spaceData.assignments.forEach((a: any) => {
          if (a.floorId) affectedFloorIds.add(a.floorId);
        });
        
        // Find the agreement to update
        let agreementId = null;
        if (editingAgreementIndex !== null && editingAgreementIndex >= 0) {
          agreementId = selectedTenant.agreements?.[editingAgreementIndex]?.id;
        } else if (selectedTenant?.agreements && selectedTenant.agreements.length > 0) {
          // If no specific agreement index, update the first/only agreement
          agreementId = selectedTenant.agreements[0].id;
        }
        
        if (agreementId) {
          const { data: updateResult, error } = await supabase
            .from('agreements')
            .update({
              space_assignments: spaceData.assignments,
              rent_amount: spaceData.totalAmount
            })
            .eq('id', agreementId)
            .select();
          
          if (error) {
            console.error('Error updating agreement:', error);
          } else {
            if (selectedTenant) {
              selectedTenant.spaceAssignments = spaceData.assignments;
            }
          }
        }
        
        for (const floorId of affectedFloorIds) {
          await supabase.rpc('recalculate_floor_occupied_sqft', { p_floor_id: floorId });
        }
        
        await loadTenants();
        const updatedTenants = await tenantDataService.getAllTenants();
        const updatedTenant = updatedTenants.find(t => t.id === selectedTenant.id);
        if (updatedTenant) {
          setSelectedTenant(updatedTenant);
        }
        return;
      } catch (error) {
        console.error('Error in skipClose update:', error);
        return;
      }
    }
    
    if (selectedTenant?.id && editingAgreementIndex !== null) {
      // Editing an agreement - save spaces to that specific agreement
      try {
        const { supabase } = await import('@/lib/supabase');
        
        const affectedFloorIds = new Set<string>();
        spaceData.assignments.forEach((a: any) => {
          if (a.floorId) affectedFloorIds.add(a.floorId);
        });
        
        if (editingAgreementIndex === -1) {
          // Adding new agreement - just update selectedTenant with space data
          const updatedTenant = {
            ...selectedTenant,
            spaceAssignments: spaceData.assignments,
            rentAmount: spaceData.totalAmount
          };
          setSelectedTenant(updatedTenant);
          setIsSpaceAssignmentOpen(false);
        } else {
          // Editing existing agreement - update in agreements table
          const agreementId = selectedTenant.agreements?.[editingAgreementIndex]?.id;
          if (agreementId) {
            const { data: updateResult, error } = await supabase
              .from('agreements')
              .update({
                space_assignments: spaceData.assignments,
                rent_amount: spaceData.totalAmount
              })
              .eq('id', agreementId)
              .select();
            
            if (error) {
              console.error('Error updating agreement:', error);
            } else {
              for (const floorId of affectedFloorIds) {
                await supabase.rpc('recalculate_floor_occupied_sqft', { p_floor_id: floorId });
              }
              await loadTenants();
              const updatedTenants = await tenantDataService.getAllTenants();
              const updatedTenant = updatedTenants.find(t => t.id === selectedTenant.id);
              if (updatedTenant && updatedTenant.agreements?.[0]?.spaceAssignments) {
                updatedTenant.spaceAssignments = updatedTenant.agreements[0].spaceAssignments;
                setSelectedTenant(updatedTenant);
              }
              setIsSpaceAssignmentOpen(false);
            }
          }
        }
      } catch (error) {
        console.error('Error in handleSpaceAssignment:', error);
      }
    } else if (selectedTenant?.id || newTenantId) {
      // New tenant with saved personal info - save to form state and update selectedTenant
      const updatedTenantData = {
        ...selectedTenant,
        id: newTenantId || selectedTenant?.id,
        spaceAssignments: spaceData.assignments,
        rentAmount: String(spaceData.totalAmount),
        space: spaceData.assignments.map((a: any) => `${a.buildingName} Floor ${a.floorName || a.floor}`).join(', ')
      };
      setSelectedTenant(updatedTenantData);
      setIsSpaceAssignmentOpen(false);
    } else if (pendingTenantData) {
      // New tenant - merge space data with form data and reopen form
      const updatedTenantData = {
        ...pendingTenantData,
        spaceAssignments: spaceData.assignments,
        rentAmount: String(spaceData.totalAmount),
        space: spaceData.assignments.map((a: any) => `${a.buildingName} Floor ${a.floor}`).join(', ')
      };
      setSelectedTenant(updatedTenantData);
      setIsSpaceAssignmentOpen(false);
      setPendingTenantData(null);
    }
  };

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <DashboardLayout title="Tenant Management" subtitle="Manage all tenants, spaces, and rent details">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Lock className="h-16 w-16 text-gray-400" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view Tenants.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tenant Management" subtitle="Manage all tenants, spaces, and rent details">
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending Move-In">Pending Move-In</SelectItem>
                <SelectItem value="Vacated">Vacated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedTenants.length > 0 && (
              <>
                <Button variant="outline" onClick={() => handleBulkAction('reminder')}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminders ({selectedTenants.length})
                </Button>
                <Button variant="outline" onClick={() => handleBulkAction('export')} disabled={selectedTenants.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
              </>
            )}
            {canAdd ? (
              <Button onClick={handleAddTenant}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Tenant
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add tenants">
                <Lock className="h-4 w-4 mr-2" />
                Add New Tenant
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tenants</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Active Tenants</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                    {tenants.filter(t => t.status === 'Active').length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Move-In</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">
                    {tenants.filter(t => t.status === 'Pending Move-In').length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Rent</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-emerald-600">
                    ₹{Math.round(tenants.filter(t => t.status === 'Active').reduce((sum, t) => sum + calculateCurrentRent(t), 0)).toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Overview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingScreen />
              </div>
            ) : (
            <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                    <TableHead className="w-12 text-gray-600 font-semibold uppercase text-xs">
                      <Checkbox
                        checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-gray-600 font-semibold uppercase text-xs">COMPANY/BUSINESS</TableHead>
                    <TableHead className="text-gray-600 font-semibold uppercase text-xs">COMPANY GROUP</TableHead>
                    <TableHead className="text-gray-600 font-semibold uppercase text-xs">CURRENT RENT</TableHead>
                    <TableHead className="text-gray-600 font-semibold uppercase text-xs">STATUS</TableHead>
                    <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedTenants.includes(tenant.id)}
                          onCheckedChange={(checked) => handleSelectTenant(tenant.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {tenant.company.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tenant.company}</p>
                            <p className="text-sm text-gray-500">{tenant.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.companyGroup ? (
                          <Badge variant="outline" className="text-xs capitalize">
                            {tenant.companyGroup}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not Assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">₹{calculateCurrentRent(tenant).toLocaleString()}</p>
                          <p className="text-sm text-gray-500">per month</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(tenant.status)} className="capitalize">
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="ghost" onClick={() => handleViewTenant(tenant)} title="View" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit ? (
                            tenant?.agreements?.length > 1 ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {tenant.agreements?.map((agreement: any, index: number) => (
                                    <DropdownMenuItem key={index} onClick={() => handleEditTenant(tenant, index)}>
                                      Agreement {index + 1}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => handleEditTenant(tenant)} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )
                          ) : (
                            <Button size="sm" variant="ghost" disabled title="No Edit Permission" className="text-gray-400">
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit ? (
                            <Button size="sm" variant="ghost" onClick={() => handleAssignSpace(tenant)} title="Assign Space" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                              <Building className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" disabled title="No Assign Permission" className="text-gray-400">
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSendReminder(tenant, 'email')}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendReminder(tenant, 'sms')}>
                                <Phone className="h-4 w-4 mr-2" />
                                Send SMS
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendReminder(tenant, 'whatsapp')}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                WhatsApp
                              </DropdownMenuItem>
                              {canDelete && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteTenant(tenant)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
            {!loading && filteredTenants.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTenants.length)} of {filteredTenants.length} tenants
                </div>
                {filteredTenants.length > itemsPerPage && (
                <div className="flex justify-center">
                  <nav className="flex items-center gap-1 shadow-sm rounded-lg bg-gray-50 p-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:pointer-events-none transition-colors"
                    aria-label="previous page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  {getPageNumbers().map((page, idx) => (
                    page === 'ellipsis' ? (
                      <button
                        key={`ellipsis-${idx}`}
                        className="group flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
                        aria-label="jump pages"
                        onClick={() => {
                          const jumpTo = idx === 1 ? Math.floor(currentPage / 2) : Math.ceil((currentPage + totalPages) / 2);
                          setCurrentPage(jumpTo);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 group-hover:hidden">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 hidden group-hover:block">
                          <path d="m6 17 5-5-5-5" />
                          <path d="m13 17 5-5-5-5" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`flex items-center justify-center min-w-9 h-9 px-3 rounded-md text-sm font-medium transition-all ${
                          currentPage === page
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                        aria-label={`page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:pointer-events-none transition-colors"
                    aria-label="next page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </nav>
                </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Form Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-[98vw] w-full h-[98vh] flex flex-col p-0">
            <div className="p-6 pb-0">
              <DialogHeader>
                <DialogTitle>
                  {selectedTenant?.id && !newTenantId ? 'Edit Tenant' : 'Add New Tenant'}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              <TenantForm
              key={selectedTenant?.id || 'new'}
              tenant={selectedTenant}
              agreement={editingAgreementIndex !== null && editingAgreementIndex >= 0 
                ? selectedTenant?.agreements?.[editingAgreementIndex] 
                : undefined}
              agreementIndex={editingAgreementIndex}
              mode={editingAgreementIndex !== null ? 'agreement-only' : editingPersonalOnly ? 'personal-only' : 'full'}
              isAddingNew={!!newTenantId || (!selectedTenant?.id && !editingAgreementIndex && !editingPersonalOnly)}
              onSubmit={async (data) => {
                await handleSaveTenant(data);
              }}
              onCancel={async () => {
                if (cameFromViewDialog) {
                  setIsFormOpen(false);
                  setEditingAgreementIndex(null);
                  setCameFromViewDialog(false);
                  await loadTenants();
                  setTimeout(() => setIsViewTenantOpen(true), 100);
                } else {
                  setIsFormOpen(false);
                  setSelectedTenant(null);
                  setPendingTenantData(null);
                  setEditingAgreementIndex(null);
                  setEditingPersonalOnly(false);
                  setNewTenantId(null);
                  await loadTenants();
                }
              }}
              onAssignSpace={(tenant) => {
                handleAssignSpace(tenant);
              }}
            />
            </div>
          </DialogContent>
        </Dialog>

        {/* Space Assignment Modal */}
        <SpaceAssignment
          isOpen={isSpaceAssignmentOpen}
          onClose={() => setIsSpaceAssignmentOpen(false)}
          tenant={editingAgreementIndex !== null && editingAgreementIndex >= 0
            ? { ...selectedTenant, spaceAssignments: selectedTenant?.agreements?.[editingAgreementIndex]?.spaceAssignments || [] }
            : editingAgreementIndex === -1
            ? { ...selectedTenant, spaceAssignments: [] }
            : selectedTenant}
          onAssign={handleSpaceAssignment}
        />

        {/* Charge Category Dialog */}
        <Dialog open={isChargeCategoryOpen} onOpenChange={setIsChargeCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Charge Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {chargeCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded">
                      <span className="text-sm">{cat}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-red-100"
                        onClick={async () => {
                          const updated = chargeCategories.filter((_, i) => i !== idx);
                          const { supabase } = await import('@/lib/supabaseClient');
                          const { error } = await supabase.from('app_settings').update({ value: updated }).eq('key', 'general_charge_categories');
                          if (error) console.error('Error deleting category:', error);
                          setChargeCategories(updated);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="new_charge_category">Add New Category</Label>
                <div className="flex gap-2">
                  <Input
                    id="new_charge_category"
                    value={newChargeCategory}
                    onChange={(e) => setNewChargeCategory(e.target.value)}
                    placeholder="e.g., Housekeeping"
                  />
                  <Button
                    onClick={async () => {
                      if (newChargeCategory.trim()) {
                        const updated = [...chargeCategories, newChargeCategory.trim()];
                        const { supabase } = await import('@/lib/supabaseClient');
                        const { error } = await supabase.from('app_settings').update({ value: updated }).eq('key', 'general_charge_categories');
                        if (error) console.error('Error adding category:', error);
                        setChargeCategories(updated);
                        setNewChargeCategory('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <Button onClick={() => setIsChargeCategoryOpen(false)} className="w-full">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Tenant Dialog */}
        <TenantViewDialog
          tenant={viewingTenant}
          isOpen={isViewTenantOpen}
          onClose={() => setIsViewTenantOpen(false)}
          onEdit={canEdit ? (tenant) => {
            setIsViewTenantOpen(false);
            setSelectedTenant(tenant);
            setEditingAgreementIndex(null);
            setEditingPersonalOnly(true);
            setIsFormOpen(true);
          } : undefined}
          onEditAgreement={canEdit ? handleEditAgreement : undefined}
          onAddAgreement={canEdit ? handleAddAgreement : undefined}
          onDeleteAgreement={canEdit ? handleDeleteAgreement : undefined}
          canEdit={canEdit}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Tenant</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {tenantToDelete?.company}? This will also delete the tenant's user account and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteTenant}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TenantManagement;