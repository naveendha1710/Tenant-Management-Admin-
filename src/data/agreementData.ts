import { supabase } from '@/lib/supabase';

export interface Agreement {
  id: string;
  tenant_id: string;
  tenantId?: string; // Alias for frontend
  status: 'Active' | 'Expired' | 'Terminated' | 'Draft';
  agreementName?: string;
  agreement_name?: string; // Database field
  rentAmount: number;
  rent_amount?: number; // Database field
  securityDeposit?: number;
  security_deposit?: number; // Database field
  paymentCycle?: string;
  payment_cycle?: string; // Database field
  leaseAgreementDate?: string;
  lease_agreement_date?: string; // Database field
  operationDate?: string;
  operation_date?: string; // Database field
  rentCommencementDate?: string;
  rent_commencement_date?: string; // Database field
  leaseEndDate?: string;
  lease_end_date?: string; // Database field
  lockInPeriod?: string;
  lock_in_period?: string; // Database field
  leaseTenure?: string;
  lease_tenure?: string; // Database field
  spaceAssignments?: any[];
  space_assignments?: any[]; // Database field
  escalations?: any[];
  documents?: any[];
  maintenanceCharges?: any[];
  maintenance_charges?: any[]; // Database field
  generalCharges?: any[];
  general_charges?: any[]; // Database field
  serviceCharge?: {
    serviceNames: string[];
    amount: number;
    isIncludedInRent: boolean;
  };
  service_charge?: any; // Database field
  created_at?: string;
  updated_at?: string;
  createdAt?: string; // Alias for frontend
}

