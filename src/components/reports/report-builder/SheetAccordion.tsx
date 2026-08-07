import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SheetConfig } from '@/store/useReportSheetStore';
import { FieldSelector } from './FieldSelector';
import { SheetFilters } from './SheetFilters';
import { SortSelector } from './SortSelector';
import { FooterConfigSection } from './FooterConfigSection';
import { ReportType } from '@/types/report';

interface ReportBuilderSheetAccordionProps {
  sheets: SheetConfig[];
  onUpdateSheet: (id: string, updates: Partial<SheetConfig>) => void;
  onRemoveSheet: (id: string) => void;
  reportType: ReportType;
}

export function ReportBuilderSheetAccordion({
  sheets,
  onUpdateSheet,
  onRemoveSheet,
  reportType,
}: ReportBuilderSheetAccordionProps) {
  if (sheets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No sheets created yet. Add a sheet to start building your report.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-4">
      {sheets.map((sheet, index) => (
        <AccordionItem value={sheet.id} key={sheet.id} className="rounded-lg border">
          <AccordionTrigger className="px-4 py-3">
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <div className="font-semibold">{sheet.name || `Sheet ${index + 1}`}</div>
                <div className="text-xs text-muted-foreground">
                  {sheet.fields.length} field{sheet.fields.length === 1 ? '' : 's'} selected
                </div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSheet(sheet.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRemoveSheet(sheet.id);
                  }
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 px-4 pb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sheet Name</label>
              <Input
                value={sheet.name || ''}
                placeholder={`Sheet ${index + 1}`}
                onChange={(event) => onUpdateSheet(sheet.id, { name: event.target.value })}
              />
            </div>

            <FieldSelector
              selectedFields={sheet.fields}
              onChange={(fields) => onUpdateSheet(sheet.id, { fields })}
              reportType={reportType}
              sheetId={sheet.id}
              totalsFor={sheet.totalsFor}
              onTotalsChange={(totals) => onUpdateSheet(sheet.id, { totalsFor: totals })}
            />

            <SheetFilters
              filters={sheet.additionalFilters ?? sheet.filters ?? {}}
              onChange={(additionalFilters) =>
                onUpdateSheet(sheet.id, { additionalFilters })
              }
              reportType={reportType}
            />

            <SortSelector
              value={sheet.sortOrder ?? sheet.sort}
              onChange={(sortOrder) => onUpdateSheet(sheet.id, { sortOrder })}
              reportType={reportType}
            />

            <div className="space-y-4 rounded-lg border p-4 bg-card/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Custom Footer / Signature Row</h4>
                  <p className="text-xs text-muted-foreground">
                    Add custom signature text labels across the bottom width of the exported Excel table.
                  </p>
                </div>
                <Switch
                  checked={sheet.footerConfig?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    onUpdateSheet(sheet.id, {
                      footerConfig: {
                        ...(sheet.footerConfig || {}),
                        enabled: checked,
                        leftText: sheet.footerConfig?.leftText ?? 'Maintenance Incharge',
                        leftCentreText: sheet.footerConfig?.leftCentreText ?? 'CISO',
                        rightCentreText: sheet.footerConfig?.rightCentreText ?? 'Deputy General Manager',
                        rightText: sheet.footerConfig?.rightText ?? 'Client',
                      },
                    })
                  }
                />
              </div>

              {(sheet.footerConfig?.enabled ?? false) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Left Text</label>
                    <Input
                      value={sheet.footerConfig?.leftText ?? ''}
                      onChange={(e) =>
                        onUpdateSheet(sheet.id, {
                          footerConfig: {
                            ...(sheet.footerConfig || {}),
                            leftText: (e.target as HTMLInputElement).value,
                          },
                        })
                      }
                      placeholder="e.g. Maintenance Incharge"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Left Centre Text</label>
                    <Input
                      value={sheet.footerConfig?.leftCentreText ?? ''}
                      onChange={(e) =>
                        onUpdateSheet(sheet.id, {
                          footerConfig: {
                            ...(sheet.footerConfig || {}),
                            leftCentreText: (e.target as HTMLInputElement).value,
                          },
                        })
                      }
                      placeholder="e.g. CISO"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Right Centre Text</label>
                    <Input
                      value={sheet.footerConfig?.rightCentreText ?? ''}
                      onChange={(e) =>
                        onUpdateSheet(sheet.id, {
                          footerConfig: {
                            ...(sheet.footerConfig || {}),
                            rightCentreText: (e.target as HTMLInputElement).value,
                          },
                        })
                      }
                      placeholder="e.g. Deputy General Manager"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Right Text</label>
                    <Input
                      value={sheet.footerConfig?.rightText ?? ''}
                      onChange={(e) =>
                        onUpdateSheet(sheet.id, {
                          footerConfig: {
                            ...(sheet.footerConfig || {}),
                            rightText: (e.target as HTMLInputElement).value,
                          },
                        })
                      }
                      placeholder="e.g. Client"
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onRemoveSheet(sheet.id)}>
                Remove Sheet
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
