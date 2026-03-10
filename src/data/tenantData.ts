import { supabase } from '@/lib/supabase';

export interface SpaceAssignment {
  building: string;
  buildingName: string;
  floor: number;
  assignedSqft: number;
  ratePerSqft: number;
  amount: number;
}

export interface Escalation {
  id: string;
  date: string;
  percentage: number;
}

export interface Tenant {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  phoneNumbers?: string[];
  password?: string;
  status: 'Active' | 'Pending Move-In' | 'Vacated';
  companyGroup: string;
  companygroup?: string; // Database field name
  address?: string;
  idProof?: string;
  isGstCompany?: boolean;
  gstNumber?: string;
  tanNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  parentTenantId?: string; // For branch tenants
  parent_tenant_id?: string; // Database field name
  branchName?: string;
  branch_name?: string; // Database field name
  isMainBranch?: boolean;
  is_main_branch?: boolean; // Database field name
  branches?: Tenant[]; // Related branch locations
  created_at?: string;
  updated_at?: string;
  
  // Agreements from agreements table
  agreements?: any[];
  
  // Deprecated fields (kept for backward compatibility, will be removed)
  rentAmount?: number;
  securityDeposit?: number;
  paymentCycle?: string;
  leaseAgreementDate?: string;
  operationDate?: string;
  rentCommencementDate?: string;
  escalations?: Escalation[];
  lockInPeriod?: string;
  leaseEndDate?: string;
  space?: string;
  nextDueDate?: string;
  assigned?: boolean;
  assignedUnits?: string[];
  spaceAssignments?: SpaceAssignment[];
}

