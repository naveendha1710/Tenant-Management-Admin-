import { supabase } from '@/lib/supabase';

export interface Asset {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_category: string;
  asset_type?: string;
  manufacturer?: string;
  make_model?: string;
  serial_number?: string;
  asset_description?: string;
  asset_spec?: string;
  asset_value?: number;
  quantity: number;
  asset_status: 'Active' | 'Idle' | 'Repair' | 'Scrap';
  status?: 'Working' | 'Not Working';
  asset_incharge?: string;
  purchase_date?: string;
  warranty_date?: string;
  pm_date?: string;
  depreciation_date?: string;
  depreciation_percentage?: number;
  last_depreciation_date?: string;
  comments?: string;
  asset_picture?: string; // Legacy single image
  asset_pictures?: string; // JSON array of image URLs
  contract?: 'Yes' | 'No';
  vendor_id?: string;
  
  sez_classification?: string;
  sez_status?: 'SEZ' | 'DTA';
  customs_category?: 'Capital Goods' | 'Consumables' | 'Spares';
  usage_purpose?: string;
  
  vendor_name?: string;
  po_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  boe_number?: string;
  boe_date?: string;
  cif_value?: number;
  duty_foregone_amount?: number;
  import_date?: string;
  customs_location?: string;
  
  asset_cost?: number;
  capitalization_date?: string;
  depreciation_method?: 'Straight Line' | 'WDV' | 'None';
  useful_life?: number;
  net_book_value?: number;
  cost_center?: string;
  gl_code?: string;
  
  sez_zone?: string;
  unit?: string;
  building?: string;
  floor?: string;
  room_id?: string;
  handover_to?: string;
  decommission_date?: string;
  
  created_at: string;
  updated_at: string;
  updated_by?: string;
  created_by?: string;
  update_history?: string; // JSONB array of update records
}

export interface AssetMovement {
  id: string;
  request_number: string;
  asset_id?: string;
  assets?: string[]; // Array of asset IDs
  movement_type: 'Location' | 'Maintenance' | 'Disposal';
  movement_date: string;
  movement_time?: string;
  expected_return_date?: string;
  from_building?: string;
  from_floor?: string;
  from_room?: string;
  to_building?: string;
  to_floor?: string;
  to_room?: string;
  vendor_name?: string;
  vendor_contact?: string;
  outward_date?: string;
  expected_inward_date?: string;
  gate_pass_number?: string;
  movement_reason?: string;
  other_reason?: string;
  remarks?: string;
  approval_required: boolean;
  approval_status: 'Pending' | 'Approved' | 'Rejected';
  movement_status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  actual_movement_date?: string;
  from_tenant?: string;
  to_tenant?: string;
  to_tenant_id?: string; // UUID of tenant for asset update
  handover_to?: string;
  handover_name?: string;
  handover_email?: string;
  handover_mobile?: string;
  requested_by?: string;
  created_at: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  maintenance_type: 'Preventive' | 'Breakdown';
  schedule_date?: string;
  vendor_engineer?: string;
  amc_reference?: string;
  sla_time?: number;
  downtime_hours?: number;
  repair_cost?: number;
  next_due_date?: string;
  maintenance_status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  created_at: string;
}

export interface AssetAMC {
  id: string;
  asset_id: string;
  vendor_name: string;
  amc_number: string;
  start_date: string;
  end_date: string;
  amc_value?: number;
  coverage_details?: string;
  sla_hours?: number;
  status: 'Active' | 'Expired' | 'Cancelled';
  created_at: string;
}

export interface DashboardStats {
  totalAssets: number;
  bondedAssets: number;
  assetValueGross: number;
  assetValueNet: number;
  dutyForegoneAmount: number;
  pendingApprovals: number;
  underMaintenance: number;
  auditDue: number;
  warrantyExpiring: number;
  movementToday: number;
  assetsByCategory?: Record<string, number>;
}

export class AssetService {
  // ==================== ASSETS ====================
  
