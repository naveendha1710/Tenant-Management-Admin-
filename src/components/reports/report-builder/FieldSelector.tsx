import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getFieldsByCategory, getFieldLabel } from '@/utils/reports/reportFieldRegistry';
import { getHelpdeskFieldsByCategory, getHelpdeskFieldLabel } from '@/utils/reports/helpdeskReportFields';
import { useTenantReportFieldDefinitions } from '@/components/reports/shared/useTenantReportFieldDefinitions';
import { getTenantFieldLabel } from '@/utils/reports/tenantReportFields';
import { ReportType } from '@/types/report';
import { useReportSheetStore } from '@/store/useReportSheetStore';

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  reportType: ReportType;
  /** Optional sheet identifier – required when updating totals */
  sheetId?: string;
  /** Optional explicit totals array – if not provided we read from the store */
  totalsFor?: string[];
  /** Callback invoked when totals selection changes – if omitted we update the store directly */
  onTotalsChange?: (totals: string[]) => void;
}

export function FieldSelector({
  selectedFields,
  onChange,
  reportType,
  sheetId,
  totalsFor: propTotalsFor,
  onTotalsChange,
}: FieldSelectorProps) {
  // Retrieve sheet totals from store when sheetId is provided and prop not passed
  const storeTotals = useReportSheetStore(
    (state) => sheetId && state.sheets.find((s) => s.id === sheetId)?.totalsFor
  );
  const totalsFor = propTotalsFor ?? storeTotals ?? [];

  // Define which field keys are eligible for summation
  const SUMMABLE_FIELD_KEYS = [
    // Asset report numeric fields
    'asset_value',
    'depreciation_percentage',
    'labor_cost',
    'material_cost_without_gst',
    'total_gst',
    'material_cost_with_gst',
    'work_hours',
    'total_hours',
    'num_labourers',
    // Tenant report numeric/financial fields
    'rent_amount',
    'security_deposit',
    'annual_rent',
    'rent_per_sqft',
    'deposit_per_sqft',
    'maintenance_total',
    'general_total',
    'service_charge_amount',
    'total_monthly_cost',
    'maintenance_charges',
    'general_charges',
    'service_charge',
    'escalations',
    // add more numeric keys as needed
  ];

  // Ensure totals are always a subset of selected fields
  useEffect(() => {
    const validTotals = totalsFor.filter((key) => selectedFields.includes(key));
    if (validTotals.length !== totalsFor.length) {
      // Update via callback or store
      if (onTotalsChange) {
        onTotalsChange(validTotals);
      } else if (sheetId) {
        useReportSheetStore.getState().updateSheetTotals(sheetId, validTotals);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFields, sheetId]);
  const { fieldsByCategory: tenantFieldsByCategory, dynamicFields } = useTenantReportFieldDefinitions(reportType === 'tenant');
  const groupedFields = useMemo(() => {
    if (reportType === 'helpdesk') {
      return getHelpdeskFieldsByCategory();
    }
    if (reportType === 'tenant') {
      return tenantFieldsByCategory;
    }
    return getFieldsByCategory();
  }, [reportType, tenantFieldsByCategory]);

  const toggleField = (fieldKey: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedFields, fieldKey]);
    } else {
      onChange(selectedFields.filter((field) => field !== fieldKey));
    }
  };

  const toggleCategory = (fields: { key: string }[], checked: boolean) => {
    const fieldKeys = fields.map((field) => field.key);
    if (checked) {
      const mergedFields = new Set(selectedFields);
      fieldKeys.forEach((key) => mergedFields.add(key));
      onChange(Array.from(mergedFields));
      return;
    }

    onChange(selectedFields.filter((field) => !fieldKeys.includes(field)));
  };

  const handleTotalToggle = (fieldKey: string, checked: boolean) => {
    const newTotals = checked
      ? Array.from(new Set([...totalsFor, fieldKey]))
      : totalsFor.filter((key) => key !== fieldKey);
    if (onTotalsChange) {
      onTotalsChange(newTotals);
    } else if (sheetId) {
      useReportSheetStore.getState().updateSheetTotals(sheetId, newTotals);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Available Fields</Label>
        <div className="text-sm text-muted-foreground">
          {selectedFields.length} selected
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedFields).map(([category, fields]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">{category}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const allSelected = fields.every((field) =>
                    selectedFields.includes(field.key)
                  );
                  toggleCategory(fields, !allSelected);
                }}
              >
                {fields.every((field) => selectedFields.includes(field.key))
                  ? 'Deselect all'
                  : 'Select all'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.key}`}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={(checked) => toggleField(field.key, !!checked)}
                  />
                  <Label htmlFor={`field-${field.key}`} className="text-sm font-normal">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Totals selection section */}
        {selectedFields.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium">Calculate Totals For</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedFields
                .filter((key) => SUMMABLE_FIELD_KEYS.includes(key))
                .map((key) => {
                  // Resolve label using appropriate registry based on report type
                  let displayLabel: string;
                  if (reportType === 'helpdesk') {
                    displayLabel = getHelpdeskFieldLabel(key);
                  } else if (reportType === 'tenant') {
                    // Use tenant-specific label resolver, providing dynamic fields for charge keys
                    displayLabel = getTenantFieldLabel(key, dynamicFields);
                  } else {
                    displayLabel = getFieldLabel(key);
                  }
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`total-${key}`}
                        checked={totalsFor.includes(key)}
                        onCheckedChange={(checked) =>
                          handleTotalToggle(key, !!checked)
                        }
                      />
                      <Label htmlFor={`total-${key}`} className="text-sm font-normal">
                        {displayLabel}
                      </Label>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
