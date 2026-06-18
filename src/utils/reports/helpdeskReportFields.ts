import { ReportFieldDefinition } from './reportFieldRegistry';

export const HELPDESK_REPORT_FIELDS: ReportFieldDefinition[] = [
  { key: 'ticket_no', label: 'Ticket No', category: 'General', type: 'text' },
  { key: 'created_at', label: 'Date', category: 'General', type: 'date' },
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
  
  { key: 'materials', label: 'Materials Used', category: 'Maintenance', type: 'text' },
  { key: 'material_cost_without_gst', label: 'Material Cost', category: 'Financial', type: 'currency' },
  { key: 'total_gst', label: '18% GST', category: 'Financial', type: 'currency' },
  { key: 'material_cost_with_gst', label: 'Total Material Amount', category: 'Financial', type: 'currency' },
  
  { key: 'root_cause', label: 'Root Cause', category: 'Maintenance', type: 'text' },
  { key: 'findings', label: 'Findings', category: 'Maintenance', type: 'text' },
  { key: 'resolution_notes', label: 'Resolution Notes', category: 'Maintenance', type: 'text' },
  
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