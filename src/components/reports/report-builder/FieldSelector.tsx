import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getFieldsByCategory } from '@/utils/reports/reportFieldRegistry';
import { getHelpdeskFieldsByCategory } from '@/utils/reports/helpdeskReportFields';
import { useTenantReportFieldDefinitions } from '@/components/reports/shared/useTenantReportFieldDefinitions';
import { ReportType } from '@/types/report';

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  reportType: ReportType;
}

export function FieldSelector({ selectedFields, onChange, reportType }: FieldSelectorProps) {
  const { fieldsByCategory: tenantFieldsByCategory } = useTenantReportFieldDefinitions(reportType === 'tenant');
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
            <h3 className="font-medium">{category}</h3>
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
      </div>
    </div>
  );
}