// Tenant data service using Supabase
export const tenantDataService = {
  // Get all tenants with agreements
  async getAllTenants(): Promise<Tenant[]> {
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      return [];
    }
    
    // Fetch agreements for all tenants
    const { data: agreements, error: agreementsError } = await supabase
      .from('agreements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (agreementsError) {
      console.error('Error fetching agreements:', agreementsError);
    }
    
    // Map tenants with their agreements
    return (tenants || []).map(tenant => {
      const tenantAgreements = (agreements || []).filter(a => a.tenant_id === tenant.id);
      
      // Calculate total rent from active agreements
      const totalRent = tenantAgreements
        .filter(a => a.status === 'Active')
        .reduce((sum, a) => sum + (a.rent_amount || 0), 0);
      
      return {
        ...tenant,
        companyGroup: tenant.companygroup,
        idProof: tenant.idproof,
        isGstCompany: tenant.is_gst_company,
        gstNumber: tenant.gst_number,
        tanNumber: tenant.tan_number,
        panNumber: tenant.pan_number,
        cinNumber: tenant.cin_number,
        parentTenantId: tenant.parent_tenant_id,
        branchName: tenant.branch_name,
        isMainBranch: tenant.is_main_branch,
        phoneNumbers: tenant.phone_numbers || [tenant.phone],
        rentAmount: totalRent, // Calculate from agreements
        agreements: tenantAgreements.map(a => ({
          id: a.id,
          agreement_id: a.agreement_id,
          status: a.status,
          agreementName: a.agreement_name,
          rentAmount: a.rent_amount,
          securityDeposit: a.security_deposit,
          paymentCycle: a.payment_cycle,
          leaseAgreementDate: a.lease_agreement_date,
          operationDate: a.operation_date,
          rentCommencementDate: a.rent_commencement_date,
          leaseEndDate: a.lease_end_date,
          lockInPeriod: a.lock_in_period,
          leaseTenure: a.lease_tenure,
          spaceAssignments: a.space_assignments || [],
          escalations: a.escalations || [],
          documents: a.documents || [],
          maintenanceCharges: a.maintenance_charges || [],
          generalCharges: a.general_charges || [],
          serviceCharge: a.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
          createdAt: a.created_at
        }))
      };
    });
  },

  // Get tenants by company group
  async getTenantsByGroup(groupName: string): Promise<Tenant[]> {
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .eq('companygroup', groupName)
      .order('created_at', { ascending: false });
    
    if (tenantsError) {
      console.error('Error fetching tenants by group:', tenantsError);
      return [];
    }
    
    // Fetch agreements for these tenants
    const tenantIds = (tenants || []).map(t => t.id);
    const { data: agreements, error: agreementsError } = await supabase
      .from('agreements')
      .select('*')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false });
    
    if (agreementsError) {
      console.error('Error fetching agreements:', agreementsError);
    }
    
    // Map tenants with their agreements
    return (tenants || []).map(tenant => {
      const tenantAgreements = (agreements || []).filter(a => a.tenant_id === tenant.id);
      
      // Calculate total rent from active agreements
      const totalRent = tenantAgreements
        .filter(a => a.status === 'Active')
        .reduce((sum, a) => sum + (a.rent_amount || 0), 0);
      
      return {
        ...tenant,
        companyGroup: tenant.companygroup,
        idProof: tenant.idproof,
        isGstCompany: tenant.is_gst_company,
        gstNumber: tenant.gst_number,
        tanNumber: tenant.tan_number,
        panNumber: tenant.pan_number,
        cinNumber: tenant.cin_number,
        parentTenantId: tenant.parent_tenant_id,
        branchName: tenant.branch_name,
        isMainBranch: tenant.is_main_branch,
        phoneNumbers: tenant.phone_numbers || [tenant.phone],
        rentAmount: totalRent,
        agreements: tenantAgreements.map(a => ({
          id: a.id,
          agreement_id: a.agreement_id,
          status: a.status,
          agreementName: a.agreement_name,
          rentAmount: a.rent_amount,
          securityDeposit: a.security_deposit,
          paymentCycle: a.payment_cycle,
          leaseAgreementDate: a.lease_agreement_date,
          operationDate: a.operation_date,
          rentCommencementDate: a.rent_commencement_date,
          leaseEndDate: a.lease_end_date,
          lockInPeriod: a.lock_in_period,
          leaseTenure: a.lease_tenure,
          spaceAssignments: a.space_assignments || [],
          escalations: a.escalations || [],
          documents: a.documents || [],
          maintenanceCharges: a.maintenance_charges || [],
          generalCharges: a.general_charges || [],
          serviceCharge: a.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
          createdAt: a.created_at
        }))
      };
    });
  },

  // Get tenant by ID
  async getTenantById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching tenant:', error);
      return null;
    }
    
    return data;
  },

  // Add new tenant
  async addTenant(tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .insert([tenant])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding tenant:', error);
      throw new Error(error.message || 'Failed to create tenant record');
    }
    
    return data;
  },

  // Update tenant
  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating tenant:', error);
      return null;
    }
    
    return data;
  },

  // Delete tenant
  async deleteTenant(id: string): Promise<boolean> {
    // First, get the tenant's agreements to find affected floors
    const { data: agreements } = await supabase
      .from('agreements')
      .select('space_assignments')
      .eq('tenant_id', id);
    
    const affectedFloorIds = new Set<string>();
    if (agreements) {
      agreements.forEach((agreement: any) => {
        const spaceAssignments = agreement.space_assignments || [];
        spaceAssignments.forEach((sa: any) => {
          if (sa.floorId) affectedFloorIds.add(sa.floorId);
        });
      });
    }
    
    // Delete the tenant (agreements will be deleted via CASCADE)
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting tenant:', error);
      return false;
    }
    
    // Recalculate occupied_sqft for all affected floors
    for (const floorId of affectedFloorIds) {
      try {
        await supabase.rpc('recalculate_floor_occupied_sqft', {
          p_floor_id: floorId
        });
      } catch (recalcError) {
        console.error('Error recalculating floor occupied_sqft:', recalcError);
      }
    }
    
    return true;
  }
};