  static async createAsset(assetData: Partial<Asset>): Promise<Asset> {
    // Get user from localStorage
    const savedUser = localStorage.getItem('demo_user');
    const userName = savedUser ? JSON.parse(savedUser).appUser?.name : null;

    // Ensure an asset_id exists. If not provided, try generating one via RPC
    const finalData: Partial<Asset> = { ...assetData };
    if (!finalData.asset_id || String(finalData.asset_id).trim() === '') {
      try {
        const { data: generatedId, error: rpcErr } = await supabase.rpc('generate_asset_id');
        if (!rpcErr && generatedId) {
          // rpc returns value in `data` — can be string or object depending on function
          finalData.asset_id = (generatedId as any) || finalData.asset_id;
        } else if (rpcErr) {
          console.warn('generate_asset_id RPC error:', rpcErr);
        }
      } catch (rpcError) {
        console.warn('generate_asset_id RPC failed:', rpcError);
      }
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({ 
        ...finalData,
        created_by: userName 
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  
  static async getAssets(filters?: { status?: string }): Promise<Asset[]> {
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    
    if (filters?.status) query = query.eq('asset_status', filters.status);
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Auto-process depreciation when loading assets
    if (data) {
      await this.autoDepreciate(data);
    }
    
    return data || [];
  }
  
  static async getAssetById(id: string): Promise<Asset> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    // Get user from localStorage
    const savedUser = localStorage.getItem('demo_user');
    const userName = savedUser ? JSON.parse(savedUser).appUser?.name : null;
    
    // Convert empty strings to null for UUID fields
    const cleanedUpdates = { ...updates };
    const uuidFields = ['building', 'floor_id', 'room_id', 'vendor_id', 'handover_to'];
    uuidFields.forEach(field => {
      if (cleanedUpdates[field as keyof Asset] === '') {
        cleanedUpdates[field as keyof Asset] = null as any;
      }
    });
    
    const { data, error } = await supabase
      .from('assets')
      .update({ ...cleanedUpdates, updated_by: userName })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Update error:', error);
      throw new Error(error.message);
    }
    return data;
  }
  
  static async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) throw error;
  }
  
  // ==================== DEPRECIATION ====================
  
  private static async autoDepreciate(assets: Asset[]): Promise<void> {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    for (const asset of assets) {
      if (!asset.depreciation_date || !asset.depreciation_percentage || asset.depreciation_percentage <= 0) continue;
      if (!asset.asset_value || asset.asset_value <= 0) continue;
      
      const depreciationDate = new Date(asset.depreciation_date);
      const lastDepreciation = asset.last_depreciation_date ? new Date(asset.last_depreciation_date) : null;
      
      // Check if depreciation is due (yearly on the depreciation date)
      const shouldDepreciate = lastDepreciation 
        ? (currentYear > lastDepreciation.getFullYear() && today >= new Date(currentYear, depreciationDate.getMonth(), depreciationDate.getDate()))
        : (today >= depreciationDate);
      
      if (shouldDepreciate) {
        const currentValue = asset.asset_value;
        const depreciationAmount = (currentValue * asset.depreciation_percentage) / 100;
        const newValue = Math.max(0, currentValue - depreciationAmount);
        
        try {
          await supabase
            .from('assets')
            .update({ 
              asset_value: newValue,
              last_depreciation_date: today.toISOString().split('T')[0]
            })
            .eq('id', asset.id);
          
          // Update the asset in the array
          asset.asset_value = newValue;
          asset.last_depreciation_date = today.toISOString().split('T')[0];
        } catch (err) {
          console.error(`Failed to depreciate asset ${asset.asset_id}:`, err);
        }
      }
    }
  }
  
  static async bulkImportAssets(assets: Partial<Asset>[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const asset of assets) {
      try {
        await this.createAsset(asset);
        success++;
      } catch {
        failed++;
      }
    }
    
    return { success, failed };
  }
  
  // ==================== MOVEMENTS ====================
  
