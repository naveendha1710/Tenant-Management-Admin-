import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSET_REPORT_FIELDS } from '@/utils/reports/reportFieldRegistry';

interface SortSelectorProps {
  value?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  onChange: (value?: { field: string; direction: 'asc' | 'desc' }) => void;
}

export function SortSelector({ value, onChange }: SortSelectorProps) {
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
            {ASSET_REPORT_FIELDS.map((field) => (
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
