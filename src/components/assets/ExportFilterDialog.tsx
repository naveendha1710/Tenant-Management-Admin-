import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

interface ExportFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (filters: ExportFilters) => Promise<void>;
}

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  subCategory?: string;
  subType?: string;
  status?: string;
  condition?: string;
  building?: string;
  floor?: string;
  manufacturer?: string;
}

export default function ExportFilterDialog({ open, onOpenChange, onExport }: ExportFilterDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<Array<{ id: string; name: string }>>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<ExportFilters>({});

  useEffect(() => {
    if (open) {
      loadDropdownData();
    }
  }, [open]);

  const loadDropdownData = async () => {
    const [categoriesRes, buildingsRes, manufacturersRes] = await Promise.all([
      supabase.from('form_dropdowns').select('name').eq('form_type', 'asset').order('name'),
      supabase.from('buildings').select('id, name').order('name'),
      supabase.from('form_options').select('name').eq('form_type', 'asset').eq('option_type', 'manufacturer').order('name')
    ]);

    if (categoriesRes.data) setCategories(categoriesRes.data.map(c => c.name));
    if (buildingsRes.data) setBuildings(buildingsRes.data);
    if (manufacturersRes.data) setManufacturers(manufacturersRes.data.map(m => m.name));
  };

  const loadSubCategories = async (category: string) => {
    // First get the category ID
    const { data: catData } = await supabase
      .from('form_dropdowns')
      .select('id')
      .eq('form_type', 'asset')
      .eq('name', category)
      .single();
    
    if (!catData) return;
    
    const { data } = await supabase
      .from('form_subcategories')
      .select('name')
      .eq('form_type', 'asset')
      .eq('category_id', catData.id)
      .order('name');
    if (data) setSubCategories(data.map(c => c.name));
  };

  const loadSubTypes = async (subCategory: string) => {
    // First get the subcategory ID
    const { data: subData } = await supabase
      .from('form_subcategories')
      .select('id')
      .eq('form_type', 'asset')
      .eq('name', subCategory)
      .single();
    
    if (!subData) return;
    
    const { data } = await supabase
      .from('form_sub_subcategories')
      .select('name')
      .eq('form_type', 'asset')
      .eq('subcategory_id', subData.id)
      .order('name');
    if (data) setSubTypes(data.map(c => c.name));
  };

  const loadFloors = async (buildingId: string) => {
    const { data } = await supabase
      .from('floors')
      .select('floor_name')
      .eq('building_id', buildingId)
      .order('floor_name');
    if (data) setFloors(data.map(f => f.floor_name));
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport(filters);
      onOpenChange(false);
      setFilters({});
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Asset Report</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Asset Type</Label>
            <Select 
              value={filters.category} 
              onValueChange={(v) => {
                const newCategory = v === 'all' ? undefined : v;
                setFilters({ ...filters, category: newCategory, subCategory: undefined, subType: undefined });
                setSubCategories([]);
                setSubTypes([]);
                if (newCategory) loadSubCategories(newCategory);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Asset Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Types</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subCategory">Category</Label>
            <Select 
              value={filters.subCategory} 
              onValueChange={(v) => {
                const newSubCategory = v === 'all' ? undefined : v;
                setFilters({ ...filters, subCategory: newSubCategory, subType: undefined });
                setSubTypes([]);
                if (newSubCategory) loadSubTypes(newSubCategory);
              }}
              disabled={!filters.category}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {subCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subType">Sub Category</Label>
            <Select 
              value={filters.subType} 
              onValueChange={(v) => setFilters({ ...filters, subType: v === 'all' ? undefined : v })}
              disabled={!filters.subCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Sub Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub Categories</SelectItem>
                {subTypes.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Asset Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v })}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Idle">Idle</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Scrap">Scrap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select value={filters.condition} onValueChange={(v) => setFilters({ ...filters, condition: v === 'all' ? undefined : v })}>
              <SelectTrigger>
                <SelectValue placeholder="All Conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
                <SelectItem value="Damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Select value={filters.manufacturer} onValueChange={(v) => setFilters({ ...filters, manufacturer: v === 'all' ? undefined : v })}>
              <SelectTrigger>
                <SelectValue placeholder="All Manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map(mfr => (
                  <SelectItem key={mfr} value={mfr}>{mfr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="building">Building</Label>
            <Select 
              value={filters.building} 
              onValueChange={(v) => {
                const newBuilding = v === 'all' ? undefined : v;
                setFilters({ ...filters, building: newBuilding, floor: undefined });
                setFloors([]);
                if (newBuilding) loadFloors(newBuilding);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map(bldg => (
                  <SelectItem key={bldg.id} value={bldg.id}>{bldg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="floor">Floor</Label>
            <Select 
              value={filters.floor} 
              onValueChange={(v) => setFilters({ ...filters, floor: v === 'all' ? undefined : v })}
              disabled={!filters.building}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map(floor => (
                  <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear} disabled={loading}>
            Clear Filters
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
