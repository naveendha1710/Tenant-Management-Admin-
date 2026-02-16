import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  shortCode: string;
  subTypes: SubCategory[];
  manufacturers: string[];
}

interface SubCategory {
  id: string;
  name: string;
  shortCode: string;
}

type TabType = 'categories' | 'subcategories' | 'manufacturers' | 'asset_status' | 'sez_status' | 'customs_category' | 'general_charges' | 'service_charges';

export default function MasterSettings() {
  const [searchParams] = useSearchParams();
  const formType = searchParams.get('tab') || 'asset';
  const section = searchParams.get('section');
  
  const getInitialTab = (): TabType => {
    if (formType === 'tenant') {
      return section === 'service_charges' ? 'service_charges' : 'general_charges';
    }
    if (section === 'subcategories') return 'subcategories';
    if (section === 'manufacturers') return 'manufacturers';
    if (section === 'asset_status') return 'asset_status';
    if (section === 'sez_status') return 'sez_status';
    if (section === 'customs_category') return 'customs_category';
    return 'categories';
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    parentCategoryId: ''
  });
  const [currentField, setCurrentField] = useState<'name' | 'shortCode'>('name');
  const [addedItems, setAddedItems] = useState<Array<{name: string, shortCode?: string}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    const newTab = getInitialTab();
    setActiveTab(newTab);
  }, [formType, section]);

  const loadData = async () => {
    try {
      if (activeTab === 'categories' || activeTab === 'subcategories' || activeTab === 'manufacturers') {
        const { data: cats, error: catsError } = await supabase
          .from('form_dropdowns')
          .select('*')
          .eq('form_type', 'asset')
          .order('name');

        if (catsError) throw catsError;

        const { data: subs, error: subsError } = await supabase
          .from('form_subcategories')
          .select('*')
          .eq('form_type', 'asset');

        if (subsError) throw subsError;

        const { data: mfrs, error: mfrsError } = await supabase
          .from('form_options')
          .select('*')
          .eq('form_type', 'asset')
          .eq('option_type', 'manufacturer');

        if (mfrsError) throw mfrsError;

        const categoriesData = cats?.map(cat => ({
          id: cat.id,
          name: cat.name,
          shortCode: cat.short_code,
          subTypes: subs?.filter(s => s.category_id === cat.id).map(s => ({
            id: s.id,
            name: s.name,
            shortCode: s.short_code
          })) || [],
          manufacturers: mfrs?.filter(m => m.category_id === cat.id).map(m => m.name) || []
        })) || [];

        setCategories(categoriesData);
      } else {
        const { data, error } = await supabase
          .from('form_dropdowns')
          .select('*')
          .eq('form_type', activeTab)
          .order('name');

        if (error) throw error;

        const simpleData = data?.map(item => ({
          id: item.id,
          name: item.name,
          shortCode: item.short_code,
          subTypes: [],
          manufacturers: []
        })) || [];

        setCategories(simpleData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    await loadData();
    toast({ title: 'Success', description: 'Changes saved successfully' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentField === 'name' && formData.name.trim()) {
        if (activeTab === 'manufacturers' || activeTab === 'general_charges' || activeTab === 'service_charges') {
          setAddedItems([...addedItems, { name: formData.name }]);
          setFormData({ ...formData, name: '' });
        } else {
          setCurrentField('shortCode');
        }
      } else if (currentField === 'shortCode' && formData.shortCode.trim()) {
        setAddedItems([...addedItems, { name: formData.name, shortCode: formData.shortCode }]);
        setFormData({ ...formData, name: '', shortCode: '' });
        setCurrentField('name');
      }
    }
  };

  const handleSaveAll = async () => {
    try {
      if (activeTab === 'categories') {
        const { error } = await supabase.from('form_dropdowns').insert(
          addedItems.map(i => ({ form_type: 'asset', name: i.name, short_code: i.shortCode?.toUpperCase() }))
        );
        if (error) throw error;
      } else if (activeTab === 'subcategories') {
        const { error } = await supabase.from('form_subcategories').insert(
          addedItems.map(i => ({ form_type: 'asset', name: i.name, short_code: i.shortCode?.toUpperCase(), category_id: formData.parentCategoryId }))
        );
        if (error) throw error;
      } else if (activeTab === 'general_charges' || activeTab === 'service_charges') {
        const { error } = await supabase.from('form_dropdowns').insert(
          addedItems.map(i => ({ form_type: activeTab, name: i.name }))
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from('form_options').insert(
          addedItems.map(i => ({ form_type: 'asset', option_type: 'manufacturer', name: i.name, category_id: formData.parentCategoryId }))
        );
        if (error) throw error;
      }

      await saveData();
      setAddedItems([]);
      setFormData({ name: '', shortCode: '', parentCategoryId: '' });
      setCurrentField('name');
      setIsDialogOpen(false);
      toast({ title: 'Success', description: `${addedItems.length} items added` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save items', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, parentId?: string) => {
    try {
      if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges') {
        const { error } = await supabase.from('form_dropdowns').delete().eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'subcategories') {
        const { error } = await supabase.from('form_subcategories').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('form_options').delete().eq('id', id);
        if (error) throw error;
      }
      
      await saveData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  };

  const getFilteredSubCategories = () => {
    if (filterCategory === 'all') {
      return categories.flatMap(cat => 
        cat.subTypes.map(sub => ({ ...sub, parentCategory: cat.name, parentId: cat.id }))
      );
    }
    const cat = categories.find(c => c.id === filterCategory);
    return cat ? cat.subTypes.map(sub => ({ ...sub, parentCategory: cat.name, parentId: cat.id })) : [];
  };

  const getFilteredManufacturers = () => {
    if (filterCategory === 'all') {
      return categories.flatMap(cat => 
        cat.manufacturers.map(mfr => ({ name: mfr, parentCategory: cat.name, parentId: cat.id }))
      );
    }
    const cat = categories.find(c => c.id === filterCategory);
    return cat ? cat.manufacturers.map(mfr => ({ name: mfr, parentCategory: cat.name, parentId: cat.id })) : [];
  };

  const getCurrentPageData = () => {
    let data: any[] = [];
    if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges') {
      data = categories;
    } else if (activeTab === 'subcategories') {
      data = getFilteredSubCategories();
    } else {
      data = getFilteredManufacturers();
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const getTotalPages = () => {
    let total = 0;
    if (activeTab === 'categories') total = categories.length;
    else if (activeTab === 'subcategories') total = getFilteredSubCategories().length;
    else total = getFilteredManufacturers().length;
    return Math.ceil(total / itemsPerPage);
  };

  if (loading) {
    return (
      <DashboardLayout title="Master Settings" subtitle="Asset Form Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Master Settings" subtitle={formType === 'tenant' ? 'Tenant Form Configuration' : 'Asset Form Configuration'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Master Settings</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{formType === 'tenant' ? 'Tenant Form Configuration' : 'Asset Form Configuration'}</span>
          </div>
        </div>

        {/* Filter & Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Filter Dropdown */}
            {activeTab !== 'categories' && activeTab !== 'asset_status' && activeTab !== 'sez_status' && activeTab !== 'customs_category' && activeTab !== 'general_charges' && activeTab !== 'service_charges' && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Add {activeTab === 'categories' ? 'Categories' : 
                       activeTab === 'subcategories' ? 'Sub-Categories' : 
                       activeTab === 'manufacturers' ? 'Manufacturers' :
                       activeTab === 'general_charges' ? 'General Charges' :
                       activeTab === 'service_charges' ? 'Service Charges' : activeTab.replace('_', ' ')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {activeTab !== 'categories' && (
                  <div className="space-y-2">
                    <Label>Parent Category</Label>
                    <Select value={formData.parentCategoryId} onValueChange={(v) => setFormData({...formData, parentCategoryId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>{currentField === 'name' ? 'Name' : 'Short Code'} (Press Enter)</Label>
                  {currentField === 'name' ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter name and press Enter"
                      autoFocus
                    />
                  ) : (
                    <Input
                      value={formData.shortCode}
                      onChange={(e) => setFormData({...formData, shortCode: e.target.value.toUpperCase()})}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter short code and press Enter"
                      maxLength={3}
                      autoFocus
                    />
                  )}
                </div>

                {addedItems.length > 0 && (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm font-medium mb-2">Added Items ({addedItems.length})</p>
                    <div className="space-y-1">
                      {addedItems.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          {item.name} {item.shortCode && `(${item.shortCode})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleSaveAll} className="w-full" disabled={addedItems.length === 0}>
                  Save All ({addedItems.length})
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short Code
                </th>
                {activeTab === 'categories' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Items
                  </th>
                )}
                {activeTab !== 'categories' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent Category
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === 'categories' && getCurrentPageData().map((cat: Category) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cat.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {cat.shortCode}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {cat.subTypes.length + cat.manufacturers.length}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-right text-sm">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}

              {activeTab === 'subcategories' && getCurrentPageData().map((sub: any) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sub.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {sub.shortCode}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {sub.parentCategory}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-right text-sm">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(sub.id, sub.parentId)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}

              {activeTab === 'manufacturers' && getCurrentPageData().map((mfr: any, idx: number) => (
                <tr key={`${mfr.parentId}-${mfr.name}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mfr.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {mfr.parentCategory}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-right text-sm">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(mfr.name, mfr.parentId)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges') && getCurrentPageData().map((item: Category) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-right text-sm">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {getTotalPages() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, activeTab === 'categories' ? categories.length : activeTab === 'subcategories' ? getFilteredSubCategories().length : getFilteredManufacturers().length)} of {activeTab === 'categories' ? categories.length : activeTab === 'subcategories' ? getFilteredSubCategories().length : getFilteredManufacturers().length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(getTotalPages(), p + 1))}
                disabled={currentPage === getTotalPages()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
