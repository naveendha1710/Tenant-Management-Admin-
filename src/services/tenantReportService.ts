import { supabase } from '@/lib/supabaseClient';
import type {
  TenantReportFilters,
  TenantSummaryRow,
  AgreementDetailsRow,
  SpaceAllocationRow,
  FinancialBreakdownRow,
  ComplianceRow,
  TenantReportSummary,
  TenantReportResponse,
} from '@/types/tenantReports';

// Utility: Calculate days to expiry
function calculateDaysToExpiry(leaseEndDate: string | null): number | null {
  if (!leaseEndDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(leaseEndDate);
  endDate.setHours(0, 0, 0, 0);
  
  return Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Utility: Check if string is a UUID
function isUUID(str: string | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Utility: Get valid agreement ID (null if UUID)
function getValidAgreementId(agreementId: string | null): string | null {
  if (!agreementId) return null;
  if (isUUID(agreementId)) return null;
  return agreementId;
}

// Utility: Extract financial totals from JSONB
function extractFinancialTotals(agreement: any) {
  const maintenanceCharges = Array.isArray(agreement.maintenance_charges)
    ? agreement.maintenance_charges.reduce((sum: number, charge: any) => sum + (Number(charge.amount) || 0), 0)
    : 0;

  const generalCharges = Array.isArray(agreement.general_charges)
    ? agreement.general_charges.reduce((sum: number, charge: any) => sum + (Number(charge.amount) || 0), 0)
    : 0;

  const serviceCharges = agreement.service_charge?.amount || 0;

  return {
    maintenanceCharges,
    generalCharges,
    serviceCharges,
    totalMonthlyCost: Number(agreement.rent_amount || 0) + maintenanceCharges + generalCharges + serviceCharges,
  };
}

// Utility: Extract escalation info
function extractEscalationInfo(agreement: any) {
  const escalations = Array.isArray(agreement.escalations) ? agreement.escalations : [];
  
  if (escalations.length === 0) return { percentage: null, nextDate: null };
  
  const today = new Date();
  const futureEscalations = escalations
    .filter((esc: any) => {
      const escDate = new Date(esc.date || esc.effectiveDate);
      return escDate > today;
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.effectiveDate);
      const dateB = new Date(b.date || b.effectiveDate);
      return dateA.getTime() - dateB.getTime();
    });
  
  if (futureEscalations.length > 0) {
    return {
      percentage: futureEscalations[0].percentage || null,
      nextDate: futureEscalations[0].date || futureEscalations[0].effectiveDate || null,
    };
  }
  
  return { percentage: null, nextDate: null };
}

// Main Report Generation Function
export async function getTenantReport(filters: TenantReportFilters): Promise<TenantReportResponse> {
  // Step 1: Fetch tenants with filters
  let tenantQuery = supabase
    .from('tenants')
    .select('*');

  if (filters.tenantIds && filters.tenantIds.length > 0) tenantQuery = tenantQuery.in('id', filters.tenantIds);
  if (filters.companyGroups && filters.companyGroups.length > 0) tenantQuery = tenantQuery.in('companygroup', filters.companyGroups);
  if (filters.isGstCompany !== undefined) tenantQuery = tenantQuery.eq('is_gst_company', filters.isGstCompany);
  if (filters.isMainBranch !== undefined) tenantQuery = tenantQuery.eq('is_main_branch', filters.isMainBranch);
  if (filters.status && filters.status.length > 0) tenantQuery = tenantQuery.in('status', filters.status);

  const { data: tenants, error: tenantError } = await tenantQuery;
  if (tenantError) throw tenantError;
  if (!tenants || tenants.length === 0) {
    return buildEmptyResponse(filters);
  }

  const tenantIds = tenants.map(t => t.id);

  // Step 2: Fetch agreements
  let agreementQuery = supabase
    .from('agreements')
    .select('*')
    .in('tenant_id', tenantIds);

  if (filters.dateRange) {
    agreementQuery = agreementQuery
      .gte('lease_agreement_date', filters.dateRange.startDate)
      .lte('lease_agreement_date', filters.dateRange.endDate);
  }

  const { data: agreements, error: agreementError } = await agreementQuery;
  if (agreementError) throw agreementError;

  // Step 3: Fetch related data (buildings, floors, rooms) from space_assignments
  const allSpaceAssignments = agreements?.flatMap(a => 
    Array.isArray(a.space_assignments) ? a.space_assignments : []
  ) || [];

  // Extract IDs - handle both buildingId and building fields
  const buildingIds = [...new Set(allSpaceAssignments.flatMap((s: any) => {
    const ids = [];
    if (s.buildingId && !isUUID(s.buildingId)) ids.push(s.buildingId);
    if (s.building && isUUID(s.building)) ids.push(s.building);
    return ids;
  }).filter(Boolean))];
  
  const floorIds = [...new Set(allSpaceAssignments.flatMap((s: any) => {
    const ids = [];
    if (s.floorId && !isUUID(s.floorId)) ids.push(s.floorId);
    if (s.floor && isUUID(s.floor)) ids.push(s.floor);
    return ids;
  }).filter(Boolean))];
  
  const roomIds = [...new Set(allSpaceAssignments.flatMap((s: any) => {
    const ids = [];
    if (s.roomId && !isUUID(s.roomId)) ids.push(s.roomId);
    if (s.room && isUUID(s.room)) ids.push(s.room);
    return ids;
  }).filter(Boolean))];

  const [buildingsRes, floorsRes, roomsRes] = await Promise.all([
    buildingIds.length > 0 ? supabase.from('buildings').select('id, name').in('id', buildingIds) : Promise.resolve({ data: [] }),
    floorIds.length > 0 ? supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds) : Promise.resolve({ data: [] }),
    roomIds.length > 0 ? supabase.from('rooms').select('id, room_number').in('id', roomIds) : Promise.resolve({ data: [] }),
  ]);

  const buildingMap = new Map(buildingsRes.data?.map(b => [b.id, b.name]) || []);
  const floorMap = new Map(floorsRes.data?.map(f => [f.id, f.floor_name || f.floor_number]) || []);
  const roomMap = new Map(roomsRes.data?.map(r => [r.id, r.room_number]) || []);

  // Step 4: Build tenant map with parent info
  const tenantMap = new Map(tenants.map(t => [t.id, t]));
  const parentIds = [...new Set(tenants.map(t => t.parent_tenant_id).filter(Boolean))];
  
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from('tenants')
      .select('id, company')
      .in('id', parentIds);
    
    parents?.forEach(p => tenantMap.set(p.id, p));
  }

  // Step 5: Build agreement map by tenant
  const agreementsByTenant = (agreements || []).reduce((acc, agreement) => {
    if (!acc[agreement.tenant_id]) acc[agreement.tenant_id] = [];
    acc[agreement.tenant_id].push(agreement);
    return acc;
  }, {} as Record<string, any[]>);

  // Step 6: Count branches for each main tenant
  const branchCounts = await Promise.all(
    tenants.map(async (tenant) => {
      if (!tenant.is_main_branch) return { tenantId: tenant.id, count: 0 };
      
      const { count } = await supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('parent_tenant_id', tenant.id);
      
      return { tenantId: tenant.id, count: count || 0 };
    })
  );
  const branchCountMap = new Map(branchCounts.map(bc => [bc.tenantId, bc.count]));

  // Step 7: Generate Sheet 1 - Tenant Summary
  const tenantSummary: TenantSummaryRow[] = tenants.map(tenant => {
    const tenantAgreements = agreementsByTenant[tenant.id] || [];
    const activeAgreements = tenantAgreements.filter(a => a.status === 'Active');
    
    const totalRent = activeAgreements.reduce((sum, a) => sum + Number(a.rent_amount || 0), 0);
    const totalDeposit = activeAgreements.reduce((sum, a) => sum + Number(a.security_deposit || 0), 0);
    
    return {
      tenant_name: tenant.company,
      company_group: tenant.companygroup,
      branch_type: tenant.is_main_branch ? 'Main' : 'Branch',
      parent_company: tenant.parent_tenant_id ? tenantMap.get(tenant.parent_tenant_id)?.company || null : null,
      branch_count: branchCountMap.get(tenant.id) || 0,
      total_units_assigned: Array.isArray(tenant.assignedunits) ? tenant.assignedunits.length : 0,
      total_space: tenant.space,
      active_agreements: activeAgreements.length,
      total_monthly_rent: totalRent,
      total_deposit: totalDeposit,
      next_due_date: tenant.nextduedate,
      status: tenant.status as 'Active' | 'Pending Move-In' | 'Vacated',
      gst_company: tenant.is_gst_company ? 'Yes' : 'No',
    };
  });

  // No additional filtering needed - status filter already applied in query
  const filteredSummary = tenantSummary;

  // Step 8: Generate Sheet 2 - Agreement Details
  const agreementDetails: AgreementDetailsRow[] = (agreements || []).map(agreement => {
    const tenant = tenantMap.get(agreement.tenant_id);
    const daysToExpiry = calculateDaysToExpiry(agreement.lease_end_date);
    
    return {
      tenant_name: tenant?.company || 'Unknown',
      agreement_id: getValidAgreementId(agreement.agreement_id) || '',
      agreement_name: agreement.agreement_name,
      status: agreement.status,
      rent_amount: Number(agreement.rent_amount || 0),
      security_deposit: Number(agreement.security_deposit || 0),
      payment_cycle: agreement.payment_cycle,
      lease_start_date: agreement.lease_agreement_date,
      rent_commencement_date: agreement.rent_commencement_date,
      lease_end_date: agreement.lease_end_date,
      lock_in_period: agreement.lock_in_period,
      lease_tenure: agreement.lease_tenure,
      next_due_date: tenant?.nextduedate || null,
      days_to_expiry: daysToExpiry,
    };
  });

  // Step 9: Generate Sheet 3 - Space Allocation
  const spaceAllocation: SpaceAllocationRow[] = [];
  
  (agreements || []).forEach(agreement => {
    const tenant = tenantMap.get(agreement.tenant_id);
    const spaces = Array.isArray(agreement.space_assignments) ? agreement.space_assignments : [];
    
    spaces.forEach((space: any) => {
      // Apply building filter if provided
      if (filters.buildingIds && filters.buildingIds.length > 0) {
        if (!filters.buildingIds.includes(space.buildingId)) return;
      }
      
      // Get building name - check both buildingId and building field
      let buildingName = '';
      if (space.buildingId) {
        buildingName = buildingMap.get(space.buildingId) || '';
      }
      if (!buildingName && space.building) {
        if (isUUID(space.building)) {
          buildingName = buildingMap.get(space.building) || '';
        } else {
          buildingName = space.building;
        }
      }
      
      // Get floor name - check both floorId and floor field
      let floorName = '';
      if (space.floorId) {
        floorName = floorMap.get(space.floorId) || '';
      }
      if (!floorName && space.floor) {
        if (isUUID(space.floor)) {
          floorName = floorMap.get(space.floor) || '';
        } else {
          floorName = space.floor;
        }
      }
      
      // Get room/unit name - check both roomId and room/unit fields
      let roomName = '';
      if (space.roomId) {
        roomName = roomMap.get(space.roomId) || '';
      }
      if (!roomName && space.room) {
        if (isUUID(space.room)) {
          roomName = roomMap.get(space.room) || '';
        } else {
          roomName = space.room;
        }
      }
      if (!roomName && space.unit && !isUUID(space.unit)) {
        roomName = space.unit;
      }
      
      spaceAllocation.push({
        tenant_name: tenant?.company || 'Unknown',
        agreement_id: getValidAgreementId(agreement.agreement_id) || '',
        building: buildingName,
        floor: floorName,
        room_unit: roomName,
        space: space.space || space.area || '',
        occupancy_type: space.occupancyType || space.type || '',
      });
    });
  });

  // Step 10: Generate Sheet 4 - Financial Breakdown
  const financialBreakdown: FinancialBreakdownRow[] = (agreements || []).map(agreement => {
    const tenant = tenantMap.get(agreement.tenant_id);
    const financials = extractFinancialTotals(agreement);
    const escalation = extractEscalationInfo(agreement);
    
    return {
      tenant_name: tenant?.company || 'Unknown',
      agreement_id: getValidAgreementId(agreement.agreement_id) || '',
      rent: Number(agreement.rent_amount || 0),
      maintenance_charges: financials.maintenanceCharges,
      general_charges: financials.generalCharges,
      service_charges: financials.serviceCharges,
      total_monthly_cost: financials.totalMonthlyCost,
      escalation_percentage: escalation.percentage,
      next_escalation_date: escalation.nextDate,
    };
  });

  // Step 11: Generate Sheet 5 - Compliance
  const compliance: ComplianceRow[] = tenants.map(tenant => {
    const tenantAgreements = agreementsByTenant[tenant.id] || [];
    const documentCount = tenantAgreements.reduce((sum, a) => {
      return sum + (Array.isArray(a.documents) ? a.documents.length : 0);
    }, 0);
    
    return {
      tenant_name: tenant.company,
      gst_enabled: tenant.is_gst_company ? 'Yes' : 'No',
      gst_number: tenant.gst_number,
      pan_number: tenant.pan_number,
      tan_number: tenant.tan_number,
      cin_number: tenant.cin_number,
      document_count: documentCount,
      id_proof_available: tenant.idproof ? 'Yes' : 'No',
    };
  });

  // Step 12: Generate Summary Statistics
  const summary: TenantReportSummary = {
    total_tenants: filteredSummary.length,
    total_agreements: agreementDetails.length,
    total_monthly_revenue: filteredSummary.reduce((sum, t) => sum + t.total_monthly_rent, 0),
    total_deposits: filteredSummary.reduce((sum, t) => sum + t.total_deposit, 0),
    active_leases: filteredSummary.filter(t => t.status === 'Active').length,
    expiring_soon: filteredSummary.filter(t => t.status === 'Pending Move-In').length,
    expired_leases: filteredSummary.filter(t => t.status === 'Vacated').length,
    gst_companies: filteredSummary.filter(t => t.gst_company === 'Yes').length,
    total_space_allocated: spaceAllocation.length,
  };

  return {
    summary,
    tenantSummary: filteredSummary,
    agreementDetails,
    spaceAllocation,
    financialBreakdown,
    compliance,
    filters,
    generated_at: new Date().toISOString(),
  };
}

function buildEmptyResponse(filters: TenantReportFilters): TenantReportResponse {
  return {
    summary: {
      total_tenants: 0,
      total_agreements: 0,
      total_monthly_revenue: 0,
      total_deposits: 0,
      active_leases: 0,
      expiring_soon: 0,
      expired_leases: 0,
      gst_companies: 0,
      total_space_allocated: 0,
    },
    tenantSummary: [],
    agreementDetails: [],
    spaceAllocation: [],
    financialBreakdown: [],
    compliance: [],
    filters,
    generated_at: new Date().toISOString(),
  };
}
