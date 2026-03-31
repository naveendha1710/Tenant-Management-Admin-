import { supabase } from '@/lib/supabaseClient';
import type {
  PMReportFilters,
  PMScheduleReportRow,
  PMScheduleReportSummary,
  PMTaskReportRow,
  PMTaskReportSummary,
  PMAuditReportRow,
  PMAuditReportSummary,
  PMReportResponse,
} from '@/types/pmReports';

// Shared filter builder
function buildFilterQuery(query: any, filters: PMReportFilters, tableAlias: string = 'a') {
  // Asset filters
  if (filters.buildingId) query = query.eq(`${tableAlias}.building`, filters.buildingId);
  if (filters.floorId) query = query.eq(`${tableAlias}.floor_id`, filters.floorId);
  if (filters.roomId) query = query.eq(`${tableAlias}.room_id`, filters.roomId);
  if (filters.tenantId) query = query.eq(`${tableAlias}.handover_to`, filters.tenantId);
  if (filters.categoryId) query = query.eq(`${tableAlias}.asset_category`, filters.categoryId);
  if (filters.subCategoryId) query = query.eq(`${tableAlias}.asset_sub_category`, filters.subCategoryId);
  if (filters.typeId) query = query.eq(`${tableAlias}.asset_type`, filters.typeId);
  if (filters.assetStatus?.length) query = query.in(`${tableAlias}.status`, filters.assetStatus);

  return query;
}

// PM Schedule Report
export async function getPMScheduleReport(
  filters: PMReportFilters
): Promise<PMReportResponse<PMScheduleReportRow, PMScheduleReportSummary>> {
  let query = supabase
    .from('preventive_maintenance')
    .select(`
      id,
      pm_start_date,
      pm_end_date,
      pm_frequency_days,
      pm_enabled,
      assigned_to,
      assets!inner (
        id,
        asset_id,
        asset_name,
        asset_category,
        asset_sub_category,
        asset_type,
        building,
        floor_id,
        room_id,
        handover_to,
        status
      ),
      users!preventive_maintenance_assigned_to_fkey (name)
    `)
    .gte('pm_start_date', filters.dateRange.startDate)
    .lte('pm_start_date', filters.dateRange.endDate);

  query = buildFilterQuery(query, filters, 'assets');
  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

  const { data: schedules, error } = await query;
  if (error) throw error;

  // Fetch related data separately
  const tenantIds = [...new Set(schedules?.map(s => (s.assets as any).handover_to).filter(Boolean))];
  const buildingIds = [...new Set(schedules?.map(s => (s.assets as any).building).filter(Boolean))];
  const floorIds = [...new Set(schedules?.map(s => (s.assets as any).floor_id).filter(Boolean))];
  const roomIds = [...new Set(schedules?.map(s => (s.assets as any).room_id).filter(Boolean))];

  const [tenantsRes, buildingsRes, floorsRes, roomsRes] = await Promise.all([
    tenantIds.length > 0 ? supabase.from('tenants').select('id, company').in('id', tenantIds) : Promise.resolve({ data: [] }),
    buildingIds.length > 0 ? supabase.from('buildings').select('id, name').in('id', buildingIds) : Promise.resolve({ data: [] }),
    floorIds.length > 0 ? supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds) : Promise.resolve({ data: [] }),
    roomIds.length > 0 ? supabase.from('rooms').select('id, room_number').in('id', roomIds) : Promise.resolve({ data: [] })
  ]);
  
  const tenantMap = new Map(tenantsRes.data?.map(t => [t.id, t.company]) || []);
  const buildingMap = new Map(buildingsRes.data?.map(b => [b.id, b.name]) || []);
  const floorMap = new Map(floorsRes.data?.map(f => [f.id, f.floor_name || f.floor_number]) || []);
  const roomMap = new Map(roomsRes.data?.map(r => [r.id, r.room_number]) || []);

  // Get task instance counts for each schedule
  const scheduleIds = schedules?.map(s => s.id) || [];
  const { data: taskCounts } = await supabase
    .from('pm_task_instances')
    .select('pm_schedule_id, status')
    .in('pm_schedule_id', scheduleIds);

  const taskCountMap = (taskCounts || []).reduce((acc, task) => {
    if (!acc[task.pm_schedule_id]) {
      acc[task.pm_schedule_id] = { total: 0, completed: 0, pending: 0, overdue: 0 };
    }
    acc[task.pm_schedule_id].total++;
    if (task.status === 'COMPLETED') acc[task.pm_schedule_id].completed++;
    if (task.status === 'PENDING') acc[task.pm_schedule_id].pending++;
    if (task.status === 'OVERDUE') acc[task.pm_schedule_id].overdue++;
    return acc;
  }, {} as Record<string, any>);

  // Get next due date for each schedule
  const { data: nextDates } = await supabase
    .from('pm_task_instances')
    .select('pm_schedule_id, task_date')
    .in('pm_schedule_id', scheduleIds)
    .in('status', ['PENDING', 'UPCOMING'])
    .order('task_date', { ascending: true });

  const nextDateMap = (nextDates || []).reduce((acc, task) => {
    if (!acc[task.pm_schedule_id]) acc[task.pm_schedule_id] = task.task_date;
    return acc;
  }, {} as Record<string, string>);

  const data: PMScheduleReportRow[] = (schedules || []).map(schedule => {
    const asset = schedule.assets as any;
    const counts = taskCountMap[schedule.id] || { total: 0, completed: 0, pending: 0, overdue: 0 };
    const completionRate = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;

    return {
      asset_code: asset.asset_id,
      asset_name: asset.asset_name,
      category: asset.asset_category || '',
      sub_category: asset.asset_sub_category || '',
      type: asset.asset_type || '',
      location: `${buildingMap.get(asset.building) || ''} - ${floorMap.get(asset.floor_id) || ''} - ${roomMap.get(asset.room_id) || ''}`,
      tenant: tenantMap.get(asset.handover_to) || 'Unassigned',
      pm_start_date: schedule.pm_start_date,
      pm_end_date: schedule.pm_end_date,
      frequency_days: schedule.pm_frequency_days,
      assigned_to: (schedule.users as any)?.name || '',
      total_tasks: counts.total,
      completed_tasks: counts.completed,
      pending_tasks: counts.pending,
      overdue_tasks: counts.overdue,
      schedule_status: schedule.pm_enabled ? 'Active' : 'Inactive',
      completion_rate: Math.round(completionRate),
      next_due_date: nextDateMap[schedule.id] || null,
    };
  });

  const summary: PMScheduleReportSummary = {
    total_schedules: data.length,
    active_schedules: data.filter(d => d.schedule_status === 'Active').length,
    inactive_schedules: data.filter(d => d.schedule_status === 'Inactive').length,
    total_tasks_generated: data.reduce((sum, d) => sum + d.total_tasks, 0),
    overall_completion_rate: Math.round(
      data.reduce((sum, d) => sum + d.completion_rate, 0) / (data.length || 1)
    ),
    total_overdue: data.reduce((sum, d) => sum + d.overdue_tasks, 0),
  };

  return {
    data,
    summary,
    filters,
    generated_at: new Date().toISOString(),
  };
}

