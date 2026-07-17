import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useMovementFilterOptions(enabled = true) {
  const [movementTypes, setMovementTypes] = useState<string[]>(['Location', 'Maintenance', 'Disposal']);
  const [movementStatuses, setMovementStatuses] = useState<string[]>(['Pending', 'Approved', 'Rejected', 'Completed']);
  const [approvalStatuses, setApprovalStatuses] = useState<string[]>(['Pending', 'Approved', 'Rejected']);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [handoverToOptions, setHandoverToOptions] = useState<string[]>([]);

  const loadFilterOptions = useCallback(async () => {
    // Load distinct buildings
    const { data: buildingData } = await supabase
      .from('buildings')
      .select('id, name');
    if (buildingData) setBuildings(buildingData);

    // Load tenants for from_tenant and to_tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, company, name');
    if (tenantData) setTenants(tenantData);

    // Load vendors
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('id, name');
    if (vendorData) setVendors(vendorData);

    // Load distinct handover_to values from asset_movements table
    const { data: handoverData } = await supabase
      .from('asset_movements')
      .select('handover_to')
      .not('handover_to', 'is', null)
      .distinct();
    
    if (handoverData) {
      const uniqueHandoverTo = Array.from(new Set(handoverData.map((item: any) => item.handover_to)));
      setHandoverToOptions(uniqueHandoverTo);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadFilterOptions();
  }, [enabled, loadFilterOptions]);

  return {
    movementTypes,
    movementStatuses,
    approvalStatuses,
    buildings,
    tenants,
    vendors,
    handoverToOptions,
    setBuildings,
    setTenants,
    setVendors,
    loadFilterOptions,
  };
}