// Agreement data service
export const agreementDataService = {
  // Get all agreements for a tenant
  async getAgreementsByTenantId(tenantId: string): Promise<Agreement[]> {
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching agreements:', error);
      return [];
    }
    
    // Map database fields to interface fields
    return (data || []).map(agreement => ({
      ...agreement,
      tenantId: agreement.tenant_id,
      agreementName: agreement.agreement_name,
      rentAmount: agreement.rent_amount,
      securityDeposit: agreement.security_deposit,
      paymentCycle: agreement.payment_cycle,
      leaseAgreementDate: agreement.lease_agreement_date,
      operationDate: agreement.operation_date,
      rentCommencementDate: agreement.rent_commencement_date,
      leaseEndDate: agreement.lease_end_date,
      lockInPeriod: agreement.lock_in_period,
      leaseTenure: agreement.lease_tenure,
      spaceAssignments: agreement.space_assignments || [],
      maintenanceCharges: agreement.maintenance_charges || [],
      generalCharges: agreement.general_charges || [],
      serviceCharge: agreement.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
      createdAt: agreement.created_at
    }));
  },

  // Get single agreement by ID
  async getAgreementById(id: string): Promise<Agreement | null> {
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching agreement:', error);
      return null;
    }
    
    return {
      ...data,
      tenantId: data.tenant_id,
      agreementName: data.agreement_name,
      rentAmount: data.rent_amount,
      securityDeposit: data.security_deposit,
      paymentCycle: data.payment_cycle,
      leaseAgreementDate: data.lease_agreement_date,
      operationDate: data.operation_date,
      rentCommencementDate: data.rent_commencement_date,
      leaseEndDate: data.lease_end_date,
      lockInPeriod: data.lock_in_period,
      leaseTenure: data.lease_tenure,
      spaceAssignments: data.space_assignments || [],
      maintenanceCharges: data.maintenance_charges || [],
      generalCharges: data.general_charges || [],
      serviceCharge: data.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
      createdAt: data.created_at
    };
  },

  // Create new agreement
  async createAgreement(agreement: Omit<Agreement, 'id' | 'created_at' | 'updated_at'>): Promise<Agreement | null> {
    // Map frontend fields to database fields
    const dbAgreement = {
      tenant_id: agreement.tenantId || agreement.tenant_id,
      status: agreement.status,
      agreement_name: agreement.agreementName || agreement.agreement_name,
      rent_amount: agreement.rentAmount || agreement.rent_amount,
      security_deposit: agreement.securityDeposit || agreement.security_deposit,
      payment_cycle: agreement.paymentCycle || agreement.payment_cycle,
      lease_agreement_date: agreement.leaseAgreementDate || agreement.lease_agreement_date,
      operation_date: agreement.operationDate || agreement.operation_date,
      rent_commencement_date: agreement.rentCommencementDate || agreement.rent_commencement_date,
      lease_end_date: agreement.leaseEndDate || agreement.lease_end_date,
      lock_in_period: agreement.lockInPeriod || agreement.lock_in_period,
      lease_tenure: agreement.leaseTenure || agreement.lease_tenure,
      space_assignments: agreement.spaceAssignments || agreement.space_assignments || [],
      escalations: agreement.escalations || [],
      documents: agreement.documents || [],
      maintenance_charges: agreement.maintenanceCharges || agreement.maintenance_charges || [],
      general_charges: agreement.generalCharges || agreement.general_charges || [],
      service_charge: agreement.serviceCharge || agreement.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false }
    };

    const { data, error } = await supabase
      .from('agreements')
      .insert([dbAgreement])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agreement:', error);
      return null;
    }
    
    return {
      ...data,
      tenantId: data.tenant_id,
      agreementName: data.agreement_name,
      rentAmount: data.rent_amount,
      securityDeposit: data.security_deposit,
      paymentCycle: data.payment_cycle,
      leaseAgreementDate: data.lease_agreement_date,
      operationDate: data.operation_date,
      rentCommencementDate: data.rent_commencement_date,
      leaseEndDate: data.lease_end_date,
      lockInPeriod: data.lock_in_period,
      leaseTenure: data.lease_tenure,
      spaceAssignments: data.space_assignments || [],
      maintenanceCharges: data.maintenance_charges || [],
      generalCharges: data.general_charges || [],
      serviceCharge: data.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
      createdAt: data.created_at
    };
  },

  // Update agreement
  async updateAgreement(id: string, updates: Partial<Agreement>): Promise<Agreement | null> {
    // Map frontend fields to database fields
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.agreementName !== undefined) dbUpdates.agreement_name = updates.agreementName;
    if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
    if (updates.securityDeposit !== undefined) dbUpdates.security_deposit = updates.securityDeposit;
    if (updates.paymentCycle !== undefined) dbUpdates.payment_cycle = updates.paymentCycle;
    if (updates.leaseAgreementDate !== undefined) dbUpdates.lease_agreement_date = updates.leaseAgreementDate;
    if (updates.operationDate !== undefined) dbUpdates.operation_date = updates.operationDate;
    if (updates.rentCommencementDate !== undefined) dbUpdates.rent_commencement_date = updates.rentCommencementDate;
    if (updates.leaseEndDate !== undefined) dbUpdates.lease_end_date = updates.leaseEndDate;
    if (updates.lockInPeriod !== undefined) dbUpdates.lock_in_period = updates.lockInPeriod;
    if (updates.leaseTenure !== undefined) dbUpdates.lease_tenure = updates.leaseTenure;
    if (updates.spaceAssignments !== undefined) dbUpdates.space_assignments = updates.spaceAssignments;
    if (updates.escalations !== undefined) dbUpdates.escalations = updates.escalations;
    if (updates.documents !== undefined) dbUpdates.documents = updates.documents;
    if (updates.maintenanceCharges !== undefined) dbUpdates.maintenance_charges = updates.maintenanceCharges;
    if (updates.generalCharges !== undefined) dbUpdates.general_charges = updates.generalCharges;
    if (updates.serviceCharge !== undefined) dbUpdates.service_charge = updates.serviceCharge;

    const { data, error } = await supabase
      .from('agreements')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating agreement:', error);
      return null;
    }
    
    return {
      ...data,
      tenantId: data.tenant_id,
      agreementName: data.agreement_name,
      rentAmount: data.rent_amount,
      securityDeposit: data.security_deposit,
      paymentCycle: data.payment_cycle,
      leaseAgreementDate: data.lease_agreement_date,
      operationDate: data.operation_date,
      rentCommencementDate: data.rent_commencement_date,
      leaseEndDate: data.lease_end_date,
      lockInPeriod: data.lock_in_period,
      leaseTenure: data.lease_tenure,
      spaceAssignments: data.space_assignments || [],
      maintenanceCharges: data.maintenance_charges || [],
      generalCharges: data.general_charges || [],
      serviceCharge: data.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
      createdAt: data.created_at
    };
  },

  // Delete agreement
  async deleteAgreement(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('agreements')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting agreement:', error);
      return false;
    }
    
    return true;
  },

  // Get all active agreements (useful for rent calculations)
  async getActiveAgreements(): Promise<Agreement[]> {
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('status', 'Active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching active agreements:', error);
      return [];
    }
    
    return (data || []).map(agreement => ({
      ...agreement,
      tenantId: agreement.tenant_id,
      agreementName: agreement.agreement_name,
      rentAmount: agreement.rent_amount,
      securityDeposit: agreement.security_deposit,
      paymentCycle: agreement.payment_cycle,
      leaseAgreementDate: agreement.lease_agreement_date,
      operationDate: agreement.operation_date,
      rentCommencementDate: agreement.rent_commencement_date,
      leaseEndDate: agreement.lease_end_date,
      lockInPeriod: agreement.lock_in_period,
      leaseTenure: agreement.lease_tenure,
      spaceAssignments: agreement.space_assignments || [],
      maintenanceCharges: agreement.maintenance_charges || [],
      generalCharges: agreement.general_charges || [],
      serviceCharge: agreement.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
      createdAt: agreement.created_at
    }));
  }
};
