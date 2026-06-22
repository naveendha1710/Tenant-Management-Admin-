import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSET_REPORT_FIELDS } from '@/utils/reports/reportFieldRegistry';
import { HELPDESK_REPORT_FIELDS } from '@/utils/reports/helpdeskReportFields';
import { TENANT_REPORT_FIELDS } from '@/utils/reports/tenantReportFields';
import { ReportType } from '@/types/report';

interface SortSelectorProps {
  value?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  onChange: (value?: { field: string; direction: 'asc' | 'desc' }) => void;
  reportType: ReportType;
}

export function SortSelector({ value, onChange, reportType }: SortSelectorProps) {
  const helpdeskSortableKeys = new Set([
    'ticket_number',
    'created_at',
    'tenant',
    'target_date',
    'resolved_at',
    'safety_risk',
    'previous_occurrence',
    'sla_deadline',
    'category',
    'sub_category',
    'priority',
    'status',
    'building',
    'floor',
    'room',
    'assigned_to',
    'description',
    'resolution_notes',
    'tenant_satisfaction',
    'creator_satisfaction',
    'opex_code',
    'updated_at',
  ]);
  const tenantSortableKeys = new Set([
    'tenant_id',
    'name',
    'company',
    'email',
    'phone',
    'tenant_status',
    'companygroup',
    'branch_name',
    'branch_type',
    'parent_tenant',
    'is_main_branch',
    'is_gst_company',
    'nextduedate',
    'created_at',
    'updated_at',
    'agreement_row_id',
    'agreement_id',
    'agreement_name',
    'agreement_status',
    'payment_cycle',
    'lease_agreement_date',
    'operation_date',
    'rent_commencement_date',
    'lease_end_date',
    'rent_amount',
    'security_deposit',
    'maintenance_total',
    'general_total',
    'service_charge_amount',
    'total_monthly_cost',
    'agreement_created_at',
    'agreement_updated_at',
  ]);
  const sortableFields = reportType === 'helpdesk'
    ? HELPDESK_REPORT_FIELDS.filter((field) => helpdeskSortableKeys.has(field.key))
    : reportType === 'tenant'
      ? TENANT_REPORT_FIELDS.filter((field) => tenantSortableKeys.has(field.key))
    : ASSET_REPORT_FIELDS;

  return (
    <div className="space-y-2">
      <Label>Sort Order</Label>
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          value={value?.field || 'none'}
          onValueChange={(field) => {
            if (field === 'none') {
              onChange(undefined);
              return;
            }
            onChange({
              field,
              direction: value?.direction || 'asc',
            });
          }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No sorting</SelectItem>
            {sortableFields.map((field) => (
              <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value?.direction || 'asc'}
          onValueChange={(direction) => {
            if (!value?.field) return;
            onChange({ field: value.field, direction: direction as 'asc' | 'desc' });
          }}
          disabled={!value?.field}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
