import ExcelJS from 'exceljs';
import { generateChartData, createChartSVG } from './chartGenerator';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string[];
  priority?: string[];
  category?: string[];
  tenant?: string[];
  assignedTo?: string[];
}

export const generateOverallReport = async (tickets: any[], filters: ReportFilters = {}) => {
  const workbook = new ExcelJS.Workbook();
  
  // Filter tickets
  let filteredTickets = tickets.filter(t => {
    // Date filter
    if (filters.startDate || filters.endDate) {
      const ticketDate = new Date(t.created_at);
      ticketDate.setHours(0, 0, 0, 0);
      
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate >= start && ticketDate <= end)) return false;
      } else if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (!(ticketDate >= start)) return false;
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate <= end)) return false;
      }
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(t.status)) return false;
    }
    
    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(t.priority)) return false;
    }
    
    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(t.category)) return false;
    }
    
    // Tenant filter
    if (filters.tenant && filters.tenant.length > 0) {
      if (!filters.tenant.includes(t.tenant?.company_name)) return false;
    }
    
    // Assigned To filter
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      if (!filters.assignedTo.includes(t.assigned_to)) return false;
    }
    
    return true;
  });

  // 1. Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary Report');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const totalTickets = filteredTickets.length;
  const byStatus = {
    pending: filteredTickets.filter(t => t.status === 'pending').length,
    assigned: filteredTickets.filter(t => t.status === 'assigned').length,
    rca_added: filteredTickets.filter(t => t.status === 'rca_added').length,
    pending_approval: filteredTickets.filter(t => t.status === 'pending_approval').length,
    rejected: filteredTickets.filter(t => t.status === 'rejected').length,
    pending_tenant_approval: filteredTickets.filter(t => t.status === 'pending_tenant_approval').length,
    tenant_rejected: filteredTickets.filter(t => t.status === 'tenant_rejected').length,
    approved: filteredTickets.filter(t => t.status === 'approved').length,
    work_started: filteredTickets.filter(t => t.status === 'work_started').length,
    in_progress: filteredTickets.filter(t => t.status === 'in_progress').length,
    work_completed: filteredTickets.filter(t => t.status === 'work_completed').length,
    completed: filteredTickets.filter(t => t.status === 'completed').length,
    resolved: filteredTickets.filter(t => t.status === 'resolved').length,
    reopened: filteredTickets.filter(t => t.status === 'reopened').length,
    closed: filteredTickets.filter(t => t.status === 'closed').length
  };

  const byPriority = {
    low: filteredTickets.filter(t => t.priority?.toLowerCase() === 'low').length,
    medium: filteredTickets.filter(t => t.priority?.toLowerCase() === 'medium').length,
    high: filteredTickets.filter(t => t.priority?.toLowerCase() === 'high').length,
    urgent: filteredTickets.filter(t => t.priority?.toLowerCase() === 'urgent').length
  };

  const byCategory = filteredTickets.reduce((acc: any, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  const totalCost = filteredTickets.reduce((sum, t) => sum + (t.cost || 0), 0);
  const avgCost = totalTickets > 0 ? totalCost / totalTickets : 0;

  const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved' && t.resolved_at && t.created_at);
  const avgResolutionTime = resolvedTickets.length > 0 
    ? resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        return sum + (resolved - created);
      }, 0) / resolvedTickets.length / (1000 * 60 * 60 * 24)
    : 0;

  const reportPeriod = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : filters.startDate 
    ? `From ${filters.startDate}`
    : filters.endDate 
    ? `Until ${filters.endDate}`
    : 'All Time';

  summarySheet.addRows([
    { metric: 'Report Period', value: reportPeriod },
    { metric: '', value: '' },
    { metric: 'OVERALL STATISTICS', value: '' },
    { metric: 'Total Tickets', value: totalTickets },
    { metric: 'Total Cost', value: `₹${totalCost.toFixed(2)}` },
    { metric: 'Average Cost per Ticket', value: `₹${avgCost.toFixed(2)}` },
    { metric: 'Average Resolution Time (days)', value: avgResolutionTime.toFixed(2) },
    { metric: '', value: '' },
    { metric: 'BY STATUS', value: '' },
    { metric: 'Pending', value: byStatus.pending },
    { metric: 'Assigned', value: byStatus.assigned },
    { metric: 'RCA Added', value: byStatus.rca_added },
    { metric: 'Pending Manager Approval', value: byStatus.pending_approval },
    { metric: 'Rejected by Manager', value: byStatus.rejected },
    { metric: 'Pending Tenant Approval', value: byStatus.pending_tenant_approval },
    { metric: 'Rejected by Tenant', value: byStatus.tenant_rejected },
    { metric: 'Approved', value: byStatus.approved },
    { metric: 'Work Started', value: byStatus.work_started },
    { metric: 'In Progress', value: byStatus.in_progress },
    { metric: 'Work Completed', value: byStatus.work_completed },
    { metric: 'Completed', value: byStatus.completed },
    { metric: 'Resolved', value: byStatus.resolved },
    { metric: 'Reopened', value: byStatus.reopened },
    { metric: 'Closed', value: byStatus.closed },
    { metric: '', value: '' },
    { metric: 'BY PRIORITY', value: '' },
    { metric: 'Low', value: byPriority.low },
    { metric: 'Medium', value: byPriority.medium },
    { metric: 'High', value: byPriority.high },
    { metric: 'Urgent', value: byPriority.urgent },
    { metric: '', value: '' },
    { metric: 'BY CATEGORY', value: '' },
    ...Object.entries(byCategory).map(([cat, count]) => ({ metric: cat, value: count }))
  ]);

  summarySheet.getRow(3).font = { bold: true, size: 12 };
  summarySheet.getRow(9).font = { bold: true, size: 12 };
  summarySheet.getRow(26).font = { bold: true, size: 12 };
  summarySheet.getRow(32).font = { bold: true, size: 12 };

  // 2. Detailed Tickets Sheet
  const detailSheet = workbook.addWorksheet('Detailed Tickets');
  detailSheet.columns = [
    { header: 'Ticket ID', key: 'id', width: 15 },
    { header: 'Tenant', key: 'tenant', width: 25 },
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Assigned To', key: 'assigned_to', width: 20 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Created Date', key: 'created_at', width: 18 },
    { header: 'Resolved Date', key: 'resolved_at', width: 18 },
    { header: 'Resolution Time (days)', key: 'resolution_time', width: 20 }
  ];

  filteredTickets.forEach(ticket => {
    const resolutionTime = ticket.resolved_at && ticket.created_at
      ? ((new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24)).toFixed(2)
      : 'N/A';

    detailSheet.addRow({
      id: ticket.id.slice(-8),
      tenant: ticket.tenant?.company_name || 'N/A',
      title: ticket.title,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status.replace(/_/g, ' ').toUpperCase(),
      assigned_to: ticket.assigned_to || 'Unassigned',
      cost: ticket.cost || 0,
      created_at: new Date(ticket.created_at).toLocaleString(),
      resolved_at: ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : 'N/A',
      resolution_time: resolutionTime
    });
  });

  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // 3. Cost Breakdown Sheet
  const costSheet = workbook.addWorksheet('Cost Breakdown');
  costSheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Total Tickets', key: 'count', width: 15 },
    { header: 'Total Cost', key: 'total', width: 15 },
    { header: 'Average Cost', key: 'average', width: 15 }
  ];

  const costByCategory = filteredTickets.reduce((acc: any, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { count: 0, total: 0 };
    }
    acc[t.category].count++;
    acc[t.category].total += t.cost || 0;
    return acc;
  }, {});

  Object.entries(costByCategory).forEach(([category, data]: [string, any]) => {
    costSheet.addRow({
      category,
      count: data.count,
      total: `₹${data.total.toFixed(2)}`,
      average: `₹${(data.total / data.count).toFixed(2)}`
    });
  });

  costSheet.getRow(1).font = { bold: true };
  costSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // 4. Tenant-wise Report Sheet
  const tenantSheet = workbook.addWorksheet('Tenant-wise Report');
  tenantSheet.columns = [
    { header: 'Tenant', key: 'tenant', width: 30 },
    { header: 'Total Tickets', key: 'count', width: 15 },
    { header: 'Pending', key: 'pending', width: 12 },
    { header: 'In Progress', key: 'in_progress', width: 15 },
    { header: 'Resolved', key: 'resolved', width: 12 },
    { header: 'Total Cost', key: 'cost', width: 15 }
  ];

  const tenantData = filteredTickets.reduce((acc: any, t) => {
    const tenant = t.tenant?.company_name || 'N/A';
    if (!acc[tenant]) {
      acc[tenant] = { count: 0, pending: 0, in_progress: 0, resolved: 0, cost: 0 };
    }
    acc[tenant].count++;
    if (t.status === 'pending') acc[tenant].pending++;
    if (['assigned', 'rca_added', 'pending_approval', 'approved', 'work_started', 'in_progress', 'work_completed'].includes(t.status)) acc[tenant].in_progress++;
    if (t.status === 'resolved') acc[tenant].resolved++;
    acc[tenant].cost += t.cost || 0;
    return acc;
  }, {});

  Object.entries(tenantData).forEach(([tenant, data]: [string, any]) => {
    tenantSheet.addRow({
      tenant,
      count: data.count,
      pending: data.pending,
      in_progress: data.in_progress,
      resolved: data.resolved,
      cost: `₹${data.cost.toFixed(2)}`
    });
  });

  tenantSheet.getRow(1).font = { bold: true };
  tenantSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // 5. Performance Metrics Sheet
  const perfSheet = workbook.addWorksheet('Performance Metrics');
  perfSheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  // Technician Performance
  const techPerformance = filteredTickets.reduce((acc: any, t) => {
    if (t.assigned_to) {
      if (!acc[t.assigned_to]) {
        acc[t.assigned_to] = { assigned: 0, completed: 0, avgTime: [] };
      }
      acc[t.assigned_to].assigned++;
      if (t.status === 'resolved' || t.status === 'completed') {
        acc[t.assigned_to].completed++;
        if (t.resolved_at && t.created_at) {
          const time = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
          acc[t.assigned_to].avgTime.push(time);
        }
      }
    }
    return acc;
  }, {});

  // SLA Compliance
  const slaTickets = filteredTickets.filter(t => t.sla_hours && t.work_started_at);
  const slaCompliant = slaTickets.filter(t => {
    if (t.work_completed_at) {
      const duration = (new Date(t.work_completed_at).getTime() - new Date(t.work_started_at).getTime()) / (1000 * 60 * 60);
      return duration <= t.sla_hours;
    }
    return false;
  }).length;
  const slaComplianceRate = slaTickets.length > 0 ? ((slaCompliant / slaTickets.length) * 100).toFixed(2) : '0.00';

  // Approval Rates
  const managerApprovals = filteredTickets.filter(t => ['pending_tenant_approval', 'approved', 'work_started', 'in_progress', 'work_completed', 'completed', 'resolved'].includes(t.status)).length;
  const managerRejections = filteredTickets.filter(t => t.status === 'rejected').length;
  const managerApprovalRate = (managerApprovals + managerRejections) > 0 ? ((managerApprovals / (managerApprovals + managerRejections)) * 100).toFixed(2) : '0.00';

  const tenantApprovals = filteredTickets.filter(t => ['approved', 'work_started', 'in_progress', 'work_completed', 'completed', 'resolved'].includes(t.status)).length;
  const tenantRejections = filteredTickets.filter(t => t.status === 'tenant_rejected').length;
  const tenantApprovalRate = (tenantApprovals + tenantRejections) > 0 ? ((tenantApprovals / (tenantApprovals + tenantRejections)) * 100).toFixed(2) : '0.00';

  perfSheet.addRows([
    { metric: 'PERFORMANCE METRICS', value: '' },
    { metric: '', value: '' },
    { metric: 'SLA COMPLIANCE', value: '' },
    { metric: 'Total Tickets with SLA', value: slaTickets.length },
    { metric: 'SLA Compliant', value: slaCompliant },
    { metric: 'SLA Compliance Rate', value: `${slaComplianceRate}%` },
    { metric: '', value: '' },
    { metric: 'APPROVAL RATES', value: '' },
    { metric: 'Manager Approval Rate', value: `${managerApprovalRate}%` },
    { metric: 'Tenant Approval Rate', value: `${tenantApprovalRate}%` },
    { metric: '', value: '' },
    { metric: 'TECHNICIAN PERFORMANCE', value: '' },
    ...Object.entries(techPerformance).flatMap(([tech, data]: [string, any]) => [
      { metric: `${tech} - Assigned`, value: data.assigned },
      { metric: `${tech} - Completed`, value: data.completed },
      { metric: `${tech} - Avg Resolution Time (days)`, value: data.avgTime.length > 0 ? (data.avgTime.reduce((a: number, b: number) => a + b, 0) / data.avgTime.length).toFixed(2) : 'N/A' }
    ])
  ]);

  perfSheet.getRow(1).font = { bold: true, size: 12 };
  perfSheet.getRow(3).font = { bold: true, size: 12 };
  perfSheet.getRow(8).font = { bold: true, size: 12 };
  perfSheet.getRow(12).font = { bold: true, size: 12 };

  // 6. Trend Analysis Sheet
  const trendSheet = workbook.addWorksheet('Trend Analysis');
  trendSheet.columns = [
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Created', key: 'created', width: 12 },
    { header: 'Resolved', key: 'resolved', width: 12 }
  ];

  const { monthlyTrend } = generateChartData(filteredTickets);
  Object.entries(monthlyTrend).forEach(([month, data]: [string, any]) => {
    trendSheet.addRow({ month, created: data.created, resolved: data.resolved });
  });

  trendSheet.getRow(1).font = { bold: true };
  trendSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Maintenance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const generateVisualReport = async (tickets: any[], filters: ReportFilters = {}) => {
  let filteredTickets = tickets.filter(t => {
    if (filters.startDate || filters.endDate) {
      const ticketDate = new Date(t.created_at);
      ticketDate.setHours(0, 0, 0, 0);
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate >= start && ticketDate <= end)) return false;
      } else if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (!(ticketDate >= start)) return false;
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate <= end)) return false;
      }
    }
    if (filters.status && filters.status.length > 0 && !filters.status.includes(t.status)) return false;
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
    if (filters.category && filters.category.length > 0 && !filters.category.includes(t.category)) return false;
    if (filters.tenant && filters.tenant.length > 0 && !filters.tenant.includes(t.tenant?.company_name)) return false;
    if (filters.assignedTo && filters.assignedTo.length > 0 && !filters.assignedTo.includes(t.assigned_to)) return false;
    return true;
  });

  const reportPeriod = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : filters.startDate 
    ? `From ${filters.startDate}`
    : filters.endDate 
    ? `Until ${filters.endDate}`
    : 'All Time';

  const { statusData, priorityData, categoryData, monthlyTrend } = generateChartData(filteredTickets);
  
  const statusChart = createChartSVG(statusData, 'pie', 'Status Distribution', 500, 400);
  const priorityChart = createChartSVG(priorityData, 'bar', 'Priority Distribution', 500, 300);
  const categoryChart = createChartSVG(categoryData, 'bar', 'Category Distribution', 500, 300);
  
  const trendData = Object.entries(monthlyTrend).reduce((acc: any, [month, data]: any) => {
    acc[month] = data.created;
    return acc;
  }, {});
  const trendChart = createChartSVG(trendData, 'bar', 'Monthly Ticket Trend', 600, 300);

  const totalTickets = filteredTickets.length;
  const totalCost = filteredTickets.reduce((sum, t) => sum + (t.cost || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Visual Maintenance Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; text-align: center; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; }
        .stat-value { font-size: 36px; font-weight: bold; }
        .stat-label { margin-top: 5px; opacity: 0.9; }
        .charts { margin: 40px 0; }
        .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; page-break-inside: avoid; }
        .chart-container { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
        .full-width { grid-column: 1 / -1; }
        @media print { .chart-row { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Visual Maintenance Report</h1>
        <p><strong>Report Period:</strong> ${reportPeriod}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <div class="summary">
        <div class="stat-card">
          <div class="stat-value">${totalTickets}</div>
          <div class="stat-label">Total Tickets</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-value">₹${totalCost.toLocaleString()}</div>
          <div class="stat-label">Total Cost</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-value">₹${totalTickets > 0 ? (totalCost / totalTickets).toFixed(0) : '0'}</div>
          <div class="stat-label">Avg Cost/Ticket</div>
        </div>
      </div>

      <div class="charts">
        <div class="chart-row">
          <div class="chart-container">${statusChart}</div>
          <div class="chart-container">${priorityChart}</div>
        </div>
        <div class="chart-row">
          <div class="chart-container">${categoryChart}</div>
          <div class="chart-container full-width">${trendChart}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generatePDFReport = async (tickets: any[], filters: ReportFilters = {}) => {
  let filteredTickets = tickets.filter(t => {
    if (filters.startDate || filters.endDate) {
      const ticketDate = new Date(t.created_at);
      ticketDate.setHours(0, 0, 0, 0);
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate >= start && ticketDate <= end)) return false;
      } else if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (!(ticketDate >= start)) return false;
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate <= end)) return false;
      }
    }
    if (filters.status && filters.status.length > 0 && !filters.status.includes(t.status)) return false;
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
    if (filters.category && filters.category.length > 0 && !filters.category.includes(t.category)) return false;
    if (filters.tenant && filters.tenant.length > 0 && !filters.tenant.includes(t.tenant?.company_name)) return false;
    if (filters.assignedTo && filters.assignedTo.length > 0 && !filters.assignedTo.includes(t.assigned_to)) return false;
    return true;
  });

  const reportPeriod = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : filters.startDate 
    ? `From ${filters.startDate}`
    : filters.endDate 
    ? `Until ${filters.endDate}`
    : 'All Time';

  // Calculate stats
  const totalTickets = filteredTickets.length;
  const byStatus = {
    pending: filteredTickets.filter(t => t.status === 'pending').length,
    in_progress: filteredTickets.filter(t => ['assigned', 'rca_added', 'pending_approval', 'approved', 'work_started', 'in_progress', 'work_completed'].includes(t.status)).length,
    resolved: filteredTickets.filter(t => t.status === 'resolved').length
  };
  const totalCost = filteredTickets.reduce((sum, t) => sum + (t.cost || 0), 0);

  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Maintenance Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; color: #1e40af; }
        .stat-label { color: #6b7280; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #2563eb; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:hover { background: #f9fafb; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Maintenance Report</h1>
        <p><strong>Report Period:</strong> ${reportPeriod}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <h2>Summary Statistics</h2>
      <div class="summary">
        <div class="stat-card">
          <div class="stat-value">${totalTickets}</div>
          <div class="stat-label">Total Tickets</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${byStatus.pending}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${byStatus.in_progress}</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${byStatus.resolved}</div>
          <div class="stat-label">Resolved</div>
        </div>
      </div>

      <h2>Cost Summary</h2>
      <div class="summary">
        <div class="stat-card">
          <div class="stat-value">₹${totalCost.toLocaleString()}</div>
          <div class="stat-label">Total Cost</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">₹${totalTickets > 0 ? (totalCost / totalTickets).toFixed(2) : '0.00'}</div>
          <div class="stat-label">Average Cost</div>
        </div>
      </div>

      <h2>Recent Tickets</h2>
      <table>
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Tenant</th>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTickets.slice(0, 20).map(t => `
            <tr>
              <td>#${t.id.slice(-6)}</td>
              <td>${t.tenant?.company_name || 'N/A'}</td>
              <td>${t.title}</td>
              <td>${t.status.replace(/_/g, ' ').toUpperCase()}</td>
              <td>${t.priority}</td>
              <td>₹${(t.cost || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This is an automated report generated by the Maintenance Management System</p>
      </div>
    </body>
    </html>
  `;

  // Create and download PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};


export const generateTenantWiseReport = async (tickets: any[], filters: ReportFilters = {}) => {
  const workbook = new ExcelJS.Workbook();
  
  let filteredTickets = tickets.filter(t => {
    if (filters.startDate || filters.endDate) {
      const ticketDate = new Date(t.created_at);
      ticketDate.setHours(0, 0, 0, 0);
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate >= start && ticketDate <= end)) return false;
      } else if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (!(ticketDate >= start)) return false;
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate <= end)) return false;
      }
    }
    if (filters.status && filters.status.length > 0 && !filters.status.includes(t.status)) return false;
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
    if (filters.category && filters.category.length > 0 && !filters.category.includes(t.category)) return false;
    if (filters.tenant && filters.tenant.length > 0 && !filters.tenant.includes(t.tenant?.company_name)) return false;
    if (filters.assignedTo && filters.assignedTo.length > 0 && !filters.assignedTo.includes(t.assigned_to)) return false;
    return true;
  });

  const tenantGroups = filteredTickets.reduce((acc: any, t) => {
    const tenant = t.tenant?.company_name || 'N/A';
    if (!acc[tenant]) acc[tenant] = [];
    acc[tenant].push(t);
    return acc;
  }, {});

  Object.entries(tenantGroups).forEach(([tenant, tenantTickets]: [string, any]) => {
    const sheet = workbook.addWorksheet(tenant.substring(0, 30));
    
    sheet.addRow(['TENANT SUMMARY']).font = { bold: true, size: 14 };
    sheet.addRow(['Tenant Name', tenant]);
    sheet.addRow(['Total Tickets', tenantTickets.length]);
    sheet.addRow(['Total Cost', `₹${tenantTickets.reduce((sum: number, t: any) => sum + (t.cost || 0), 0).toFixed(2)}`]);
    sheet.addRow(['']);
    
    sheet.addRow(['STATUS BREAKDOWN']).font = { bold: true, size: 12 };
    const statusCount = tenantTickets.reduce((acc: any, t: any) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCount).forEach(([status, count]) => {
      sheet.addRow([status.replace(/_/g, ' ').toUpperCase(), count]);
    });
    sheet.addRow(['']);
    
    sheet.addRow(['PRIORITY BREAKDOWN']).font = { bold: true, size: 12 };
    const priorityCount = tenantTickets.reduce((acc: any, t: any) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {});
    Object.entries(priorityCount).forEach(([priority, count]) => {
      sheet.addRow([priority.toUpperCase(), count]);
    });
    sheet.addRow(['']);
    
    sheet.addRow(['CATEGORY BREAKDOWN']).font = { bold: true, size: 12 };
    const categoryCount = tenantTickets.reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});
    Object.entries(categoryCount).forEach(([category, count]) => {
      sheet.addRow([category, count]);
    });
    sheet.addRow(['']);
    
    sheet.addRow(['MATERIALS USED']).font = { bold: true, size: 12 };
    const materialsHeader = sheet.addRow(['Material', 'Quantity', 'Rate', 'GST%', 'Total Cost']);
    materialsHeader.font = { bold: true };
    materialsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
    
    const allMaterials: any = {};
    tenantTickets.forEach((ticket: any) => {
      if (ticket.resolution_notes) {
        const materialsMatch = ticket.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
        if (materialsMatch) {
          materialsMatch[1].split('\n').forEach((line: string) => {
            const parts = line.split(' | ');
            if (parts.length === 6) {
              const [name, qty, rate, gst, gstAmt, total] = parts;
              if (!allMaterials[name]) {
                allMaterials[name] = { qty: 0, rate, gst, total: 0 };
              }
              allMaterials[name].qty += parseFloat(qty.split(' ')[0]) || 0;
              allMaterials[name].total += parseFloat(total.replace('₹', '')) || 0;
            }
          });
        }
      }
    });
    
    Object.entries(allMaterials).forEach(([name, data]: [string, any]) => {
      sheet.addRow([name, data.qty, data.rate, data.gst, `₹${data.total.toFixed(2)}`]);
    });
    
    const totalMaterialCost = Object.values(allMaterials).reduce((sum: number, m: any) => sum + m.total, 0);
    sheet.addRow(['', '', '', 'TOTAL', `₹${totalMaterialCost.toFixed(2)}`]).font = { bold: true };
    sheet.addRow(['']);
    
    sheet.addRow(['DETAILED TICKETS']).font = { bold: true, size: 12 };
    const detailHeader = sheet.addRow(['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Assigned To', 'Cost', 'Created Date']);
    detailHeader.font = { bold: true };
    detailHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    
    tenantTickets.forEach((ticket: any) => {
      sheet.addRow([
        ticket.id.slice(-8),
        ticket.title,
        ticket.category,
        ticket.priority,
        ticket.status.replace(/_/g, ' ').toUpperCase(),
        ticket.assigned_to || 'Unassigned',
        ticket.cost || 0,
        new Date(ticket.created_at).toLocaleString()
      ]);
    });
    
    sheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 15 },
      { width: 12 },
      { width: 20 },
      { width: 20 },
      { width: 12 },
      { width: 18 }
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tenant_Wise_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};


