import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, ChevronRight, Plus, Save, X, Edit2, Trash2 } from 'lucide-react';

type SubType = { id: string; name: string; code: string };
type Category = { id: string; name: string; code: string; subTypes: SubType[]; manufacturers: string[] };

export default function Configuration() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [idConfig, setIdConfig] = useState({
    structure: 'cat-type-seq',
    separator: '-',
    startValue: '1',
    digits: 4
  });
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadIdConfig();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('dropdown_configs')
        .select('*')
        .eq('entity_type', 'asset')
        .eq('field_name', 'categories')
        .single();
      
      if (!error && data?.config_data) {
        setCategories(data.config_data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          code: cat.code,
          subTypes: (cat.subTypes || []).map((st: any) => ({ id: st.id.toString(), name: st.name, code: st.code })),
          manufacturers: cat.manufacturers || []
        })));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadIdConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('id_configs')
        .select('*')
        .eq('entity_type', 'asset')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setSavedConfigs(data);
        const activeConfig = data.find(c => c.is_active);
        if (activeConfig) {
          setIdConfig({
            structure: activeConfig.structure,
            separator: activeConfig.separator,
            startValue: activeConfig.start_value.toString(),
            digits: activeConfig.digits
          });
        }
      }
    } catch (error) {
      console.log('No active config found');
    }
  };



  const saveIdConfig = async () => {
    try {
      const { error } = await supabase.from('id_configs').insert({
        entity_type: 'asset',
        structure: idConfig.structure,
        separator: idConfig.separator,
        start_value: parseInt(idConfig.startValue),
        digits: idConfig.digits,
        is_active: true
      });

      if (error) throw error;
      
      await loadIdConfig();
      toast({ title: 'Success', description: 'Asset ID configuration saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
    }
  };

  const toggleConfigActive = async (configId: string, currentStatus: boolean) => {
    try {
      await supabase.from('id_configs').update({ is_active: !currentStatus }).eq('id', configId);
      await loadIdConfig();
      toast({ title: 'Success', description: 'Configuration status updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const deleteIdConfig = async (configId: string) => {
    if (!confirm('Delete this configuration?')) return;
    try {
      await supabase.from('id_configs').delete().eq('id', configId);
      await loadIdConfig();
      toast({ title: 'Success', description: 'Configuration deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete configuration', variant: 'destructive' });
    }
  };

  const generatePreview = () => {
    const cat = categories[0];
    const sub = cat?.subTypes[0];
    if (!cat || !sub) return 'ITE-LPT-0001';
    
    const num = idConfig.startValue.padStart(idConfig.digits, '0');
    const sep = idConfig.separator;
    const year = new Date().getFullYear();
    
    switch (idConfig.structure) {
      case 'cat-type-seq': return `${cat.code}${sep}${sub.code}${sep}${num}`;
      case 'cat-year-seq': return `${cat.code}${sep}${year}${sep}${num}`;
      case 'type-seq': return `${sub.code}${sep}${num}`;
      case 'cat-seq': return `${cat.code}${sep}${num}`;
      case 'year-seq': return `${year}${sep}${num}`;
      case 'seq-only': return num;
      default: return `${cat.code}${sep}${sub.code}${sep}${num}`;
    }
  };

  return (
    <DashboardLayout title="Asset ID Configuration" subtitle="Configure automatic asset ID generation">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">ID Generation Rules</h4>
            <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-2 block">Structure</Label>
                      <RadioGroup value={idConfig.structure} onValueChange={(v) => setIdConfig({ ...idConfig, structure: v })}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cat-type-seq" id="cat-type-seq" />
                          <Label htmlFor="cat-type-seq" className="text-sm font-normal cursor-pointer">
                            Category - Sub-Type - Number <span className="text-gray-400">(e.g., ITE-LPT-0001)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cat-year-seq" id="cat-year-seq" />
                          <Label htmlFor="cat-year-seq" className="text-sm font-normal cursor-pointer">
                            Category - Year - Number <span className="text-gray-400">(e.g., ITE-2024-0001)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="type-seq" id="type-seq" />
                          <Label htmlFor="type-seq" className="text-sm font-normal cursor-pointer">
                            Sub-Type - Number <span className="text-gray-400">(e.g., LPT-0001)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cat-seq" id="cat-seq" />
                          <Label htmlFor="cat-seq" className="text-sm font-normal cursor-pointer">
                            Category - Number <span className="text-gray-400">(e.g., ITE-0001)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="year-seq" id="year-seq" />
                          <Label htmlFor="year-seq" className="text-sm font-normal cursor-pointer">
                            Year - Number <span className="text-gray-400">(e.g., 2024-0001)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="seq-only" id="seq-only" />
                          <Label htmlFor="seq-only" className="text-sm font-normal cursor-pointer">
                            Number Only <span className="text-gray-400">(e.g., 0001)</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">Separator</Label>
                        <Select value={idConfig.separator} onValueChange={(v) => setIdConfig({ ...idConfig, separator: v })}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-">Hyphen (-)</SelectItem>
                            <SelectItem value="/">Slash (/)</SelectItem>
                            <SelectItem value="_">Underscore (_)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">Start Value</Label>
                        <Input
                          type="number"
                          value={idConfig.startValue}
                          onChange={(e) => setIdConfig({ ...idConfig, startValue: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">Digits</Label>
                        <Select value={idConfig.digits.toString()} onValueChange={(v) => setIdConfig({ ...idConfig, digits: parseInt(v) })}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 digits (001)</SelectItem>
                            <SelectItem value="4">4 digits (0001)</SelectItem>
                            <SelectItem value="5">5 digits (00001)</SelectItem>
                            <SelectItem value="6">6 digits (000001)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-2 block">Live Preview</Label>
                      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded">
                        <span className="font-mono text-lg font-bold text-blue-600">{generatePreview()}</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={saveIdConfig}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </Button>
                    </div>
            </div>
          </div>
          {savedConfigs.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Saved Configurations</h4>
                    <div className="space-y-2">
                      {savedConfigs.map((config) => {
                        const preview = (() => {
                          const cat = categories[0];
                          const sub = cat?.subTypes[0];
                          if (!cat || !sub) return 'Preview';
                          const num = config.start_value.toString().padStart(config.digits, '0');
                          const sep = config.separator;
                          const year = new Date().getFullYear();
                          switch (config.structure) {
                            case 'cat-type-seq': return `${cat.code}${sep}${sub.code}${sep}${num}`;
                            case 'cat-year-seq': return `${cat.code}${sep}${year}${sep}${num}`;
                            case 'type-seq': return `${sub.code}${sep}${num}`;
                            case 'cat-seq': return `${cat.code}${sep}${num}`;
                            case 'year-seq': return `${year}${sep}${num}`;
                            case 'seq-only': return num;
                            default: return `${cat.code}${sep}${sub.code}${sep}${num}`;
                          }
                        })();
                        return (
                          <div key={config.id} className={`p-4 rounded-lg border ${
                            config.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="font-mono text-lg font-bold text-blue-600 bg-white px-3 py-1 rounded border border-blue-200">
                                    {preview}
                                  </div>
                                  {config.is_active && <Badge className="bg-green-600">Active</Badge>}
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                  <div>
                                    <span className="text-gray-500">Structure:</span>
                                    <span className="ml-2 font-medium text-gray-700">
                                      {config.structure === 'cat-type-seq' && 'Category - Sub-Type - Number'}
                                      {config.structure === 'cat-year-seq' && 'Category - Year - Number'}
                                      {config.structure === 'type-seq' && 'Sub-Type - Number'}
                                      {config.structure === 'cat-seq' && 'Category - Number'}
                                      {config.structure === 'year-seq' && 'Year - Number'}
                                      {config.structure === 'seq-only' && 'Number Only'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Separator:</span>
                                    <span className="ml-2 font-medium text-gray-700">
                                      {config.separator === '-' && 'Hyphen (-)'}
                                      {config.separator === '/' && 'Slash (/)'}
                                      {config.separator === '_' && 'Underscore (_)'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Start Value:</span>
                                    <span className="ml-2 font-medium text-gray-700">{config.start_value}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Digits:</span>
                                    <span className="ml-2 font-medium text-gray-700">{config.digits} digits</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Created:</span>
                                    <span className="ml-2 font-medium text-gray-700">
                                      {new Date(config.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button size="sm" variant="outline" onClick={() => toggleConfigActive(config.id, config.is_active)}>
                                  {config.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteIdConfig(config.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