  static async createMovement(movementData: Partial<AssetMovement>): Promise<AssetMovement> {
    const requestNumber = movementData.request_number || `MV-${Date.now()}`;
    
    const { data, error } = await supabase
      .from('asset_movements')
      .insert({ ...movementData, request_number: requestNumber })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async getMovements(assetId?: string): Promise<AssetMovement[]> {
    let query = supabase.from('asset_movements').select('*').order('created_at', { ascending: false });
    
    if (assetId) query = query.eq('asset_id', assetId);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  static async updateMovementStatus(id: string, status: string, actualDate?: string): Promise<AssetMovement> {
    const { data: movement, error: fetchError } = await supabase
      .from('asset_movements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // If approving or completing, update asset locations and create history
    if ((status === 'Approved' || status === 'Completed') && movement) {
      const savedUser = localStorage.getItem('demo_user');
      const userName = savedUser ? JSON.parse(savedUser).appUser?.name : 'System';
      
      const assetIds = movement.assets || (movement.asset_id ? [movement.asset_id] : []);
      
      for (const assetId of assetIds) {
        const { data: asset } = await supabase.from('assets').select('*').eq('id', assetId).single();
        if (!asset) continue;
        
        const updates: any = {};
        const historyRecords: any[] = [];
        
        // Helper function to check if string is a valid UUID
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        // Update building
        if (movement.to_building) {
          let buildingId = movement.to_building;
          let buildingName = movement.to_building;
          
          // If it's a UUID, get the name for history
          if (isUUID(movement.to_building)) {
            const { data: bldg } = await supabase
              .from('buildings')
              .select('id, name')
              .eq('id', movement.to_building)
              .maybeSingle();
            if (bldg) {
              buildingId = bldg.id;
              buildingName = bldg.name;
            }
          } else {
            // If it's a name, get the UUID for asset table
            const { data: bldg } = await supabase
              .from('buildings')
              .select('id, name')
              .eq('name', movement.to_building)
              .maybeSingle();
            if (bldg) {
              buildingId = bldg.id;
              buildingName = bldg.name;
            }
          }
          
          if (asset.building !== buildingId) {
            // Get old building name for history
            let oldBuildingName = asset.building || 'N/A';
            if (asset.building && isUUID(asset.building)) {
              const { data: oldBldg } = await supabase
                .from('buildings')
                .select('name')
                .eq('id', asset.building)
                .maybeSingle();
              oldBuildingName = oldBldg?.name || asset.building;
            }
            
            historyRecords.push({
              asset_id: assetId,
              change_type: 'location',
              field_name: 'building',
              old_value: oldBuildingName,
              new_value: buildingName,
              changed_by: userName,
              movement_request_id: id
            });
            updates.building = buildingId; // Store UUID in assets table
          }
        }
        
        // Update floor
        if (movement.to_floor) {
          let floorId = movement.to_floor;
          let floorName = movement.to_floor;
          
          // If it's a UUID, get the name for history
          if (isUUID(movement.to_floor)) {
            const { data: flr } = await supabase
              .from('floors')
              .select('id, floor_name, floor_number')
              .eq('id', movement.to_floor)
              .maybeSingle();
            if (flr) {
              floorId = flr.id;
              floorName = flr.floor_name || `Floor ${flr.floor_number}`;
            }
          } else {
            // If it's a name/number, get the UUID for asset table
            const { data: flr } = await supabase
              .from('floors')
              .select('id, floor_name, floor_number')
              .or(`floor_name.eq.${movement.to_floor},floor_number.eq.${movement.to_floor}`)
              .maybeSingle();
            if (flr) {
              floorId = flr.id;
              floorName = flr.floor_name || `Floor ${flr.floor_number}`;
            }
          }
          
          if (asset.floor_id !== floorId) {
            // Get old floor name for history
            let oldFloorName = asset.floor_id || 'N/A';
            if (asset.floor_id && isUUID(asset.floor_id)) {
              const { data: oldFlr } = await supabase
                .from('floors')
                .select('floor_name, floor_number')
                .eq('id', asset.floor_id)
                .maybeSingle();
              oldFloorName = oldFlr?.floor_name || `Floor ${oldFlr?.floor_number}` || asset.floor_id;
            }
            
            historyRecords.push({
              asset_id: assetId,
              change_type: 'location',
              field_name: 'floor_id',
              old_value: oldFloorName,
              new_value: floorName,
              changed_by: userName,
              movement_request_id: id
            });
            updates.floor_id = floorId; // Store UUID in assets table
          }
        }
        
        // Update room
        if (movement.to_room) {
          let roomId = movement.to_room;
          let roomName = movement.to_room;
          
          // If it's a UUID, get the name for history
          if (isUUID(movement.to_room)) {
            const { data: rm } = await supabase
              .from('rooms')
              .select('id, room_number')
              .eq('id', movement.to_room)
              .maybeSingle();
            if (rm) {
              roomId = rm.id;
              roomName = rm.room_number;
            }
          } else {
            // If it's a name, get the UUID for asset table
            const { data: rm } = await supabase
              .from('rooms')
              .select('id, room_number')
              .eq('room_number', movement.to_room)
              .maybeSingle();
            if (rm) {
              roomId = rm.id;
              roomName = rm.room_number;
            }
          }
          
          if (asset.room_id !== roomId) {
            // Get old room name for history
            let oldRoomName = asset.room_id || 'N/A';
            if (asset.room_id && isUUID(asset.room_id)) {
              const { data: oldRm } = await supabase
                .from('rooms')
                .select('room_number')
                .eq('id', asset.room_id)
                .maybeSingle();
              oldRoomName = oldRm?.room_number || asset.room_id;
            }
            
            historyRecords.push({
              asset_id: assetId,
              change_type: 'location',
              field_name: 'room_id',
              old_value: oldRoomName,
              new_value: roomName,
              changed_by: userName,
              movement_request_id: id
            });
            updates.room_id = roomId; // Store UUID in assets table
          }
        }
        
        // Update handover_to (tenant)
        if ((movement as any).handover_to === 'Tenant' && (movement as any).to_tenant_id) {
          const newHandoverToId = (movement as any).to_tenant_id;
          
          if (asset.handover_to !== newHandoverToId) {
            // Get tenant names for history
            let oldTenantName = 'N/A';
            let newTenantName = (movement as any).to_tenant || (movement as any).handover_name || 'N/A';
            
            if (asset.handover_to) {
              const { data: oldTenant } = await supabase
                .from('tenants')
                .select('company, name')
                .eq('id', asset.handover_to)
                .maybeSingle();
              oldTenantName = oldTenant?.company || oldTenant?.name || asset.handover_to;
            }
            
            historyRecords.push({
              asset_id: assetId,
              change_type: 'handover',
              field_name: 'handover_to',
              old_value: oldTenantName,
              new_value: newTenantName,
              changed_by: userName,
              movement_request_id: id
            });
            updates.handover_to = newHandoverToId; // Store UUID in assets table
          }
        }
        
        // Insert history records (with names/text)
        if (historyRecords.length > 0) {
          await supabase.from('asset_history').insert(historyRecords);
        }
        
        // Update asset (with UUIDs)
        if (Object.keys(updates).length > 0) {
          await supabase.from('assets').update(updates).eq('id', assetId);
        }
      }
    }
    
    const { data, error } = await supabase
      .from('asset_movements')
      .update({ movement_status: status, actual_movement_date: actualDate })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ==================== MAINTENANCE ====================
  
  static async createMaintenance(maintenanceData: Partial<AssetMaintenance>): Promise<AssetMaintenance> {
    const { data, error } = await supabase
      .from('asset_maintenance')
      .insert(maintenanceData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async getMaintenance(assetId?: string): Promise<AssetMaintenance[]> {
    let query = supabase.from('asset_maintenance').select('*').order('schedule_date', { ascending: false });
    
    if (assetId) query = query.eq('asset_id', assetId);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ==================== AMC ====================
  
  static async createAMC(amcData: Partial<AssetAMC>): Promise<AssetAMC> {
    const { data, error } = await supabase
      .from('asset_amc')
      .insert(amcData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async getAMC(assetId?: string): Promise<AssetAMC[]> {
    let query = supabase.from('asset_amc').select('*').order('start_date', { ascending: false });
    
    if (assetId) query = query.eq('asset_id', assetId);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  // ==================== DASHBOARD STATS ====================
  
  static async getDashboardStats(): Promise<DashboardStats> {
    const { data: assets } = await supabase.from('assets').select('*');
    const { data: movements } = await supabase.from('asset_movements').select('*').eq('movement_status', 'Pending');
    const { data: maintenance } = await supabase.from('asset_maintenance').select('*').in('maintenance_status', ['Scheduled', 'In Progress']);
    
    const totalAssets = assets?.length || 0;
    const bondedAssets = assets?.filter(a => a.sez_status === 'SEZ').length || 0;
    const assetValueGross = assets?.reduce((sum, a) => sum + (a.asset_value || a.asset_cost || 0), 0) || 0;
    const assetValueNet = assets?.reduce((sum, a) => sum + (a.net_book_value || 0), 0) || 0;
    const dutyForegoneAmount = assets?.filter(a => a.sez_status === 'SEZ').reduce((sum, a) => sum + (a.duty_foregone_amount || 0), 0) || 0;
    
    const assetsByCategory: Record<string, number> = {};
    assets?.forEach(a => {
      if (a.asset_category) {
        assetsByCategory[a.asset_category] = (assetsByCategory[a.asset_category] || 0) + 1;
      }
    });
    
    const today = new Date().toISOString().split('T')[0];
    const movementToday = movements?.filter(m => m.created_at?.startsWith(today)).length || 0;
    
    return {
      totalAssets,
      bondedAssets,
      assetValueGross,
      assetValueNet,
      dutyForegoneAmount,
      pendingApprovals: movements?.length || 0,
      underMaintenance: maintenance?.length || 0,
      auditDue: 0,
      warrantyExpiring: 0,
      movementToday,
      assetsByCategory
    };
  }
  
  // ==================== AUDIT LOGS ====================
  
  static async getAuditLogs(assetId: string) {
    const { data, error } = await supabase
      .from('asset_audit_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('changed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  static async getAssetHistory(assetId: string) {
    const { data, error } = await supabase
      .from('asset_history')
      .select('*')
      .eq('asset_id', assetId)
      .order('changed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}