// PM Task Report
export async function getPMTaskReport(
  filters: PMReportFilters
): Promise<PMReportResponse<PMTaskReportRow, PMTaskReportSummary>> {
  let query = supabase
    .from('pm_task_instances')
    .select(`
      id,
      task_date,
      status,
      completed_at,
      notes,
      assigned_to,
      completed_by,
      audit_id,
      assets!inner (
        id,
        asset_id,
        asset_name,
        asset_category,
        building,
        floor_id,
        room_id,
        handover_to,
        status
      ),
      assigned_user:users!pm_task_instances_assigned_to_fkey (name),
      completed_user:users!pm_task_instances_completed_by_fkey (name)
    `)
    .gte('task_date', filters.dateRange.startDate)
    .lte('task_date', filters.dateRange.endDate);

  query = buildFilterQuery(query, filters, 'assets');
  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

  if (filters.exceptionMode) {
    query = query.eq('status', 'OVERDUE');
  }

  const { data: tasks, error } = await query;
  if (error) throw error;

  // Fetch related data separately
  const tenantIds = [...new Set(tasks?.map(t => (t.assets as any).handover_to).filter(Boolean))];
  const buildingIds = [...new Set(tasks?.map(t => (t.assets as any).building).filter(Boolean))];
  const floorIds = [...new Set(tasks?.map(t => (t.assets as any).floor_id).filter(Boolean))];
  const roomIds = [...new Set(tasks?.map(t => (t.assets as any).room_id).filter(Boolean))];
  const auditIds = tasks?.map(t => t.audit_id).filter(Boolean) || [];

  const [tenantsRes, buildingsRes, floorsRes, roomsRes, auditsRes] = await Promise.all([
    tenantIds.length > 0 ? supabase.from('tenants').select('id, company').in('id', tenantIds) : Promise.resolve({ data: [] }),
    buildingIds.length > 0 ? supabase.from('buildings').select('id, name').in('id', buildingIds) : Promise.resolve({ data: [] }),
    floorIds.length > 0 ? supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds) : Promise.resolve({ data: [] }),
    roomIds.length > 0 ? supabase.from('rooms').select('id, room_number').in('id', roomIds) : Promise.resolve({ data: [] }),
    auditIds.length > 0 ? supabase.from('physical_audits').select('id, audit_result').in('id', auditIds) : Promise.resolve({ data: [] })
  ]);
  
  const tenantMap = new Map(tenantsRes.data?.map(t => [t.id, t.company]) || []);
  const buildingMap = new Map(buildingsRes.data?.map(b => [b.id, b.name]) || []);
  const floorMap = new Map(floorsRes.data?.map(f => [f.id, f.floor_name || f.floor_number]) || []);
  const roomMap = new Map(roomsRes.data?.map(r => [r.id, r.room_number]) || []);
  const auditMap = new Map(auditsRes.data?.map(a => [a.id, a.audit_result]) || []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const data: PMTaskReportRow[] = (tasks || []).map(task => {
    const asset = task.assets as any;
    const taskDate = new Date(task.task_date);
    const completedDate = task.completed_at ? new Date(task.completed_at) : null;

    let daysOverdue = 0;
    if (task.status === 'OVERDUE') {
      daysOverdue = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    let delayDays = null;
    let slaStatus: 'On Time' | 'Delayed' | 'Missed' | 'Pending' = 'Pending';
    if (completedDate) {
      delayDays = Math.floor((completedDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
      slaStatus = delayDays <= 0 ? 'On Time' : 'Delayed';
    } else if (task.status === 'OVERDUE') {
      slaStatus = 'Missed';
    }

    return {
      task_id: task.id,
      asset_code: asset.asset_id,
      asset_name: asset.asset_name,
      category: asset.asset_category || '',
      location: `${buildingMap.get(asset.building) || ''} - ${floorMap.get(asset.floor_id) || ''} - ${roomMap.get(asset.room_id) || ''}`,
      tenant: tenantMap.get(asset.handover_to) || 'Unassigned',
      scheduled_date: task.task_date,
      assigned_to: (task.assigned_user as any)?.name || '',
      status: task.status,
      completed_date: task.completed_at,
      completed_by: (task.completed_user as any)?.name || null,
      days_overdue: daysOverdue,
      delay_days: delayDays,
      sla_status: slaStatus,
      audit_result: task.audit_id ? auditMap.get(task.audit_id) || null : null,
      notes: task.notes,
    };
  });

  const completedTasks = data.filter(d => d.status === 'COMPLETED');
  const avgDelay = completedTasks.length > 0
    ? completedTasks.reduce((sum, d) => sum + (d.delay_days || 0), 0) / completedTasks.length
    : 0;

  const summary: PMTaskReportSummary = {
    total_tasks: data.length,
    completed: data.filter(d => d.status === 'COMPLETED').length,
    pending: data.filter(d => d.status === 'PENDING').length,
    overdue: data.filter(d => d.status === 'OVERDUE').length,
    upcoming: data.filter(d => d.status === 'UPCOMING').length,
    completion_percentage: Math.round((data.filter(d => d.status === 'COMPLETED').length / (data.length || 1)) * 100),
    average_delay_days: Math.round(avgDelay * 10) / 10,
    on_time_count: data.filter(d => d.sla_status === 'On Time').length,
    delayed_count: data.filter(d => d.sla_status === 'Delayed').length,
  };

  return {
    data,
    summary,
    filters,
    generated_at: new Date().toISOString(),
  };
}

// PM Audit Report
export async function getPMAuditReport(
  filters: PMReportFilters
): Promise<PMReportResponse<PMAuditReportRow, PMAuditReportSummary>> {
  let query = supabase
    .from('physical_audits')
    .select(`
      id,
      audit_date,
      asset_found,
      location_match,
      tenant_match,
      serial_match,
      condition,
      audit_result,
      gps_latitude,
      gps_longitude,
      remarks,
      asset_id,
      users!physical_audits_auditor_id_fkey (name)
    `)
    .gte('audit_date', filters.dateRange.startDate)
    .lte('audit_date', filters.dateRange.endDate);

  const { data: audits, error } = await query;
  if (error) throw error;

  const assetIds = [...new Set((audits || []).map(a => a.asset_id))];
  let assetQuery = supabase
    .from('assets')
    .select(`
      id,
      asset_id,
      asset_name,
      asset_category,
      building,
      floor_id,
      room_id,
      handover_to,
      status
    `)
    .in('id', assetIds);

  assetQuery = buildFilterQuery(assetQuery, filters);

  const { data: assets } = await assetQuery;
  const assetMap = (assets || []).reduce((acc, asset) => {
    acc[asset.id] = asset;
    return acc;
  }, {} as Record<string, any>);

  // Fetch related data separately
  const tenantIds = [...new Set(assets?.map(a => a.handover_to).filter(Boolean))];
  const buildingIds = [...new Set(assets?.map(a => a.building).filter(Boolean))];
  const floorIds = [...new Set(assets?.map(a => a.floor_id).filter(Boolean))];
  const roomIds = [...new Set(assets?.map(a => a.room_id).filter(Boolean))];

  const [tenantsRes, buildingsRes, floorsRes, roomsRes] = await Promise.all([
    tenantIds.length > 0 ? supabase.from('tenants').select('id, company').in('id', tenantIds) : Promise.resolve({ data: [] }),
    buildingIds.length > 0 ? supabase.from('buildings').select('id, name').in('id', buildingIds) : Promise.resolve({ data: [] }),
    floorIds.length > 0 ? supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds) : Promise.resolve({ data: [] }),
    roomIds.length > 0 ? supabase.from('rooms').select('id, room_number').in('id', roomIds) : Promise.resolve({ data: [] })
  ]);
  
  const tenantMap = new Map(tenantsRes.data?.map(t => [t.id, t.company]) || []);
  const buildingMap = new Map(buildingsRes.data?.map(b => [b.id, b.name]) || []);
  const floorMap = new Map(floorsRes.data?.map(f => [f.id, f.floor_name || f.floor_number]) || []);
  const roomMap = new Map(roomsRes.data?.map(r => [r.id, r.room_number]) || []);

  const data: PMAuditReportRow[] = (audits || [])
    .filter(audit => assetMap[audit.asset_id])
    .map(audit => {
      const asset = assetMap[audit.asset_id];
      
      const auditResult: 'PASS' | 'FAIL' = 
        audit.asset_found && audit.location_match && audit.tenant_match && audit.serial_match
          ? 'PASS'
          : 'FAIL';

      let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
      if (!audit.serial_match || !audit.asset_found) riskLevel = 'High';
      else if (!audit.location_match) riskLevel = 'Medium';

      const gpsLocation = audit.gps_latitude && audit.gps_longitude
        ? `${audit.gps_latitude}, ${audit.gps_longitude}`
        : null;

      return {
        audit_id: audit.id,
        audit_date: audit.audit_date,
        asset_code: asset.asset_id,
        asset_name: asset.asset_name,
        category: asset.asset_category || '',
        location: `${buildingMap.get(asset.building) || ''} - ${floorMap.get(asset.floor_id) || ''} - ${roomMap.get(asset.room_id) || ''}`,
        tenant: tenantMap.get(asset.handover_to) || 'Unassigned',
        auditor_name: (audit.users as any)?.name || '',
        asset_found: audit.asset_found,
        location_match: audit.location_match,
        tenant_match: audit.tenant_match,
        serial_match: audit.serial_match,
        condition: audit.condition || '',
        audit_result: auditResult,
        risk_level: riskLevel,
        gps_location: gpsLocation,
        remarks: audit.remarks,
      };
    });

  if (filters.exceptionMode) {
    const filtered = data.filter(d => d.audit_result === 'FAIL' || d.risk_level === 'High');
    return buildAuditResponse(filtered, filters);
  }

  return buildAuditResponse(data, filters);
}

function buildAuditResponse(
  data: PMAuditReportRow[],
  filters: PMReportFilters
): PMReportResponse<PMAuditReportRow, PMAuditReportSummary> {
  const summary: PMAuditReportSummary = {
    total_audits: data.length,
    passed: data.filter(d => d.audit_result === 'PASS').length,
    failed: data.filter(d => d.audit_result === 'FAIL').length,
    pass_rate: Math.round((data.filter(d => d.audit_result === 'PASS').length / (data.length || 1)) * 100),
    high_risk_count: data.filter(d => d.risk_level === 'High').length,
    medium_risk_count: data.filter(d => d.risk_level === 'Medium').length,
    low_risk_count: data.filter(d => d.risk_level === 'Low').length,
    assets_not_found: data.filter(d => !d.asset_found).length,
    location_mismatches: data.filter(d => !d.location_match).length,
  };

  return {
    data,
    summary,
    filters,
    generated_at: new Date().toISOString(),
  };
}
