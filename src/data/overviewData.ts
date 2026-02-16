import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalBuildings: number;
  totalSpaces: number;
  monthlyRevenue: number;
  pendingPayments: number;
  maintenanceTickets: number;
  occupancyRate: number;
  collectionRate: number;
}

export interface RevenueByProperty {
  property: string;
  revenue: number;
}

export interface RevenueByTenant {
  tenant: string;
  revenue: number;
}

export interface RevenueByCompany {
  company: string;
  revenue: number;
}

export interface TenantWithCompany {
  tenant: string;
  company: string;
  revenue: number;
}

// Calculate current rent with all charges and escalations
const calculateTenantRent = (agreements: any[]) => {
  const today = new Date();
  let totalRent = 0;
  
  const activeAgreements = agreements.filter((a: any) => a.status === 'Active' || a.status === 'Pending Move-In');
  
  activeAgreements.forEach((agreement: any) => {
    const spaceAssignments = agreement.space_assignments || [];
    const escalations = agreement.escalations || [];
    const maintenanceCharges = agreement.maintenance_charges || [];
    const generalCharges = agreement.general_charges || [];
    const serviceCharge = agreement.service_charge || { amount: 0, isIncludedInRent: false };
    
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

export const overviewDataService = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get tenant counts
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, status');
      
      if (tenantsError) throw tenantsError;

      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === 'Active').length || 0;

      // Get building counts
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id');
      
      if (buildingsError) throw buildingsError;

      const totalBuildings = buildings?.length || 0;

      // Get floor counts for total spaces
      const { data: floors, error: floorsError } = await supabase
        .from('floors')
        .select('total_sqft');
      
      if (floorsError) throw floorsError;

      const totalSpaces = floors?.length || 0;

      // Calculate monthly revenue from active tenants' rent_amount in agreements
      const { data: agreements } = await supabase
        .from('agreements')
        .select('tenant_id, rent_amount, space_assignments');
      
      // Get active tenant IDs
      const activeTenantIds = tenants?.filter(t => t.status === 'Active').map(t => t.id) || [];
      
      // Sum rent_amount for active tenants
      let monthlyRevenue = 0;
      agreements?.forEach(agreement => {
        if (activeTenantIds.includes(agreement.tenant_id)) {
          monthlyRevenue += agreement.rent_amount || 0;
        }
      });

      // Get pending invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('amount, status');
      
      if (invoicesError) throw invoicesError;

      const pendingPayments = invoices
        ?.filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

      // Get maintenance tickets (open status)
      const { data: tickets, error: ticketsError } = await supabase
        .from('maintenance_tickets')
        .select('id')
        .eq('status', 'open');
      
      const maintenanceTickets = tickets?.length || 0;

      // Calculate occupancy rate from agreements
      const totalSqft = floors?.reduce((sum, f) => sum + (f.total_sqft || 0), 0) || 1;
      let occupiedSqft = 0;
      agreements?.forEach(agreement => {
        if (agreement.space_assignments && Array.isArray(agreement.space_assignments)) {
          agreement.space_assignments.forEach((assignment: any) => {
            occupiedSqft += assignment.assignedSqft || 0;
          });
        }
      });

      const occupancyRate = totalSqft > 0 ? Math.round((occupiedSqft / totalSqft) * 100) : 0;

      // Calculate collection rate
      const totalInvoices = invoices?.length || 1;
      const paidInvoices = invoices?.filter(i => i.status === 'approved' || i.status === 'paid').length || 0;
      const collectionRate = Math.round((paidInvoices / totalInvoices) * 100);

      return {
        totalTenants,
        activeTenants,
        totalBuildings,
        totalSpaces,
        monthlyRevenue: Math.round(monthlyRevenue),
        pendingPayments,
        maintenanceTickets,
        occupancyRate,
        collectionRate
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalTenants: 0,
        activeTenants: 0,
        totalBuildings: 0,
        totalSpaces: 0,
        monthlyRevenue: 0,
        pendingPayments: 0,
        maintenanceTickets: 0,
        occupancyRate: 0,
        collectionRate: 0
      };
    }
  },

  async getRevenueByProperty(): Promise<RevenueByProperty[]> {
    try {
      const { data: buildings, error } = await supabase
        .from('buildings')
        .select('id, name');
      
      if (error) throw error;

      const { data: agreements } = await supabase
        .from('agreements')
        .select('*');

      const revenueMap: { [key: string]: { name: string; revenue: number } } = {};

      buildings?.forEach(building => {
        revenueMap[building.id] = { name: building.name, revenue: 0 };
      });

      // Group agreements by tenant
      const tenantAgreements: { [key: string]: any[] } = {};
      agreements?.forEach(agreement => {
        if (!tenantAgreements[agreement.tenant_id]) {
          tenantAgreements[agreement.tenant_id] = [];
        }
        tenantAgreements[agreement.tenant_id].push(agreement);
      });
      
      // Calculate revenue per building
      Object.values(tenantAgreements).forEach(tenantAgrs => {
        const activeAgreements = tenantAgrs.filter((a: any) => a.status === 'Active' || a.status === 'Pending Move-In');
        activeAgreements.forEach(agreement => {
          if (agreement.space_assignments) {
            agreement.space_assignments.forEach((assignment: any) => {
              if (revenueMap[assignment.building]) {
                revenueMap[assignment.building].revenue += assignment.amount || 0;
              }
            });
          }
        });
      });

      return Object.values(revenueMap).map(item => ({
        property: item.name,
        revenue: item.revenue
      }));
    } catch (error) {
      console.error('Error fetching revenue by property:', error);
      return [];
    }
  },

  async getRevenueByTenants(): Promise<RevenueByTenant[]> {
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('status', 'Active');
      
      if (tenantsError) throw tenantsError;

      const { data: agreements } = await supabase
        .from('agreements')
        .select('*');
      
      const tenantRevenue: RevenueByTenant[] = [];
      
      tenants?.forEach(tenant => {
        const tenantAgrs = agreements?.filter(a => a.tenant_id === tenant.id) || [];
        const revenue = calculateTenantRent(tenantAgrs);
        if (revenue > 0) {
          tenantRevenue.push({ tenant: tenant.name, revenue });
        }
      });
      
      return tenantRevenue.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error fetching revenue by tenants:', error);
      return [];
    }
  },

  async getRevenueByCompanies(): Promise<RevenueByCompany[]> {
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, companygroup, status')
        .eq('status', 'Active');
      
      if (tenantsError) throw tenantsError;

      const { data: agreements } = await supabase
        .from('agreements')
        .select('*');
      
      const revenueMap: { [key: string]: number } = {};

      tenants?.forEach(tenant => {
        const company = tenant.companygroup || 'Uncategorized';
        const tenantAgrs = agreements?.filter(a => a.tenant_id === tenant.id) || [];
        const revenue = calculateTenantRent(tenantAgrs);
        revenueMap[company] = (revenueMap[company] || 0) + revenue;
      });

      return Object.entries(revenueMap)
        .map(([company, revenue]) => ({ company, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error fetching revenue by companies:', error);
      return [];
    }
  },

  async getTenantsWithCompany(): Promise<TenantWithCompany[]> {
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, company, companygroup, status')
        .eq('status', 'Active');
      
      if (tenantsError) throw tenantsError;

      const { data: agreements } = await supabase
        .from('agreements')
        .select('*');
      
      const tenantData: TenantWithCompany[] = [];
      
      tenants?.forEach(tenant => {
        const tenantAgrs = agreements?.filter(a => a.tenant_id === tenant.id) || [];
        const revenue = calculateTenantRent(tenantAgrs);
        if (revenue > 0) {
          tenantData.push({ 
            tenant: tenant.company || tenant.name, 
            company: tenant.companygroup || 'Uncategorized',
            revenue 
          });
        }
      });
      
      return tenantData.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error fetching tenants with company:', error);
      return [];
    }
  }
};
