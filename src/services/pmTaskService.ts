import { supabase } from '@/lib/supabaseClient';

export interface PMTask {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_code: string;
  asset_category?: string;
  asset_sub_category?: string;
  asset_type?: string;
  barcode: string;
  location: string;
  building_name?: string;
  floor?: string;
  tenant_name?: string;
  tenant_id?: string;
  pm_next_date: string;
  pm_frequency_days: number;
  pm_last_completed_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assignment_notes?: string;
  status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  task_instance_status?: string;
  days_overdue?: number;
  last_audit_date?: string;
  last_audit_result?: string;
}

export interface PMTaskFilters {
  date?: string;
  tenant_id?: string;
  building_id?: string;
  floor?: string;
  status?: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  show_only_unassigned?: boolean;
  assigned_to?: string;
}

export interface BulkAssignmentPayload {
  asset_ids: string[];
  assigned_to: string;
  assignment_notes?: string;
}

class PMTaskService {
  /**
   * Update task statuses in database based on date
   */
  async updateOverdueTaskStatuses(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Update past dates to OVERDUE
      const { error: overdueError } = await supabase
        .from('pm_task_instances')
        .update({ status: 'OVERDUE' })
        .lt('task_date', today)
        .neq('status', 'COMPLETED');

      if (overdueError) throw overdueError;
      
      // Update today's date to PENDING
      const { error: pendingError } = await supabase
        .from('pm_task_instances')
        .update({ status: 'PENDING' })
        .eq('task_date', today)
        .neq('status', 'COMPLETED');

      if (pendingError) throw pendingError;
      
      // Update future dates to UPCOMING
      const { error: upcomingError } = await supabase
        .from('pm_task_instances')
        .update({ status: 'UPCOMING' })
        .gt('task_date', today)
        .neq('status', 'COMPLETED');

      if (upcomingError) throw upcomingError;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get PM tasks for a specific date with filters
   */
  async getPMTasks(filters: PMTaskFilters = {}): Promise<PMTask[]> {
    try {
      const {
        date = new Date().toISOString().split('T')[0],
        tenant_id,
        building_id,
        floor,
        status,
        show_only_unassigned,
        assigned_to
      } = filters;

      // First, update overdue task statuses
      await this.updateOverdueTaskStatuses();
      
      // Then, ensure task instances exist for the target date
      await this.ensureTaskInstancesExist(date);

      // Build the query for task instances
      let query = supabase
        .from('pm_task_instances')
        .select('*')
        .eq('task_date', date);

      // Assignment filter
      if (show_only_unassigned) {
        query = query.is('assigned_to', null);
      } else if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      const { data: taskInstances, error } = await query.order('task_date', { ascending: true });

      if (error) throw error;
      if (!taskInstances || taskInstances.length === 0) return [];

      // Get asset details
      const assetIds = taskInstances.map(t => t.asset_id);
      
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, asset_name, asset_id, asset_category, asset_sub_category, asset_type, building, floor_id, room_id, handover_to')
        .in('id', assetIds);

      if (assetsError) throw assetsError;

      // Get PM schedule details
      const scheduleIds = taskInstances.map(t => t.pm_schedule_id).filter(Boolean);
      const { data: schedules } = await supabase
        .from('preventive_maintenance')
        .select('id, pm_frequency_days, pm_last_completed_date')
        .in('id', scheduleIds);

      // Create maps
      const assetMap = new Map(assets?.map(a => [a.id, a]) || []);
      const scheduleMap = new Map(schedules?.map(s => [s.id, s]) || []);

      // Apply tenant, building, floor filters
      let filteredData = taskInstances.filter(taskInstance => {
        const asset = assetMap.get(taskInstance.asset_id);
        if (!asset) return false;

        if (tenant_id && asset.handover_to !== tenant_id) return false;
        if (building_id && asset.building !== building_id) return false;
        if (floor && asset.floor_id !== floor) return false;

        return true;
      });

      // Get building, floor, and tenant data separately
      const buildingIds = [...new Set(filteredData.map(t => assetMap.get(t.asset_id)?.building).filter(Boolean))];
      const floorIds = [...new Set(filteredData.map(t => assetMap.get(t.asset_id)?.floor_id).filter(Boolean))];
      const tenantIds = [...new Set(filteredData.map(t => assetMap.get(t.asset_id)?.handover_to).filter(Boolean))];
      const assignedUserIds = [...new Set(filteredData.map(t => t.assigned_to).filter(Boolean))];

      let buildingsMap = new Map();
      let floorsMap = new Map();
      let tenantsMap = new Map();
      let usersMap = new Map();

      // Fetch buildings
      if (buildingIds.length > 0) {
        const { data: buildings } = await supabase
          .from('buildings')
          .select('id, name')
          .in('id', buildingIds);
        
        buildings?.forEach(building => buildingsMap.set(building.id, building.name));
      }

      // Fetch floors
      if (floorIds.length > 0) {
        const { data: floors } = await supabase
          .from('floors')
          .select('id, floor_name, floor_number')
          .in('id', floorIds);
        
        floors?.forEach(floor => floorsMap.set(floor.id, floor.floor_name || floor.floor_number || 'N/A'));
      }

      // Fetch tenants
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, company')
          .in('id', tenantIds);
        
        tenants?.forEach(tenant => tenantsMap.set(tenant.id, tenant.company));
      }

      // Fetch users
      if (assignedUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', assignedUserIds);
        
        users?.forEach(user => usersMap.set(user.id, user.name));
      }

      // Get last audit for each asset
      const assetIdsForAudit = filteredData.map(t => t.asset_id) || [];
      let lastAuditsMap = new Map();

      if (assetIdsForAudit.length > 0) {
        const { data: audits } = await supabase
          .from('physical_audits')
          .select('asset_id, audit_date, audit_result')
          .in('asset_id', assetIdsForAudit.map(id => id.toString()))
          .order('audit_date', { ascending: false });

        audits?.forEach(audit => {
          if (!lastAuditsMap.has(audit.asset_id)) {
            lastAuditsMap.set(audit.asset_id, {
              date: audit.audit_date,
              result: audit.audit_result
            });
          }
        });
      }

      // Transform data
      const tasks: PMTask[] = (filteredData || []).map(taskInstance => {
        const asset = assetMap.get(taskInstance.asset_id);
        const pmSchedule = scheduleMap.get(taskInstance.pm_schedule_id);
        
        if (!asset) return null;
        
        const taskDate = new Date(taskInstance.task_date);
        taskDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - taskDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let taskStatus: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
        
        // Use status directly from database
        if (taskInstance.status === 'COMPLETED') {
          taskStatus = 'UPCOMING';
        } else if (taskInstance.status === 'OVERDUE') {
          taskStatus = 'OVERDUE';
        } else if (taskInstance.status === 'PENDING') {
          taskStatus = 'DUE_TODAY';
        } else if (taskInstance.status === 'UPCOMING') {
          taskStatus = 'UPCOMING';
        } else {
          taskStatus = 'UPCOMING';
        }

        const lastAudit = lastAuditsMap.get(taskInstance.asset_id.toString());

        return {
          id: taskInstance.id,
          asset_id: taskInstance.asset_id,
          asset_name: asset.asset_name,
          asset_code: asset.asset_id,
          asset_category: asset.asset_category,
          asset_sub_category: asset.asset_sub_category,
          asset_type: asset.asset_type,
          barcode: asset.asset_id,
          location: [asset.building ? buildingsMap.get(asset.building) : '', asset.floor_id ? floorsMap.get(asset.floor_id) : ''].filter(Boolean).join(' / ') || 'N/A',
          building_name: asset.building ? buildingsMap.get(asset.building) : undefined,
          floor: asset.floor_id ? floorsMap.get(asset.floor_id) : undefined,
          tenant_name: asset.handover_to ? tenantsMap.get(asset.handover_to) : undefined,
          tenant_id: asset.handover_to,
          pm_next_date: taskInstance.task_date,
          pm_frequency_days: pmSchedule?.pm_frequency_days || 0,
          pm_last_completed_date: pmSchedule?.pm_last_completed_date,
          assigned_to: taskInstance.assigned_to,
          assigned_to_name: taskInstance.assigned_to ? usersMap.get(taskInstance.assigned_to) : undefined,
          assignment_notes: taskInstance.assignment_notes,
          status: taskStatus,
          task_instance_status: taskInstance.status,
          days_overdue: diffDays > 0 && taskInstance.status !== 'COMPLETED' ? diffDays : undefined,
          last_audit_date: lastAudit?.date,
          last_audit_result: lastAudit?.result
        };
      }).filter(Boolean) as PMTask[];

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ensure PM task instances exist for a given date
   */
  private async ensureTaskInstancesExist(date: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('generate_pm_task_instances', {
        p_start_date: date,
        p_end_date: date
      });
      
      if (error) {
        await this.manuallyGenerateTaskInstances(date);
      }
    } catch (error) {
      await this.manuallyGenerateTaskInstances(date);
    }
  }

  /**
   * Manually generate task instances if RPC fails
   */
  private async manuallyGenerateTaskInstances(date: string): Promise<void> {
    try {
      const { data: schedules, error: schedError } = await supabase
        .from('preventive_maintenance')
        .select('id, asset_id, pm_next_date, pm_frequency_days, pm_end_date')
        .eq('pm_enabled', true)
        .not('pm_next_date', 'is', null);

      if (schedError || !schedules || schedules.length === 0) return;

      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tasksToCreate = [];

      for (const schedule of schedules) {
        let currentDate = new Date(schedule.pm_next_date);
        currentDate.setHours(0, 0, 0, 0);
        
        // Skip past dates - only generate from today onwards
        if (currentDate < today) {
          currentDate = new Date(today);
        }
        
        const endDate = schedule.pm_end_date ? new Date(schedule.pm_end_date) : null;
        if (endDate) endDate.setHours(0, 0, 0, 0);

        let iterations = 0;
        const maxIterations = 1000;
        
        while (iterations < maxIterations && (!endDate || currentDate <= endDate)) {
          iterations++;
          
          if (currentDate.getTime() === targetDate.getTime()) {
            const status = currentDate < today ? 'OVERDUE' : 
                          currentDate.getTime() === today.getTime() ? 'PENDING' : 'UPCOMING';
            
            tasksToCreate.push({
              asset_id: schedule.asset_id,
              pm_schedule_id: schedule.id,
              task_date: date,
              status
            });
            break;
          }
          
          if (currentDate > targetDate) break;
          currentDate.setDate(currentDate.getDate() + schedule.pm_frequency_days);
        }
      }

      if (tasksToCreate.length > 0) {
        await supabase
          .from('pm_task_instances')
          .upsert(tasksToCreate, { 
            onConflict: 'asset_id,task_date',
            ignoreDuplicates: false 
          });
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Assign a user to a PM task instance (date-specific)
   */
  async assignTask(assetId: string, userId: string, notes?: string, taskDate?: string): Promise<void> {
    try {
      const targetDate = taskDate || new Date().toISOString().split('T')[0];
      
      // Ensure task instance exists
      await this.ensureTaskInstancesExist(targetDate);
      
      const { error } = await supabase
        .from('pm_task_instances')
        .update({
          assigned_to: userId,
          assigned_at: new Date().toISOString(),
          assignment_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('asset_id', assetId)
        .eq('task_date', targetDate);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk assign users to multiple PM tasks for a specific date
   */
  async bulkAssignTasks(payload: BulkAssignmentPayload & { task_date?: string }): Promise<void> {
    try {
      const { asset_ids, assigned_to, assignment_notes, task_date } = payload;
      const targetDate = task_date || new Date().toISOString().split('T')[0];

      // Ensure task instances exist
      await this.ensureTaskInstancesExist(targetDate);

      const promises = asset_ids.map(asset_id =>
        supabase
          .from('pm_task_instances')
          .update({
            assigned_to,
            assigned_at: new Date().toISOString(),
            assignment_notes,
            updated_at: new Date().toISOString()
          })
          .eq('asset_id', asset_id)
          .eq('task_date', targetDate)
      );

      const results = await Promise.all(promises);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to assign ${errors.length} tasks`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unassign a user from a PM task instance
   */
  async unassignTask(assetId: string, taskDate?: string): Promise<void> {
    try {
      const targetDate = taskDate || new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('pm_task_instances')
        .update({
          assigned_to: null,
          assigned_at: null,
          assignment_notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('asset_id', assetId)
        .eq('task_date', targetDate);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available auditors (users with assetAuditor flag)
   */
  async getAvailableAuditors(): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('is_active', true)
        .or('asset_auditor.eq.true,asset_incharge.eq.true')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get PM task statistics for dashboard
   */
  async getPMTaskStats(date?: string): Promise<{
    total: number;
    overdue: number;
    due_today: number;
    upcoming: number;
    unassigned: number;
    assigned: number;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Ensure task instances exist for the target date
      await this.ensureTaskInstancesExist(targetDate);
      
      // Get task instances for the target date
      const { data: taskInstances, error } = await supabase
        .from('pm_task_instances')
        .select('status, assigned_to')
        .eq('task_date', targetDate);

      if (error) throw error;

      const stats = {
        total: taskInstances?.length || 0,
        overdue: 0,
        due_today: 0,
        upcoming: 0,
        unassigned: 0,
        assigned: 0
      };

      taskInstances?.forEach(task => {
        // Count by status
        if (task.status === 'OVERDUE') {
          stats.overdue++;
        } else if (task.status === 'PENDING') {
          stats.due_today++;
        } else if (task.status === 'UPCOMING') {
          stats.upcoming++;
        } else if (task.status === 'COMPLETED') {
          stats.upcoming++; // Completed tasks count as upcoming
        }

        // Count by assignment
        if (task.assigned_to) {
          stats.assigned++;
        } else {
          stats.unassigned++;
        }
      });

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export PM tasks to CSV
   */
  async exportPMTasks(filters: PMTaskFilters = {}): Promise<string> {
    try {
      const tasks = await this.getPMTasks(filters);
      
      const headers = [
        'Asset ID',
        'Asset Name',
        'Location',
        'Building',
        'Floor',
        'Tenant',
        'PM Next Date',
        'Status',
        'Days Overdue',
        'Assigned To',
        'Last Audit Date',
        'Last Audit Result'
      ];

      const rows = tasks.map(task => [
        task.asset_code,
        task.asset_name,
        task.location,
        task.building_name || '',
        task.floor || '',
        task.tenant_name || '',
        task.pm_next_date,
        task.status,
        task.days_overdue || '',
        task.assigned_to_name || 'Unassigned',
        task.last_audit_date || '',
        task.last_audit_result || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return csv;
    } catch (error) {
      throw error;
    }
  }
}

export const pmTaskService = new PMTaskService();
