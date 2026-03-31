import { supabase } from '@/lib/supabaseClient';

export interface PMAssignment {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  asset_category?: string;
  asset_sub_category?: string;
  building?: string;
  building_name?: string;
  floor_id?: string;
  floor_name?: string;
  assigned_to?: string;
  assigned_user_name?: string;
  assigned_user_email?: string;
  pm_enabled: boolean;
  pm_start_date: string;
  pm_end_date?: string;
  pm_frequency_days: number;
  pm_next_date: string;
  pm_last_completed_date?: string;
  assigned_at?: string;
  assignment_notes?: string;
  pm_status?: 'Overdue' | 'Due Today' | 'Due Soon' | 'Scheduled';
  created_at?: string;
  updated_at?: string;
}

export interface CreatePMAssignment {
  asset_id: string;
  assigned_to?: string;
  pm_start_date: string;
  pm_end_date?: string;
  pm_frequency_days: number;
  assignment_notes?: string;
}

export interface UpdatePMAssignment {
  assigned_to?: string;
  pm_enabled?: boolean;
  pm_start_date?: string;
  pm_end_date?: string;
  pm_frequency_days?: number;
  pm_next_date?: string;
  pm_last_completed_date?: string;
  assignment_notes?: string;
}

export interface PhysicalAudit {
  id: string;
  asset_id: string;
  auditor_id?: string;
  auditor_name?: string;
  barcode_scanned: boolean;
  asset_found: boolean;
  location_match: boolean;
  tenant_match: boolean;
  serial_match: boolean;
  condition?: string;
  audit_result?: string;
  remarks?: string;
  audit_date: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
  created_at?: string;
}

export interface CreatePhysicalAudit {
  asset_id: string;
  auditor_id?: string;
  auditor_name?: string;
  barcode_scanned: boolean;
  asset_found: boolean;
  location_match: boolean;
  tenant_match: boolean;
  serial_match: boolean;
  condition?: string;
  audit_result?: string;
  remarks?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
}

class PMService {
  // Get all PM assignments (Admin view)
  async getAllPMAssignments(): Promise<PMAssignment[]> {
    const { data, error } = await supabase
      .from('pm_assignments_view')
      .select('*')
      .order('pm_next_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get PM assignments for current user
  async getMyPMAssignments(): Promise<PMAssignment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('pm_assignments_view')
      .select('*')
      .eq('assigned_to', user.id)
      .order('pm_next_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get PM assignment by asset ID
  async getPMByAssetId(assetId: string): Promise<PMAssignment | null> {
    const { data, error } = await supabase
      .from('pm_assignments_view')
      .select('*')
      .eq('asset_id', assetId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Create PM assignment
  async createPMAssignment(assignment: CreatePMAssignment): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Calculate next PM date
    const startDate = new Date(assignment.pm_start_date);
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + assignment.pm_frequency_days);

    const { error } = await supabase
      .from('preventive_maintenance')
      .insert({
        asset_id: assignment.asset_id,
        assigned_to: assignment.assigned_to,
        pm_start_date: assignment.pm_start_date,
        pm_end_date: assignment.pm_end_date,
        pm_frequency_days: assignment.pm_frequency_days,
        pm_next_date: nextDate.toISOString().split('T')[0],
        assignment_notes: assignment.assignment_notes,
        assigned_at: assignment.assigned_to ? new Date().toISOString() : null,
        pm_enabled: true,
        created_by: user?.email || 'system',
      });

    if (error) throw error;
  }

  // Bulk create PM assignments
  async bulkCreatePMAssignments(assignments: CreatePMAssignment[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const records = assignments.map(assignment => {
      const startDate = new Date(assignment.pm_start_date);
      const nextDate = new Date(startDate);
      nextDate.setDate(nextDate.getDate() + assignment.pm_frequency_days);

      return {
        asset_id: assignment.asset_id,
        assigned_to: assignment.assigned_to,
        pm_start_date: assignment.pm_start_date,
        pm_end_date: assignment.pm_end_date,
        pm_frequency_days: assignment.pm_frequency_days,
        pm_next_date: nextDate.toISOString().split('T')[0],
        assignment_notes: assignment.assignment_notes,
        assigned_at: assignment.assigned_to ? new Date().toISOString() : null,
        pm_enabled: true,
        created_by: user?.email || 'system',
      };
    });

    const { error } = await supabase
      .from('preventive_maintenance')
      .insert(records);

    if (error) throw error;
  }

  // Update PM assignment
  async updatePMAssignment(id: string, updates: UpdatePMAssignment): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const updateData: any = {
      ...updates,
      updated_by: user?.email || 'system',
      updated_at: new Date().toISOString(),
    };

    // If assigning to a new user, update assigned_at
    if (updates.assigned_to) {
      updateData.assigned_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('preventive_maintenance')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  // Complete PM (mark as done and calculate next date)
  async completePM(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    // Get current PM record
    const { data: pm, error: fetchError } = await supabase
      .from('preventive_maintenance')
      .select('pm_frequency_days, pm_next_date')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new next date
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + pm.pm_frequency_days);

    const { error } = await supabase
      .from('preventive_maintenance')
      .update({
        pm_last_completed_date: today.toISOString().split('T')[0],
        pm_next_date: nextDate.toISOString().split('T')[0],
        updated_by: user?.email || 'system',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  // Delete PM assignment
  async deletePMAssignment(id: string): Promise<void> {
    const { error } = await supabase
      .from('preventive_maintenance')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get physical audits for an asset
  async getAuditsForAsset(assetId: string): Promise<PhysicalAudit[]> {
    const { data, error } = await supabase
      .from('physical_audits')
      .select('*')
      .eq('asset_id', assetId)
      .order('audit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get my audits (current user)
  async getMyAudits(): Promise<PhysicalAudit[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('physical_audits')
      .select('*')
      .eq('auditor_id', user.id)
      .order('audit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Create physical audit
  async createPhysicalAudit(audit: CreatePhysicalAudit): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('physical_audits')
      .insert({
        ...audit,
        auditor_id: user?.id,
        auditor_name: audit.auditor_name || user?.email,
        audit_date: new Date().toISOString(),
      });

    if (error) throw error;

    // If audit is successful, complete the PM
    if (audit.audit_result === 'Pass' || audit.asset_found) {
      // Find PM record for this asset
      const { data: asset } = await supabase
        .from('assets')
        .select('id')
        .eq('asset_id', audit.asset_id)
        .single();

      if (asset) {
        const { data: pm } = await supabase
          .from('preventive_maintenance')
          .select('id')
          .eq('asset_id', asset.id)
          .single();

        if (pm) {
          await this.completePM(pm.id);
        }
      }
    }
  }

  // Get PM statistics for dashboard
  async getPMStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'Admin' || userData?.role === 'Super Admin';

    let query = supabase.from('pm_assignments_view').select('pm_status');
    
    if (!isAdmin) {
      query = query.eq('assigned_to', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      overdue: data?.filter(pm => pm.pm_status === 'Overdue').length || 0,
      dueToday: data?.filter(pm => pm.pm_status === 'Due Today').length || 0,
      dueSoon: data?.filter(pm => pm.pm_status === 'Due Soon').length || 0,
      scheduled: data?.filter(pm => pm.pm_status === 'Scheduled').length || 0,
    };

    return stats;
  }
}

export const pmService = new PMService();
