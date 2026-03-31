import { useState, useEffect, useRef } from 'react';
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
import { Combobox } from '@/components/ui/combobox';

interface SubSubCategory {
  id: string;
  name: string;
  shortCode: string;
  colors?: string[];
  bodies?: string[];
  sizes?: string[];
}

interface SubCategory {
  id: string;
  name: string;
  shortCode: string;
  subTypes?: SubSubCategory[];
}

interface Category {
  id: string;
  name: string;
  shortCode: string;
  subTypes: SubCategory[];
  manufacturers: string[];
}

type TabType = 'categories' | 'subcategories' | 'sub_subcategories' | 'manufacturers' | 'asset_status' | 'sez_status' | 'customs_category' | 'general_charges' | 'service_charges' | 'building_types' | 'amenities' | 'room_categories';

export default function MasterSettings() {
  const [searchParams] = useSearchParams();
  const formType = searchParams.get('tab') || 'asset';
  const section = searchParams.get('section');
  
  const getInitialTab = (): TabType => {
    if (formType === 'tenant') {
      return section === 'service_charges' ? 'service_charges' : 'general_charges';
    }
    if (formType === 'building') {
      return section === 'amenities' ? 'amenities' : section === 'room_categories' ? 'room_categories' : 'building_types';
    }
    if (section === 'subcategories') return 'subcategories';
    if (section === 'sub_subcategories') return 'sub_subcategories';
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
  const [filterSubCategory, setFilterSubCategory] = useState<string>('all');
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    parentCategoryId: '',
    colors: [] as string[],
    bodies: [] as string[],
    sizes: [] as string[]
  });
  const [currentField, setCurrentField] = useState<'name' | 'shortCode' | 'colors' | 'materials' | 'sizes'>('name');
  const [colorInput, setColorInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [addedItems, setAddedItems] = useState<Array<{name: string, shortCode?: string, colors?: string[], bodies?: string[], sizes?: string[]}>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [editingItem, setEditingItem] = useState<{id: string, name: string, shortCode?: string} | null>(null);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<{[key: string]: {name: string, shortCode?: string}}>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [linkedAssets, setLinkedAssets] = useState<{[key: string]: string[]}>({});
  const [showLinkedDialog, setShowLinkedDialog] = useState(false);
  const [currentLinkedAssets, setCurrentLinkedAssets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingColors, setExistingColors] = useState<string[]>([]);
  const [existingBodies, setExistingBodies] = useState<string[]>([]);
  const [existingSizes, setExistingSizes] = useState<string[]>([]);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const shortCodeInputRef = useRef<HTMLInputElement>(null);
  const colorsInputRef = useRef<HTMLInputElement>(null);
  const materialsInputRef = useRef<HTMLInputElement>(null);
  const sizesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    checkLinkedAssets();
  }, [activeTab]);

  useEffect(() => {
    const newTab = getInitialTab();
    setActiveTab(newTab);
  }, [formType, section]);

  const checkLinkedAssets = async () => {
    try {
      const { data: assets } = await supabase.from('assets').select('id, asset_id, asset_type, asset_category, manufacturer, asset_status, sez_status, customs_category');
      if (!assets) return;
      
      const linked: {[key: string]: string[]} = {};
      assets.forEach(asset => {
        if (asset.asset_type) {
          if (!linked[asset.asset_type]) linked[asset.asset_type] = [];
          linked[asset.asset_type].push(asset.asset_id);
        }
        if (asset.asset_category) {
          if (!linked[asset.asset_category]) linked[asset.asset_category] = [];
          linked[asset.asset_category].push(asset.asset_id);
        }
        if (asset.manufacturer) {
          if (!linked[asset.manufacturer]) linked[asset.manufacturer] = [];
          linked[asset.manufacturer].push(asset.asset_id);
        }
        if (asset.asset_status) {
          if (!linked[asset.asset_status]) linked[asset.asset_status] = [];
          linked[asset.asset_status].push(asset.asset_id);
        }
        if (asset.sez_status) {
          if (!linked[asset.sez_status]) linked[asset.sez_status] = [];
          linked[asset.sez_status].push(asset.asset_id);
        }
        if (asset.customs_category) {
          if (!linked[asset.customs_category]) linked[asset.customs_category] = [];
          linked[asset.customs_category].push(asset.asset_id);
        }
      });
      
      setLinkedAssets(linked);
    } catch (error) {
      console.error('Failed to check linked assets:', error);
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'categories' || activeTab === 'subcategories' || activeTab === 'sub_subcategories' || activeTab === 'manufacturers') {
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

        const { data: subSubs, error: subSubsError } = await supabase
          .from('form_sub_subcategories')
          .select('*')
          .eq('form_type', 'asset');

        if (subSubsError) throw subSubsError;

        // Load combinations for sub-subcategories
        const { data: combinations, error: combError } = await supabase
          .from('sub_subcategory_combinations')
          .select('*')
          .eq('is_active', true);

        if (combError) throw combError;

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
            shortCode: s.short_code,
            subTypes: subSubs?.filter(ss => ss.subcategory_id === s.id).map(ss => {
              const ssCombinations = combinations?.filter(c => c.sub_subcategory_id === ss.id) || [];
              const colors = [...new Set(ssCombinations.map(c => c.color).filter(Boolean))];
              const bodies = [...new Set(ssCombinations.map(c => c.material).filter(Boolean))];
              const sizes = [...new Set(ssCombinations.map(c => c.size).filter(Boolean))];
              
              return {
                id: ss.id,
                name: ss.name,
                shortCode: ss.short_code,
                colors,
                bodies,
                sizes
              };
            }) || []
          })) || [],
          manufacturers: mfrs?.filter(m => m.category_id === cat.id).map(m => m.name) || []
        })) || [];

        setCategories(categoriesData);
      } else if (activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') {
        const { data, error } = await supabase
          .from('form_dropdowns')
          .select('*')
          .eq('form_type', activeTab)
          .order('name');

        if (error) throw error;

        const simpleData = data?.map(item => ({
          id: item.id,
          name: item.name,
          shortCode: item.short_code || '',
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentField === 'name' && formData.name.trim()) {
        if (activeTab === 'manufacturers' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities') {
          setAddedItems([...addedItems, { name: formData.name }]);
          setFormData({ ...formData, name: '' });
          setTimeout(() => nameInputRef.current?.focus(), 0);
        } else {
          setCurrentField('shortCode');
          setTimeout(() => shortCodeInputRef.current?.focus(), 0);
        }
      } else if (currentField === 'shortCode' && formData.shortCode.trim()) {
        if (activeTab === 'sub_subcategories') {
          setCurrentField('colors');
          setTimeout(() => colorsInputRef.current?.focus(), 0);
        } else {
          setAddedItems([...addedItems, { name: formData.name, shortCode: formData.shortCode }]);
          setFormData({ ...formData, name: '', shortCode: '' });
          setCurrentField('name');
          setTimeout(() => nameInputRef.current?.focus(), 0);
        }
      } else if (currentField === 'colors' && colorInput.trim()) {
        setFormData({...formData, colors: [...formData.colors, colorInput.trim()]});
        setColorInput('');
      } else if (currentField === 'materials' && materialInput.trim()) {
        setFormData({...formData, bodies: [...formData.bodies, materialInput.trim()]});
        setMaterialInput('');
      } else if (currentField === 'sizes' && sizeInput.trim()) {
        setFormData({...formData, sizes: [...formData.sizes, sizeInput.trim()]});
        setSizeInput('');
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (currentField === 'colors') {
        setCurrentField('materials');
        setColorInput('');
        setTimeout(() => materialsInputRef.current?.focus(), 0);
      } else if (currentField === 'materials') {
        setCurrentField('sizes');
        setMaterialInput('');
        setTimeout(() => sizesInputRef.current?.focus(), 0);
      } else if (currentField === 'sizes') {
        // Add the complete item with all combinations to addedItems
        setAddedItems([...addedItems, { 
          name: formData.name, 
          shortCode: formData.shortCode,
          colors: formData.colors,
          bodies: formData.bodies, 
          sizes: formData.sizes
        }]);
        setFormData({ name: '', shortCode: '', parentCategoryId: formData.parentCategoryId, colors: [], bodies: [], sizes: [] });
        setCurrentField('name');
        setSizeInput('');
        setTimeout(() => nameInputRef.current?.focus(), 0);
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = getCurrentPageData().map((item: any) => {
        if (activeTab === 'manufacturers') {
          return `${item.parentId}-${item.name}`;
        }
        return item.id;
      });
      setSelectedRows(new Set(allIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  const handleBulkEdit = () => {
    if (selectedRows.size === 0) return;
    
    // For sub_subcategories with multiple selections, show error
    if (activeTab === 'sub_subcategories' && selectedRows.size > 1) {
      toast({ title: 'Not Allowed', description: 'Bulk editing is not available for multiple sub-categories. Please edit items individually.', variant: 'destructive' });
      return;
    }
    
    // For sub_subcategories with single selection, open edit dialog
    if (activeTab === 'sub_subcategories') {
      const firstSelectedId = Array.from(selectedRows)[0];
      const item = getCurrentPageData().find((i: any) => i.id === firstSelectedId);
      if (item) {
        handleEdit(item.id, item.name, item.shortCode);
      }
      return;
    }
    
    // For manufacturers, handle special ID format
    if (activeTab === 'manufacturers') {
      const newEditingRows = new Set(editingRows);
      selectedRows.forEach(id => {
        newEditingRows.add(id);
        const item = getCurrentPageData().find((i: any) => `${i.parentId}-${i.name}` === id);
        if (item) {
          setEditValues(prev => ({...prev, [id]: {name: item.name}}));
        }
      });
      setEditingRows(newEditingRows);
      return;
    }
    
    // Original bulk edit for other tabs
    const newEditingRows = new Set(editingRows);
    selectedRows.forEach(id => {
      newEditingRows.add(id);
      const item = getCurrentPageData().find((i: any) => i.id === id);
      if (item) {
        setEditValues(prev => ({...prev, [id]: {name: item.name, shortCode: item.shortCode}}));
      }
    });
    setEditingRows(newEditingRows);
  };

  const handleBulkSave = async () => {
    try {
      for (const id of selectedRows) {
        if (activeTab === 'manufacturers') {
          const values = editValues[id];
          const manufacturerName = id.split('-').pop();
          await supabase.from('form_options').update({ name: values.name }).eq('name', manufacturerName).eq('option_type', 'manufacturer');
        } else {
          await handleInlineUpdate(id);
        }
      }
      setSelectedRows(new Set());
      setEditingRows(new Set());
      await loadData();
      toast({ title: 'Success', description: 'All items updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save all items', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Delete ${selectedRows.size} selected items?`)) return;
    try {
      for (const id of selectedRows) {
        if (activeTab === 'manufacturers') {
          const manufacturerName = id.split('-').pop();
          const { error } = await supabase.from('form_options').delete().eq('name', manufacturerName).eq('option_type', 'manufacturer');
          if (error) throw error;
        } else if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') {
          const { error } = await supabase.from('form_dropdowns').delete().eq('id', id);
          if (error) throw error;
        } else if (activeTab === 'subcategories') {
          const { error } = await supabase.from('form_subcategories').delete().eq('id', id);
          if (error) throw error;
        } else if (activeTab === 'sub_subcategories') {
          const { error } = await supabase.from('form_sub_subcategories').delete().eq('id', id);
          if (error) throw error;
        }
      }
      setSelectedRows(new Set());
      await loadData();
      toast({ title: 'Success', description: `${selectedRows.size} items deleted` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete items', variant: 'destructive' });
    }
  };

  const handleInlineEdit = (id: string, name: string, shortCode?: string) => {
    if (linkedAssets[name]) {
      setCurrentLinkedAssets(linkedAssets[name]);
      setShowLinkedDialog(true);
      return;
    }
    const newSet = new Set(editingRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      setEditValues({...editValues, [id]: {name, shortCode}});
    }
    setEditingRows(newSet);
  };

  const handleInlineUpdate = async (id: string) => {
    try {
      const values = editValues[id];
      if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') {
        const { error } = await supabase.from('form_dropdowns').update({ name: values.name, short_code: values.shortCode?.toUpperCase() }).eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'subcategories') {
        const { error } = await supabase.from('form_subcategories').update({ name: values.name, short_code: values.shortCode?.toUpperCase() }).eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'sub_subcategories') {
        const { error } = await supabase.from('form_sub_subcategories').update({ name: values.name, short_code: values.shortCode?.toUpperCase() }).eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'manufacturers') {
        const manufacturerName = id.split('-').pop();
        const { error } = await supabase.from('form_options').update({ name: values.name }).eq('name', manufacturerName).eq('option_type', 'manufacturer');
        if (error) throw error;
      }
      await loadData();
      const newEditingRows = new Set(editingRows);
      newEditingRows.delete(id);
      setEditingRows(newEditingRows);
      toast({ title: 'Success', description: 'Updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleEdit = async (id: string, name: string, shortCode?: string) => {
    // For linked assets, show special edit dialog that allows adding but not deleting
    if (linkedAssets[name] && activeTab === 'sub_subcategories') {
      setEditingItem({ id, name, shortCode });
      
      // Load existing combinations
      const { data } = await supabase.from('form_sub_subcategories').select('subcategory_id').eq('id', id).single();
      const parentId = data?.subcategory_id || '';
      
      let existingColors: string[] = [];
      let existingBodies: string[] = [];
      let existingSizes: string[] = [];
      
      if (id) {
        const { data: combData } = await supabase
          .from('sub_subcategory_combinations')
          .select('color, material, size')
          .eq('sub_subcategory_id', id)
          .eq('is_active', true);
        
        if (combData) {
          existingColors = [...new Set(combData.map(c => c.color).filter(Boolean))];
          existingBodies = [...new Set(combData.map(c => c.material).filter(Boolean))];
          existingSizes = [...new Set(combData.map(c => c.size).filter(Boolean))];
        }
      }
      
      setExistingColors(existingColors);
      setExistingBodies(existingBodies);
      setExistingSizes(existingSizes);
      
      setFormData({ 
        name, 
        shortCode: shortCode || '', 
        parentCategoryId: parentId, 
        colors: existingColors, 
        bodies: existingBodies, 
        sizes: existingSizes 
      });
      setCurrentField('name');
      setColorInput('');
      setMaterialInput('');
      setSizeInput('');
      setIsDialogOpen(true);
      return;
    }
    
    // Show linked assets dialog for other cases
    if (linkedAssets[name]) {
      setCurrentLinkedAssets(linkedAssets[name]);
      setShowLinkedDialog(true);
      return;
    }
    
    setEditingItem({ id, name, shortCode });
    
    let parentId = '';
    let existingColors: string[] = [];
    let existingBodies: string[] = [];
    let existingSizes: string[] = [];
    
    if (activeTab === 'subcategories') {
      const { data } = await supabase.from('form_subcategories').select('category_id').eq('id', id).single();
      parentId = data?.category_id || '';
    } else if (activeTab === 'sub_subcategories') {
      const { data } = await supabase.from('form_sub_subcategories').select('subcategory_id').eq('id', id).single();
      parentId = data?.subcategory_id || '';
      
      // Load existing combinations only if we have a valid sub_subcategory_id
      let combinations = null;
      if (id) {
        const { data: combData } = await supabase
          .from('sub_subcategory_combinations')
          .select('color, material, size')
          .eq('sub_subcategory_id', id)
          .eq('is_active', true);
        combinations = combData;
      }
      
      if (combinations) {
        existingColors = [...new Set(combinations.map(c => c.color).filter(Boolean))];
        existingBodies = [...new Set(combinations.map(c => c.material).filter(Boolean))];
        existingSizes = [...new Set(combinations.map(c => c.size).filter(Boolean))];
      }
    } else if (activeTab === 'manufacturers') {
      const { data } = await supabase.from('form_options').select('category_id').eq('name', name).single();
      parentId = data?.category_id || '';
    }
    
    setFormData({ name, shortCode: shortCode || '', parentCategoryId: parentId, colors: existingColors, bodies: existingBodies, sizes: existingSizes });
    setCurrentField('name');
    setColorInput('');
    setMaterialInput('');
    setSizeInput('');
    setIsDialogOpen(true);
  };

  const handleSaveAll = async () => {
    try {
      if (editingItem) {
        if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') {
          const { error } = await supabase.from('form_dropdowns').update({ name: formData.name, short_code: formData.shortCode?.toUpperCase() }).eq('id', editingItem.id);
          if (error) throw error;
        } else if (activeTab === 'subcategories') {
          const { error } = await supabase.from('form_subcategories').update({ name: formData.name, short_code: formData.shortCode?.toUpperCase() }).eq('id', editingItem.id);
          if (error) throw error;
        } else if (activeTab === 'sub_subcategories') {
          const { error } = await supabase.from('form_sub_subcategories').update({ name: formData.name, short_code: formData.shortCode?.toUpperCase() }).eq('id', editingItem.id);
          if (error) throw error;
          
          // Update combinations
          await supabase.from('sub_subcategory_combinations').delete().eq('sub_subcategory_id', editingItem.id);
          
          if (formData.colors.length > 0 || formData.bodies.length > 0 || formData.sizes.length > 0) {
            const combinations = [];
            const colors = formData.colors.length > 0 ? formData.colors : [null];
            const materials = formData.bodies.length > 0 ? formData.bodies : [null];
            const sizes = formData.sizes.length > 0 ? formData.sizes : [null];
            
            for (const color of colors) {
              for (const material of materials) {
                for (const size of sizes) {
                  combinations.push({
                    sub_subcategory_id: editingItem.id,
                    color,
                    material,
                    size
                  });
                }
              }
            }
            
            const { error: combError } = await supabase.from('sub_subcategory_combinations').insert(combinations);
            if (combError) throw combError;
          }
        } else {
          const { error } = await supabase.from('form_options').update({ name: formData.name }).eq('name', editingItem.name);
          if (error) throw error;
        }
        await saveData();
        setEditingItem(null);
        setFormData({ name: '', shortCode: '', parentCategoryId: '', colors: [], bodies: [], sizes: [] });
        setIsDialogOpen(false);
        toast({ title: 'Success', description: 'Item updated successfully' });
        return;
      }
      
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
      } else if (activeTab === 'sub_subcategories') {
        // Validate parent category ID before querying
        if (!formData.parentCategoryId) {
          toast({ title: 'Error', description: 'Please select a parent category', variant: 'destructive' });
          return;
        }
        
        // Check for duplicates before inserting
        const existingItems = await supabase
          .from('form_sub_subcategories')
          .select('name, short_code')
          .eq('form_type', 'asset')
          .eq('subcategory_id', formData.parentCategoryId);
        
        const existingNames = new Set(existingItems.data?.map(item => item.name.toLowerCase()) || []);
        const existingCodes = new Set(existingItems.data?.map(item => item.short_code?.toLowerCase()) || []);
        
        const uniqueItems = addedItems.filter(item => 
          !existingNames.has(item.name.toLowerCase()) && 
          !existingCodes.has(item.shortCode?.toLowerCase() || '')
        );
        
        if (uniqueItems.length === 0) {
          toast({ title: 'Warning', description: 'All items already exist', variant: 'destructive' });
          return;
        }
        
        // Insert sub-subcategory
        const { data: insertedItems, error } = await supabase.from('form_sub_subcategories').insert(
          uniqueItems.map(i => ({ 
            form_type: 'asset', 
            name: i.name, 
            short_code: i.shortCode?.toUpperCase(), 
            subcategory_id: formData.parentCategoryId
          }))
        ).select();
        if (error) throw error;
        
        // Generate and insert combinations for each sub-subcategory
        if (insertedItems) {
          const combinations = [];
          for (let i = 0; i < insertedItems.length; i++) {
            const item = insertedItems[i];
            const addedItem = uniqueItems[i];
            
            // Use combinations from the specific added item, or from formData as fallback
            const itemColors = addedItem.colors || formData.colors;
            const itemBodies = addedItem.bodies || formData.bodies;
            const itemSizes = addedItem.sizes || formData.sizes;
            
            if (itemColors.length > 0 || itemBodies.length > 0 || itemSizes.length > 0) {
              const colors = itemColors.length > 0 ? itemColors : [null];
              const materials = itemBodies.length > 0 ? itemBodies : [null];
              const sizes = itemSizes.length > 0 ? itemSizes : [null];
              
              for (const color of colors) {
                for (const material of materials) {
                  for (const size of sizes) {
                    combinations.push({
                      sub_subcategory_id: item.id,
                      color,
                      material,
                      size
                    });
                  }
                }
              }
            }
          }
          
          if (combinations.length > 0) {
            const { error: combError } = await supabase.from('sub_subcategory_combinations').insert(combinations);
            if (combError) throw combError;
          }
        }
        
        if (uniqueItems.length < addedItems.length) {
          toast({ title: 'Partial Success', description: `${uniqueItems.length} items added, ${addedItems.length - uniqueItems.length} duplicates skipped` });
        }
      } else if (activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities') {
        const { error } = await supabase.from('form_dropdowns').insert(
          addedItems.map(i => ({ form_type: activeTab, name: i.name }))
        );
        if (error) throw error;
      } else if (activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'room_categories') {
        const { error } = await supabase.from('form_dropdowns').insert(
          addedItems.map(i => ({ form_type: activeTab, name: i.name, short_code: i.shortCode?.toUpperCase() }))
        );
        if (error) throw error;
      } else if (activeTab === 'manufacturers') {
        const { error } = await supabase.from('form_options').insert(
          addedItems.map(i => ({ form_type: 'asset', option_type: 'manufacturer', name: i.name, category_id: formData.parentCategoryId }))
        );
        if (error) throw error;
      }

      await saveData();
      setAddedItems([]);
      setFormData({ name: '', shortCode: '', parentCategoryId: '', colors: [], bodies: [], sizes: [] });
      setCurrentField('name');
      setIsDialogOpen(false);
      toast({ title: 'Success', description: `${addedItems.length} items added` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save items', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, parentId?: string, itemName?: string) => {
    if (itemName && linkedAssets[itemName]) {
      setCurrentLinkedAssets(linkedAssets[itemName]);
      setShowLinkedDialog(true);
      return;
    }
    
    try {
      if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') {
        const { error } = await supabase.from('form_dropdowns').delete().eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'subcategories') {
        const { error } = await supabase.from('form_subcategories').delete().eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'sub_subcategories') {
        const { error } = await supabase.from('form_sub_subcategories').delete().eq('id', id);
        if (error) throw error;
      } else if (activeTab === 'manufacturers') {
        const manufacturerName = id.split('-').pop();
        const { error } = await supabase.from('form_options').delete().eq('name', manufacturerName).eq('option_type', 'manufacturer');
        if (error) throw error;
      }
      
      await saveData();
      await checkLinkedAssets();
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

  const getFilteredSubSubCategories = () => {
    const allSubs = getFilteredSubCategories();
    if (filterSubCategory === 'all') {
      return allSubs.flatMap(sub => 
        (sub.subTypes || []).map(subsub => ({ ...subsub, parentSubCategory: sub.name, parentId: sub.id }))
      );
    }
    const sub = allSubs.find(s => s.id === filterSubCategory);
    return sub ? (sub.subTypes || []).map(subsub => ({ ...subsub, parentSubCategory: sub.name, parentId: sub.id })) : [];
  };

  const getFilteredManufacturers = () => {
    return categories.flatMap(cat => 
      cat.manufacturers.map(mfr => ({ name: mfr, parentCategory: cat.name, parentId: cat.id }))
    );
  };

  const getCurrentPageData = () => {
    let data: any[] = [];
    if (activeTab === 'categories' || activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') {
      data = categories;
    } else if (activeTab === 'subcategories') {
      data = getFilteredSubCategories();
    } else if (activeTab === 'sub_subcategories') {
      data = getFilteredSubSubCategories();
    } else {
      data = getFilteredManufacturers();
    }
    
    if (searchTerm) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.shortCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const getTotalPages = () => {
    let total = 0;
    if (activeTab === 'categories') total = categories.length;
    else if (activeTab === 'subcategories') total = getFilteredSubCategories().length;
    else if (activeTab === 'sub_subcategories') total = getFilteredSubSubCategories().length;
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
    <DashboardLayout title="Master Settings">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            {selectedRows.size > 0 && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleBulkEdit}
                  disabled={activeTab === 'sub_subcategories' && selectedRows.size > 1}
                  title={activeTab === 'sub_subcategories' && selectedRows.size > 1 ? 'Bulk editing not available for multiple sub-categories' : ''}
                >
                  Edit Selected ({selectedRows.size})
                </Button>
                {editingRows.size > 0 && <Button size="sm" onClick={handleBulkSave} variant="outline">Save All</Button>}
                <Button size="sm" onClick={handleBulkDelete} variant="destructive">Delete Selected</Button>
                <Button size="sm" onClick={() => {setSelectedRows(new Set()); setEditingRows(new Set()); setEditValues({});}} variant="outline">Cancel</Button>
              </div>
            )}
            {activeTab === 'subcategories' && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Asset Types</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {activeTab === 'sub_subcategories' && (
              <Select value={filterSubCategory} onValueChange={setFilterSubCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getFilteredSubCategories().map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setFormData({ name: '', shortCode: '', parentCategoryId: '', colors: [], bodies: [], sizes: [] });
              setEditingItem(null);
              setCurrentField('name');
              setColorInput('');
              setMaterialInput('');
              setSizeInput('');
              setAddedItems([]);
              setExistingColors([]);
              setExistingBodies([]);
              setExistingSizes([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? (
                    linkedAssets[editingItem.name] ? 
                      `Add Options to ${editingItem.name} (Linked to ${linkedAssets[editingItem.name].length} assets)` : 
                      'Edit'
                  ) : 'Add'} {activeTab === 'categories' ? 'Asset Types' : 
                       activeTab === 'subcategories' ? 'Categories' : 
                       activeTab === 'sub_subcategories' ? 'Sub-Categories' :
                       activeTab === 'manufacturers' ? 'Manufacturers' :
                       activeTab === 'general_charges' ? 'General Charges' :
                       activeTab === 'building_types' ? 'Building Types' :
                       activeTab === 'amenities' ? 'Amenities' :
                       activeTab === 'room_categories' ? 'Room Categories' : activeTab.replace('_', ' ')}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 pt-4 px-1">
                {activeTab === 'subcategories' && (
                  <div className="space-y-2">
                    <Label>Parent Asset Type</Label>
                    <Combobox
                      value={formData.parentCategoryId}
                      onValueChange={(v) => setFormData({...formData, parentCategoryId: v})}
                      options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                      placeholder="Select asset type"
                      searchPlaceholder="Search asset type..."
                    />
                  </div>
                )}
                {activeTab === 'sub_subcategories' && (
                  <div className="space-y-2">
                    <Label>Parent Category</Label>
                    <Combobox
                      value={formData.parentCategoryId}
                      onValueChange={(v) => setFormData({...formData, parentCategoryId: v})}
                      options={getFilteredSubCategories().map(sub => ({ value: sub.id, label: sub.name }))}
                      placeholder="Select category"
                      searchPlaceholder="Search category..."
                    />
                  </div>
                )}
                {activeTab === 'manufacturers' && (
                  <div className="space-y-2">
                    <Label>Parent Asset Type (Optional)</Label>
                    <Combobox
                      value={formData.parentCategoryId}
                      onValueChange={(v) => setFormData({...formData, parentCategoryId: v})}
                      options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                      placeholder="Select asset type"
                      searchPlaceholder="Search asset type..."
                    />
                  </div>
                )}
                
                {editingItem ? (
                  // Edit mode: Show both fields at once
                  <>
                    {linkedAssets[editingItem.name] && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800 font-medium mb-1">
                          ⚠️ This item is linked to {linkedAssets[editingItem.name].length} asset(s)
                        </p>
                        <div className="mb-2">
                          <p className="text-xs text-yellow-700 mb-1">Linked Assets:</p>
                          <div className="flex flex-wrap gap-1">
                            {linkedAssets[editingItem.name].slice(0, 5).map((assetId, idx) => (
                              <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-mono">
                                {assetId}
                              </span>
                            ))}
                            {linkedAssets[editingItem.name].length > 5 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                +{linkedAssets[editingItem.name].length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-yellow-700">
                          You can add new colors, materials, and sizes, but cannot delete existing ones or change the name/code.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter name"
                        autoFocus
                        disabled={linkedAssets[editingItem.name]} // Disable name editing for linked assets
                        className={linkedAssets[editingItem.name] ? 'bg-gray-100' : ''}
                      />
                    </div>
                    {(activeTab !== 'manufacturers' && activeTab !== 'general_charges' && activeTab !== 'service_charges' && activeTab !== 'building_types' && activeTab !== 'amenities') && (
                      <div className="space-y-2">
                        <Label>Short Code</Label>
                        <Input
                          value={formData.shortCode}
                          onChange={(e) => setFormData({...formData, shortCode: e.target.value.toUpperCase()})}
                          placeholder="Enter short code"
                          disabled={linkedAssets[editingItem.name]} // Disable code editing for linked assets
                          className={linkedAssets[editingItem.name] ? 'bg-gray-100' : ''}
                        />
                      </div>
                    )}
                    {activeTab === 'sub_subcategories' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Colors</Label>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={colorInput}
                                onChange={(e) => setColorInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && colorInput.trim()) {
                                    e.preventDefault();
                                    if (!formData.colors.includes(colorInput.trim())) {
                                      setFormData({...formData, colors: [...formData.colors, colorInput.trim()]});
                                    }
                                    setColorInput('');
                                  }
                                }}
                                placeholder="Add color"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (colorInput.trim() && !formData.colors.includes(colorInput.trim())) {
                                    setFormData({...formData, colors: [...formData.colors, colorInput.trim()]});
                                    setColorInput('');
                                  }
                                }}
                                disabled={!colorInput.trim()}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="min-h-[60px] max-h-[120px] overflow-y-auto border rounded p-2 space-y-1">
                              {formData.colors.map((color, idx) => {
                                const isExisting = existingColors.includes(color);
                                return (
                                  <div key={idx} className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                                    isExisting ? 'bg-blue-100 border border-blue-300' : 'bg-blue-50'
                                  }`}>
                                    <span className={isExisting ? 'font-medium' : ''}>{color}</span>
                                    <div className="flex items-center gap-2">
                                      {isExisting && (
                                        <span className="text-xs text-blue-600">Existing</span>
                                      )}
                                      <button
                                        onClick={() => setFormData({...formData, colors: formData.colors.filter((_, i) => i !== idx)})}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {formData.colors.length === 0 && (
                                <div className="text-gray-400 text-sm text-center py-4">No colors added</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Materials</Label>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={materialInput}
                                onChange={(e) => setMaterialInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && materialInput.trim()) {
                                    e.preventDefault();
                                    if (!formData.bodies.includes(materialInput.trim())) {
                                      setFormData({...formData, bodies: [...formData.bodies, materialInput.trim()]});
                                    }
                                    setMaterialInput('');
                                  }
                                }}
                                placeholder="Add material"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (materialInput.trim() && !formData.bodies.includes(materialInput.trim())) {
                                    setFormData({...formData, bodies: [...formData.bodies, materialInput.trim()]});
                                    setMaterialInput('');
                                  }
                                }}
                                disabled={!materialInput.trim()}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="min-h-[60px] max-h-[120px] overflow-y-auto border rounded p-2 space-y-1">
                              {formData.bodies.map((material, idx) => {
                                const isExisting = existingBodies.includes(material);
                                return (
                                  <div key={idx} className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                                    isExisting ? 'bg-green-100 border border-green-300' : 'bg-green-50'
                                  }`}>
                                    <span className={isExisting ? 'font-medium' : ''}>{material}</span>
                                    <div className="flex items-center gap-2">
                                      {isExisting && (
                                        <span className="text-xs text-green-600">Existing</span>
                                      )}
                                      <button
                                        onClick={() => setFormData({...formData, bodies: formData.bodies.filter((_, i) => i !== idx)})}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {formData.bodies.length === 0 && (
                                <div className="text-gray-400 text-sm text-center py-4">No materials added</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Sizes</Label>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={sizeInput}
                                onChange={(e) => setSizeInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && sizeInput.trim()) {
                                    e.preventDefault();
                                    if (!formData.sizes.includes(sizeInput.trim())) {
                                      setFormData({...formData, sizes: [...formData.sizes, sizeInput.trim()]});
                                    }
                                    setSizeInput('');
                                  }
                                }}
                                placeholder="Add size"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (sizeInput.trim() && !formData.sizes.includes(sizeInput.trim())) {
                                    setFormData({...formData, sizes: [...formData.sizes, sizeInput.trim()]});
                                    setSizeInput('');
                                  }
                                }}
                                disabled={!sizeInput.trim()}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="min-h-[60px] max-h-[120px] overflow-y-auto border rounded p-2 space-y-1">
                              {formData.sizes.map((size, idx) => {
                                const isExisting = existingSizes.includes(size);
                                return (
                                  <div key={idx} className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                                    isExisting ? 'bg-purple-100 border border-purple-300' : 'bg-purple-50'
                                  }`}>
                                    <span className={isExisting ? 'font-medium' : ''}>{size}</span>
                                    <div className="flex items-center gap-2">
                                      {isExisting && (
                                        <span className="text-xs text-purple-600">Existing</span>
                                      )}
                                      <button
                                        onClick={() => setFormData({...formData, sizes: formData.sizes.filter((_, i) => i !== idx)})}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {formData.sizes.length === 0 && (
                                <div className="text-gray-400 text-sm text-center py-4">No sizes added</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Add mode: Show both fields, Enter to move to next
                  <>
                    <div className="space-y-2">
                      <Label>Name {currentField === 'name' && '(Press Enter)'}</Label>
                      <Input
                        ref={nameInputRef}
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter name and press Enter"
                        autoFocus={currentField === 'name'}
                        className={currentField === 'name' ? 'ring-2 ring-primary' : ''}
                      />
                    </div>
                    {(activeTab !== 'manufacturers' && activeTab !== 'general_charges' && activeTab !== 'service_charges' && activeTab !== 'building_types' && activeTab !== 'amenities') && (
                      <div className="space-y-2">
                        <Label>Short Code {currentField === 'shortCode' && '(Press Enter)'}</Label>
                        <Input
                          ref={shortCodeInputRef}
                          value={formData.shortCode}
                          onChange={(e) => setFormData({...formData, shortCode: e.target.value.toUpperCase()})}
                          onKeyPress={handleKeyPress}
                          placeholder="Enter short code and press Enter"
                          minLength={3}
                          maxLength={5}
                          autoFocus={currentField === 'shortCode'}
                          className={currentField === 'shortCode' ? 'ring-2 ring-primary' : ''}
                        />
                      </div>
                    )}
                    {activeTab === 'sub_subcategories' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Colors {currentField === 'colors' && '(Enter to add, Shift+Enter for next)'}</Label>
                            <Input
                              ref={colorsInputRef}
                              value={colorInput}
                              onChange={(e) => setColorInput(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Add color"
                              autoFocus={currentField === 'colors'}
                              className={currentField === 'colors' ? 'ring-2 ring-primary' : ''}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Materials {currentField === 'materials' && '(Enter to add, Shift+Enter for next)'}</Label>
                            <Input
                              ref={materialsInputRef}
                              value={materialInput}
                              onChange={(e) => setMaterialInput(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Add material"
                              autoFocus={currentField === 'materials'}
                              className={currentField === 'materials' ? 'ring-2 ring-primary' : ''}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Sizes {currentField === 'sizes' && '(Enter to add, Shift+Enter to save)'}</Label>
                            <Input
                              ref={sizesInputRef}
                              value={sizeInput}
                              onChange={(e) => setSizeInput(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Add size"
                              autoFocus={currentField === 'sizes'}
                              className={currentField === 'sizes' ? 'ring-2 ring-primary' : ''}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="min-h-[100px] max-h-[150px] overflow-y-auto border rounded-lg">
                              {formData.colors.length > 0 ? (
                                <div className="divide-y">
                                  {formData.colors.map((color, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors">
                                      <span className="text-sm font-medium text-gray-700">{color}</span>
                                      <button
                                        onClick={() => setFormData({...formData, colors: formData.colors.filter((_, i) => i !== idx)})}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No colors added</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="min-h-[100px] max-h-[150px] overflow-y-auto border rounded-lg">
                              {formData.bodies.length > 0 ? (
                                <div className="divide-y">
                                  {formData.bodies.map((material, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3 py-2 hover:bg-green-50 transition-colors">
                                      <span className="text-sm font-medium text-gray-700">{material}</span>
                                      <button
                                        onClick={() => setFormData({...formData, bodies: formData.bodies.filter((_, i) => i !== idx)})}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No materials added</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="min-h-[100px] max-h-[150px] overflow-y-auto border rounded-lg">
                              {formData.sizes.length > 0 ? (
                                <div className="divide-y">
                                  {formData.sizes.map((size, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3 py-2 hover:bg-purple-50 transition-colors">
                                      <span className="text-sm font-medium text-gray-700">{size}</span>
                                      <button
                                        onClick={() => setFormData({...formData, sizes: formData.sizes.filter((_, i) => i !== idx)})}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No sizes added</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {addedItems.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <p className="text-sm font-semibold text-gray-700">Added Items ({addedItems.length})</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                {(activeTab !== 'manufacturers' && activeTab !== 'general_charges' && activeTab !== 'service_charges' && activeTab !== 'building_types' && activeTab !== 'amenities') && (
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                )}
                                {activeTab === 'sub_subcategories' && (
                                  <>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colors</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sizes</th>
                                  </>
                                )}
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {addedItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.name}</td>
                                  {(activeTab !== 'manufacturers' && activeTab !== 'general_charges' && activeTab !== 'service_charges' && activeTab !== 'building_types' && activeTab !== 'amenities') && (
                                    <td className="px-4 py-2 text-sm text-gray-600">{item.shortCode || '-'}</td>
                                  )}
                                  {activeTab === 'sub_subcategories' && (
                                    <>
                                      <td className="px-4 py-2 text-sm">
                                        <div className="flex flex-wrap gap-1">
                                          {(item.colors || []).map((c, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{c}</span>
                                          ))}
                                          {(!item.colors || item.colors.length === 0) && <span className="text-gray-400 text-xs">-</span>}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        <div className="flex flex-wrap gap-1">
                                          {(item.bodies || []).map((b, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">{b}</span>
                                          ))}
                                          {(!item.bodies || item.bodies.length === 0) && <span className="text-gray-400 text-xs">-</span>}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        <div className="flex flex-wrap gap-1">
                                          {(item.sizes || []).map((s, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">{s}</span>
                                          ))}
                                          {(!item.sizes || item.sizes.length === 0) && <span className="text-gray-400 text-xs">-</span>}
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  <td className="px-4 py-2 text-center">
                                    <button
                                      onClick={() => setAddedItems(addedItems.filter((_, i) => i !== idx))}
                                      className="text-red-500 hover:text-red-700 font-medium"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <Button onClick={handleSaveAll} className="w-full" disabled={!editingItem && addedItems.length === 0}>
                  {editingItem ? (
                    linkedAssets[editingItem.name] ? 'Add New Options' : 'Update'
                  ) : `Save All (${addedItems.length})`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={showLinkedDialog} onOpenChange={setShowLinkedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cannot Edit/Delete - Linked to Assets</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">This item is linked to {currentLinkedAssets.length} asset(s) and cannot be modified or deleted.</p>
              <div className="max-h-64 overflow-y-auto border rounded p-3 space-y-1">
                {currentLinkedAssets.map((assetId, idx) => (
                  <div key={idx} className="text-sm font-mono">{assetId}</div>
                ))}
              </div>
              <Button onClick={() => setShowLinkedDialog(false)} className="w-full">Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedRows.size === getCurrentPageData().length && getCurrentPageData().length > 0} className="rounded" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short Code
                </th>
                {activeTab === 'sub_subcategories' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                  </>
                )}
                {activeTab === 'categories' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Items
                  </th>
                )}
                {activeTab !== 'categories' && activeTab !== 'manufacturers' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent Category
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === 'categories' && getCurrentPageData().map((cat: Category) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => handleSelectRow(cat.id)}>
                  <td className="px-6 py-1.5">
                    <input type="checkbox" checked={selectedRows.has(cat.id)} onChange={() => handleSelectRow(cat.id)} className="rounded" />
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingRows.has(cat.id) ? (
                      <Input value={editValues[cat.id]?.name || cat.name} onChange={(e) => setEditValues({...editValues, [cat.id]: {...editValues[cat.id], name: e.target.value}})} className="h-8" />
                    ) : cat.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {editingRows.has(cat.id) ? (
                      <Input value={editValues[cat.id]?.shortCode || cat.shortCode} onChange={(e) => setEditValues({...editValues, [cat.id]: {...editValues[cat.id], shortCode: e.target.value.toUpperCase()}})} className="h-8" maxLength={5} />
                    ) : cat.shortCode}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {cat.subTypes.length + cat.manufacturers.length}
                  </td>
                </tr>
              ))}

              {activeTab === 'subcategories' && getCurrentPageData().map((sub: any) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => handleSelectRow(sub.id)}>
                  <td className="px-6 py-1.5">
                    <input type="checkbox" checked={selectedRows.has(sub.id)} onChange={() => handleSelectRow(sub.id)} className="rounded" />
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingRows.has(sub.id) ? (
                      <Input value={editValues[sub.id]?.name || sub.name} onChange={(e) => setEditValues({...editValues, [sub.id]: {...editValues[sub.id], name: e.target.value}})} className="h-8" />
                    ) : sub.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {editingRows.has(sub.id) ? (
                      <Input value={editValues[sub.id]?.shortCode || sub.shortCode} onChange={(e) => setEditValues({...editValues, [sub.id]: {...editValues[sub.id], shortCode: e.target.value.toUpperCase()}})} className="h-8" maxLength={5} />
                    ) : sub.shortCode}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {sub.parentCategory}
                  </td>
                </tr>
              ))}

              {activeTab === 'sub_subcategories' && getCurrentPageData().map((subsub: any) => (
                <tr key={subsub.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => handleSelectRow(subsub.id)}>
                  <td className="px-6 py-1.5">
                    <input type="checkbox" checked={selectedRows.has(subsub.id)} onChange={() => handleSelectRow(subsub.id)} className="rounded" />
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingRows.has(subsub.id) ? (
                      <Input value={editValues[subsub.id]?.name || subsub.name} onChange={(e) => setEditValues({...editValues, [subsub.id]: {...editValues[subsub.id], name: e.target.value}})} className="h-8" />
                    ) : subsub.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {editingRows.has(subsub.id) ? (
                      <Input value={editValues[subsub.id]?.shortCode || subsub.shortCode} onChange={(e) => setEditValues({...editValues, [subsub.id]: {...editValues[subsub.id], shortCode: e.target.value.toUpperCase()}})} className="h-8" maxLength={5} />
                    ) : subsub.shortCode}
                  </td>
                  <td className="px-6 py-1.5 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {(subsub.colors || []).map((color, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{color}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-1.5 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {(subsub.bodies || []).map((body, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{body}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-1.5 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {(subsub.sizes || []).map((size, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">{size}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {subsub.parentSubCategory}
                  </td>
                </tr>
              ))}

              {activeTab === 'manufacturers' && getCurrentPageData().map((mfr: any, idx: number) => (
                <tr key={`${mfr.parentId}-${mfr.name}-${idx}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => handleSelectRow(`${mfr.parentId}-${mfr.name}`)}>
                  <td className="px-6 py-1.5">
                    <input type="checkbox" checked={selectedRows.has(`${mfr.parentId}-${mfr.name}`)} onChange={() => handleSelectRow(`${mfr.parentId}-${mfr.name}`)} className="rounded" />
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingRows.has(`${mfr.parentId}-${mfr.name}`) ? (
                      <Input value={editValues[`${mfr.parentId}-${mfr.name}`]?.name || mfr.name} onChange={(e) => setEditValues({...editValues, [`${mfr.parentId}-${mfr.name}`]: {...editValues[`${mfr.parentId}-${mfr.name}`], name: e.target.value}})} className="h-8" />
                    ) : mfr.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                </tr>
              ))}
              {(activeTab === 'asset_status' || activeTab === 'sez_status' || activeTab === 'customs_category' || activeTab === 'general_charges' || activeTab === 'service_charges' || activeTab === 'building_types' || activeTab === 'amenities' || activeTab === 'room_categories') && getCurrentPageData().map((item: Category) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => handleSelectRow(item.id)}>
                  <td className="px-6 py-1.5">
                    <input type="checkbox" checked={selectedRows.has(item.id)} onChange={() => handleSelectRow(item.id)} className="rounded" />
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingRows.has(item.id) ? (
                      <Input value={editValues[item.id]?.name || item.name} onChange={(e) => setEditValues({...editValues, [item.id]: {...editValues[item.id], name: e.target.value}})} className="h-8" />
                    ) : item.name}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    {editingRows.has(item.id) ? (
                      <Input value={editValues[item.id]?.shortCode || item.shortCode || ''} onChange={(e) => setEditValues({...editValues, [item.id]: {...editValues[item.id], shortCode: e.target.value.toUpperCase()}})} className="h-8" maxLength={5} />
                    ) : (item.shortCode || '-')}
                  </td>
                  <td className="px-6 py-1.5 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {getTotalPages() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, activeTab === 'categories' ? categories.length : activeTab === 'subcategories' ? getFilteredSubCategories().length : activeTab === 'sub_subcategories' ? getFilteredSubSubCategories().length : getFilteredManufacturers().length)} of {activeTab === 'categories' ? categories.length : activeTab === 'subcategories' ? getFilteredSubCategories().length : activeTab === 'sub_subcategories' ? getFilteredSubSubCategories().length : getFilteredManufacturers().length} results
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
