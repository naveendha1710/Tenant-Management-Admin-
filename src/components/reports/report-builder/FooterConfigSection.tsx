import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SheetFooterConfig } from '@/store/useReportSheetStore';

interface FooterConfigSectionProps {
  config?: SheetFooterConfig;
  onChange: (config: SheetFooterConfig) => void;
}

export function FooterConfigSection({ config = {}, onChange }: FooterConfigSectionProps) {
  const enabled = config.enabled ?? false;

  const handleToggle = (checked: boolean) => {
    onChange({
      ...config,
      enabled: checked,
      leftText: config.leftText ?? 'Maintenance Incharge',
      leftCentreText: config.leftCentreText ?? 'CISO',
      rightCentreText: config.rightCentreText ?? 'Deputy General Manager',
      rightText: config.rightText ?? 'Client',
    });
  };

  const handleTextChange = (field: keyof SheetFooterConfig, value: string) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-card/50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Custom Footer / Signature Row</h4>
          <p className="text-xs text-muted-foreground">
            Add custom signature text labels across the bottom width of the exported Excel table.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Left Text</Label>
            <Input
              value={config.leftText ?? ''}
              onChange={(e) => handleTextChange('leftText', e.target.value)}
              placeholder="e.g. Maintenance Incharge"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Left Centre Text</Label>
            <Input
              value={config.leftCentreText ?? ''}
              onChange={(e) => handleTextChange('leftCentreText', e.target.value)}
              placeholder="e.g. CISO"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Right Centre Text</Label>
            <Input
              value={config.rightCentreText ?? ''}
              onChange={(e) => handleTextChange('rightCentreText', e.target.value)}
              placeholder="e.g. Deputy General Manager"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Right Text</Label>
            <Input
              value={config.rightText ?? ''}
              onChange={(e) => handleTextChange('rightText', e.target.value)}
              placeholder="e.g. Client"
              className="text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
