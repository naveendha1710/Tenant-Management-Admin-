import { useMemo, useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getFieldsByCategory } from '@/utils/reports/reportFieldRegistry';
import { HELPDESK_FIELD_CATEGORIES, getHelpdeskFieldsByCategory } from '@/utils/reports/helpdeskReportFields';
import { supabase } from '@/lib/supabaseClient';
import { ReportType } from '@/types/report';

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  reportType: ReportType;
}

export function FieldSelector({ selectedFields, onChange, reportType }: FieldSelectorProps) {
  const groupedFields = useMemo(() => {
    if (reportType === 'helpdesk') {
      return getHelpdeskFieldsByCategory();
    }
    return getFieldsByCategory();
  }, [reportType]);
  
  const [assetsColumns, setAssetsColumns] = useState<string[]>([]);
  const [onlyTableFields, setOnlyTableFields] = useState<boolean>(true);

  useEffect(() => {
    if (reportType === 'asset') {
      const loadColumns = async () => {
        try {
          const { data, error } = await supabase.from('assets').select('*').limit(1);
          if (error) throw error;

          if (data && data.length > 0) {
            setAssetsColumns(Object.keys(data[0]));
          } else {
            // fallback: if table empty, allow all known registry fields
            const allKeys = Object.values(groupedFields).flat().map((f) => f.key);
            setAssetsColumns(allKeys);
          }
        } catch (err) {
          // On error, fall back to all registry fields so UI remains usable
          const allKeys = Object.values(groupedFields).flat().map((f) => f.key);
          setAssetsColumns(allKeys);
        }
      };

      loadColumns();
    } else {
      setAssetsColumns([]);
    }
  }, [groupedFields, reportType]);

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