export const generateTenantWisePDF = async (tickets: any[], filters: ReportFilters = {}) => {
  let filteredTickets = tickets.filter(t => {
    if (filters.startDate || filters.endDate) {
      const ticketDate = new Date(t.created_at);
      ticketDate.setHours(0, 0, 0, 0);
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate >= start && ticketDate <= end)) return false;
      } else if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (!(ticketDate >= start)) return false;
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate <= end)) return false;
      }
    }
    if (filters.status && filters.status.length > 0 && !filters.status.includes(t.status)) return false;
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
    if (filters.category && filters.category.length > 0 && !filters.category.includes(t.category)) return false;
    if (filters.tenant && filters.tenant.length > 0 && !filters.tenant.includes(t.tenant?.company_name)) return false;
    if (filters.assignedTo && filters.assignedTo.length > 0 && !filters.assignedTo.includes(t.assigned_to)) return false;
    return true;
  });

  const tenantGroups = filteredTickets.reduce((acc: any, t) => {
    const tenant = t.tenant?.company_name || 'N/A';
    if (!acc[tenant]) acc[tenant] = [];
    acc[tenant].push(t);
    return acc;
  }, {});

  const reportPeriod = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : filters.startDate 
    ? `From ${filters.startDate}`
    : filters.endDate 
    ? `Until ${filters.endDate}`
    : 'All Time';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tenant-wise Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; text-align: center; }
        .tenant-section { page-break-before: always; margin-top: 40px; }
        .tenant-section:first-child { page-break-before: auto; margin-top: 0; }
        h2 { color: #1e40af; margin-top: 30px; background: #f3f4f6; padding: 10px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; color: #1e40af; }
        .stat-label { color: #6b7280; margin-top: 5px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #2563eb; color: white; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        @media print { .tenant-section { page-break-before: always; } }
      </style>
    </head>
    <body>
      <h1>Tenant-wise Maintenance Report</h1>
      <p style="text-align: center;"><strong>Report Period:</strong> ${reportPeriod} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      
      ${Object.entries(tenantGroups).map(([tenant, tenantTickets]: [string, any]) => {
        const totalCost = tenantTickets.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);
        const pending = tenantTickets.filter((t: any) => t.status === 'pending').length;
        const inProgress = tenantTickets.filter((t: any) => ['assigned', 'in_progress'].includes(t.status)).length;
        const resolved = tenantTickets.filter((t: any) => t.status === 'resolved').length;
        
        return `
          <div class="tenant-section">
            <h2>🏢 ${tenant}</h2>
            <div class="summary">
              <div class="stat-card">
                <div class="stat-value">${tenantTickets.length}</div>
                <div class="stat-label">Total Tickets</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${pending}</div>
                <div class="stat-label">Pending</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${inProgress}</div>
                <div class="stat-label">In Progress</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">₹${totalCost.toLocaleString()}</div>
                <div class="stat-label">Total Cost</div>
              </div>
            </div>
            
            <h3 style="font-size: 14px; margin-top: 20px;">Materials Used</h3>
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>GST%</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const allMaterials: any = {};
                  tenantTickets.forEach((ticket: any) => {
                    if (ticket.resolution_notes) {
                      const materialsMatch = ticket.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                      if (materialsMatch) {
                        materialsMatch[1].split('\n').forEach((line: string) => {
                          const parts = line.split(' | ');
                          if (parts.length === 6) {
                            const [name, qty, rate, gst, gstAmt, total] = parts;
                            if (!allMaterials[name]) {
                              allMaterials[name] = { qty: 0, rate, gst, total: 0 };
                            }
                            allMaterials[name].qty += parseFloat(qty.split(' ')[0]) || 0;
                            allMaterials[name].total += parseFloat(total.replace('₹', '')) || 0;
                          }
                        });
                      }
                    }
                  });
                  const totalMaterialCost = Object.values(allMaterials).reduce((sum: number, m: any) => sum + m.total, 0);
                  return Object.entries(allMaterials).map(([name, data]: [string, any]) => `
                    <tr>
                      <td>${name}</td>
                      <td>${data.qty}</td>
                      <td>${data.rate}</td>
                      <td>${data.gst}</td>
                      <td>₹${data.total.toFixed(2)}</td>
                    </tr>
                  `).join('') + `<tr style="font-weight: bold; background: #f3f4f6;"><td colspan="4" style="text-align: right;">TOTAL</td><td>₹${totalMaterialCost.toFixed(2)}</td></tr>`;
                })()}
              </tbody>
            </table>
            
            <h3 style="font-size: 14px; margin-top: 20px;">Recent Tickets</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                ${tenantTickets.slice(0, 10).map((t: any) => `
                  <tr>
                    <td>#${t.id.slice(-6)}</td>
                    <td>${t.title}</td>
                    <td>${t.category}</td>
                    <td>${t.priority}</td>
                    <td>${t.status.replace(/_/g, ' ').toUpperCase()}</td>
                    <td>${t.assigned_to || 'Unassigned'}</td>
                    <td>₹${(t.cost || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
};

export const generateTenantWiseVisual = async (tickets: any[], filters: ReportFilters = {}) => {
  let filteredTickets = tickets.filter(t => {
    if (filters.startDate || filters.endDate) {
      const ticketDate = new Date(t.created_at);
      ticketDate.setHours(0, 0, 0, 0);
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate >= start && ticketDate <= end)) return false;
      } else if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (!(ticketDate >= start)) return false;
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (!(ticketDate <= end)) return false;
      }
    }
    if (filters.status && filters.status.length > 0 && !filters.status.includes(t.status)) return false;
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
    if (filters.category && filters.category.length > 0 && !filters.category.includes(t.category)) return false;
    if (filters.tenant && filters.tenant.length > 0 && !filters.tenant.includes(t.tenant?.company_name)) return false;
    if (filters.assignedTo && filters.assignedTo.length > 0 && !filters.assignedTo.includes(t.assigned_to)) return false;
    return true;
  });

  const tenantGroups = filteredTickets.reduce((acc: any, t) => {
    const tenant = t.tenant?.company_name || 'N/A';
    if (!acc[tenant]) acc[tenant] = [];
    acc[tenant].push(t);
    return acc;
  }, {});

  const reportPeriod = filters.startDate && filters.endDate 
    ? `${filters.startDate} to ${filters.endDate}`
    : filters.startDate 
    ? `From ${filters.startDate}`
    : filters.endDate 
    ? `Until ${filters.endDate}`
    : 'All Time';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tenant-wise Visual Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { font-size: 42px; font-weight: 700; margin-bottom: 12px; }
        .content { padding: 40px; }
        .tenant-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; margin: 32px 0; }
        .tenant-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 16px; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25); }
        .tenant-card h3 { font-size: 24px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
        .stat { background: rgba(255,255,255,0.2); padding: 16px; border-radius: 12px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: 700; }
        .stat-label { font-size: 12px; opacity: 0.9; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Tenant-wise Analytics</h1>
          <p><strong>Report Period:</strong> ${reportPeriod}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
          <div class="tenant-grid">
            ${Object.entries(tenantGroups).map(([tenant, tenantTickets]: [string, any]) => {
              const totalCost = tenantTickets.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);
              const pending = tenantTickets.filter((t: any) => t.status === 'pending').length;
              const resolved = tenantTickets.filter((t: any) => t.status === 'resolved').length;
              
              return `
                <div class="tenant-card">
                  <h3>🏢 ${tenant}</h3>
                  <div class="stats">
                    <div class="stat">
                      <div class="stat-value">${tenantTickets.length}</div>
                      <div class="stat-label">Total Tickets</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">₹${totalCost.toLocaleString()}</div>
                      <div class="stat-label">Total Cost</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">${pending}</div>
                      <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">${resolved}</div>
                      <div class="stat-label">Resolved</div>
                    </div>
                  </div>
                  <div style="margin-top: 20px; background: rgba(255,255,255,0.15); padding: 16px; border-radius: 12px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Materials Cost</div>
                    <div class="stat-value">₹${(() => {
                      const allMaterials: any = {};
                      tenantTickets.forEach((ticket: any) => {
                        if (ticket.resolution_notes) {
                          const materialsMatch = ticket.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                          if (materialsMatch) {
                            materialsMatch[1].split('\n').forEach((line: string) => {
                              const parts = line.split(' | ');
                              if (parts.length === 6) {
                                const [name, qty, rate, gst, gstAmt, total] = parts;
                                if (!allMaterials[name]) allMaterials[name] = { total: 0 };
                                allMaterials[name].total += parseFloat(total.replace('₹', '')) || 0;
                              }
                            });
                          }
                        }
                      });
                      return Object.values(allMaterials).reduce((sum: number, m: any) => sum + m.total, 0).toFixed(2);
                    })()}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
};
