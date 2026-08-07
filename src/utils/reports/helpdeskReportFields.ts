import { ReportFieldDefinition } from './reportFieldRegistry';

export const HELPDESK_REPORT_FIELDS: ReportFieldDefinition[] = [
  { key: 'ticket_number', label: 'Ticket No', category: 'General', type: 'text' },
  { key: 'created_at', label: 'Date', category: 'General', type: 'date' },
  { key: 'tenant', label: 'Tenant', category: 'General', type: 'text' },
  { key: 'target_date', label: 'Target Date', category: 'General', type: 'date' },
  { key: 'resolved_at', label: 'Resolved At', category: 'General', type: 'date' },
  { key: 'safety_risk', label: 'Safety Risk', category: 'General', type: 'status' },
  { key: 'previous_occurrence', label: 'Previous Occurrence', category: 'General', type: 'status' },
  { key: 'sla_deadline', label: 'SLA Deadline', category: 'General', type: 'date' },
  { key: 'category', label: 'Category', category: 'Classification', type: 'text' },
  { key: 'sub_category', label: 'Sub Category', category: 'Classification', type: 'text' },
  { key: 'priority', label: 'Priority', category: 'Classification', type: 'text' },
  { key: 'status', label: 'Status', category: 'Classification', type: 'status' },
  
  { key: 'building', label: 'Building', category: 'Location', type: 'text' },
  { key: 'floor', label: 'Floor', category: 'Location', type: 'text' },
  { key: 'room', label: 'Room', category: 'Location', type: 'text' },
  
  { key: 'assigned_to', label: 'Assigned To', category: 'General', type: 'text' },
  { key: 'description', label: 'Work Description', category: 'Maintenance', type: 'text' },
  
  { key: 'work_hours', label: 'Hours', category: 'Maintenance', type: 'number' },
  { key: 'num_labourers', label: 'No Of Labours', category: 'Maintenance', type: 'number' },
  { key: 'total_hours', label: 'Total Hours', category: 'Maintenance', type: 'number' },
  { key: 'labor_cost', label: 'Labour Cost', category: 'Financial', type: 'currency' },
  
  { key: 'materials_used', label: 'Materials Used', category: 'Maintenance', type: 'text' },
  { key: 'material_name', label: 'Material Name', category: 'Maintenance', type: 'text' },
  { key: 'material_qty', label: 'Qty', category: 'Maintenance', type: 'number' },
  { key: 'material_unit', label: 'Unit', category: 'Maintenance', type: 'text' },
  { key: 'material_rate', label: 'Rate', category: 'Maintenance', type: 'currency' },
  { key: 'material_gst_percent', label: 'GST %', category: 'Maintenance', type: 'number' },
  { key: 'material_amount', label: 'Amount', category: 'Maintenance', type: 'currency' },
  
  { key: 'material_cost_without_gst', label: 'Material Cost', category: 'Financial', type: 'currency' },
  { key: 'total_gst', label: '18% GST', category: 'Financial', type: 'currency' },
  { key: 'ticket_total_amount', label: 'Ticket Total Amount', category: 'Financial', type: 'currency' },
  
  { key: 'root_cause', label: 'Root Cause', category: 'Maintenance', type: 'text' },
  { key: 'findings', label: 'Findings', category: 'Maintenance', type: 'text' },
  
  { key: 'tenant_satisfaction', label: 'Tenant Satisfaction', category: 'General', type: 'status' },
  { key: 'creator_satisfaction', label: 'Creator Satisfaction', category: 'General', type: 'status' },
  
  { key: 'opex_code', label: 'OPEX Code', category: 'Financial', type: 'text' },
  
  { key: 'created_by', label: 'Created By', category: 'General', type: 'text' },
  { key: 'updated_by', label: 'Updated By', category: 'General', type: 'text' },
  { key: 'updated_at', label: 'Updated At', category: 'General', type: 'date' },
];

export const HELPDESK_FIELD_CATEGORIES = Array.from(
  new Set(HELPDESK_REPORT_FIELDS.map((field) => field.category))
);

export const getHelpdeskFieldsByCategory = () => {
  return HELPDESK_REPORT_FIELDS.reduce<Record<string, ReportFieldDefinition[]>>(
    (acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    },
    {}
  );
};

export const normalizeHelpdeskFieldKey = (key: string) => {
  const aliases: Record<string, string> = {
    ticket_no: 'ticket_number',
    ticketNo: 'ticket_number',
    ticketNumber: 'ticket_number',
    createdAt: 'created_at',
    targetDate: 'target_date',
    resolvedAt: 'resolved_at',
    safetyRisk: 'safety_risk',
    previousOccurrence: 'previous_occurrence',
    slaDeadline: 'sla_deadline',
    subCategory: 'sub_category',
    sub_category: 'sub_category',
    assignedTo: 'assigned_to',
    workHours: 'work_hours',
    numLabourers: 'num_labourers',
    totalHours: 'total_hours',
    laborCost: 'labor_cost',
    material_name: 'material_name',
    materialName: 'material_name',
    material_qty: 'material_qty',
    materialQty: 'material_qty',
    material_unit: 'material_unit',
    materialUnit: 'material_unit',
    material_rate: 'material_rate',
    materialRate: 'material_rate',
    material_gst_percent: 'material_gst_percent',
    materialGstPercent: 'material_gst_percent',
    material_amount: 'material_amount',
    materialAmount: 'material_amount',
    materialCostWithoutGst: 'material_cost_without_gst',
    totalGst: 'total_gst',
    ticket_total_amount: 'ticket_total_amount',
    ticketTotalAmount: 'ticket_total_amount',
    total_amount: 'ticket_total_amount',
    totalAmount: 'ticket_total_amount',
    materialCostWithGst: 'material_cost_without_gst',
    rootCause: 'root_cause',
    resolutionNotes: 'resolution_notes',
    tenantSatisfaction: 'tenant_satisfaction',
    creatorSatisfaction: 'creator_satisfaction',
    opexCode: 'opex_code',
    createdBy: 'created_by',
    updatedBy: 'updated_by',
    updatedAt: 'updated_at',
  };
  return aliases[key] || key;
};

export const normalizeHelpdeskFields = (fields: string[] = []) => {
  const normalizedList = (fields || []).map(normalizeHelpdeskFieldKey);
  const hasSplitMaterials = normalizedList.some((f) =>
    ['material_name', 'material_qty', 'material_unit', 'material_rate', 'material_gst_percent', 'material_amount'].includes(f)
  );

  const result: string[] = [];
  normalizedList.forEach((norm) => {
    if (norm === 'materials' || norm === 'materials_used') {
      if (!hasSplitMaterials) {
        result.push('material_name', 'material_qty', 'material_unit', 'material_rate', 'material_gst_percent', 'material_amount');
      }
    } else {
      result.push(norm);
    }
  });
  return Array.from(new Set(result));
};

export const getHelpdeskFieldLabel = (key: string) => {
  const normalizedKey = normalizeHelpdeskFieldKey(key);
  return HELPDESK_REPORT_FIELDS.find((field) => field.key === normalizedKey)?.label || normalizedKey;
};
