import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HelpdeskService } from '@/services/helpdeskService';
import { Pagination } from '@/components/ui/pagination';

interface Material {
  id: string;
  name: string;
  category: string;
  rate: number;
  uom: string;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  purchase_price?: number;
  mrp?: number;
  created_at: string;
}

export default function InventoryManagement() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialCategories] = useState<string[]>([
    'Electrical', 'Plumbing', 'HVAC', 'Carpentry', 'Painting', 'Civil', 'IT/Networking', 'Housekeeping'
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [materialForm, setMaterialForm] = useState({
    name: '',
    category: '',
    rate: 0,
    uom: '',
    stock_quantity: 0,
    min_stock_level: 10,
    max_stock_level: 100,
    purchase_price: 0,
    mrp: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
    setCurrentPage(1);
  }, [materials, searchTerm, categoryFilter]);

  const loadMaterials = async () => {
    try {
      const data = await HelpdeskService.getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({ title: "Error", description: "Failed to load materials", variant: "destructive" });
    }
  };

  const filterMaterials = () => {
    let filtered = materials;
    
    if (searchTerm) {
      filtered = filtered.filter(material => 
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(material => material.category === categoryFilter);
    }
    
    setFilteredMaterials(filtered);
  };

  const handleAddMaterial = async () => {
    if (!materialForm.name || !materialForm.category || !materialForm.rate || !materialForm.uom) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      await HelpdeskService.addMaterial(materialForm);
      toast({ title: "Success", description: "Material added successfully" });
      setIsAddDialogOpen(false);
      setMaterialForm({ name: '', category: '', rate: 0, uom: '', stock_quantity: 0, min_stock_level: 10, max_stock_level: 100, purchase_price: 0, mrp: 0 });
      loadMaterials();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      category: material.category,
      rate: material.rate,
      uom: material.uom,
      stock_quantity: material.stock_quantity || 0,
      min_stock_level: material.min_stock_level || 10,
      max_stock_level: material.max_stock_level || 100,
      purchase_price: material.purchase_price || 0,
      mrp: material.mrp || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterial || !materialForm.name || !materialForm.category || !materialForm.rate || !materialForm.uom) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      await HelpdeskService.updateMaterial(editingMaterial.id, materialForm);
      toast({ title: "Success", description: "Material updated successfully" });
      setIsEditDialogOpen(false);
      setEditingMaterial(null);
      setMaterialForm({ name: '', category: '', rate: 0, uom: '', stock_quantity: 0, min_stock_level: 10, max_stock_level: 100, purchase_price: 0, mrp: 0 });
      loadMaterials();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const uniqueCategories = [...new Set(materials.map(m => m.category))];

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Materials List</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
              <TableHead className="text-gray-600 font-semibold uppercase text-xs">Material Name</TableHead>
              <TableHead className="text-gray-600 font-semibold uppercase text-xs">Category</TableHead>
              <TableHead className="text-gray-600 font-semibold uppercase text-xs">Rate</TableHead>
              <TableHead className="text-gray-600 font-semibold uppercase text-xs">UOM</TableHead>
              <TableHead className="text-gray-600 font-semibold uppercase text-xs">Stock</TableHead>
              <TableHead className="text-gray-600 font-semibold uppercase text-xs">Status</TableHead>
              <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No materials found
                </TableCell>
              </TableRow>
            ) : (
              paginatedMaterials.map((material) => (
                <TableRow key={material.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium text-gray-900">{material.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{material.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">₹{material.rate}</TableCell>
                  <TableCell className="text-sm text-gray-500">{material.uom}</TableCell>
                  <TableCell className="font-medium text-gray-900">{material.stock_quantity || 0}</TableCell>
                  <TableCell>
                    {(material.stock_quantity || 0) <= (material.min_stock_level || 10) ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (material.stock_quantity || 0) >= (material.max_stock_level || 100) ? (
                      <Badge variant="secondary">Full</Badge>
                    ) : (
                      <Badge className="bg-green-600">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditMaterial(material)}
                      title="Edit"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredMaterials.length)} of {filteredMaterials.length} materials
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showControls
            />
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material Category *</Label>
              <Select value={materialForm.category} onValueChange={(v) => setMaterialForm({...materialForm, category: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {materialCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material Name *</Label>
              <Input
                value={materialForm.name}
                onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                placeholder="Enter material name"
              />
            </div>
            <div>
              <Label>Rate (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={materialForm.rate || ''}
                onChange={(e) => setMaterialForm({...materialForm, rate: parseFloat(e.target.value) || 0})}
                placeholder="Enter rate"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={materialForm.purchase_price || ''}
                  onChange={(e) => setMaterialForm({...materialForm, purchase_price: parseFloat(e.target.value) || 0})}
                  placeholder="Enter purchase price"
                />
              </div>
              <div>
                <Label>MRP (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={materialForm.mrp || ''}
                  onChange={(e) => setMaterialForm({...materialForm, mrp: parseFloat(e.target.value) || 0})}
                  placeholder="Enter MRP"
                />
              </div>
            </div>
            <div>
              <Label>Unit of Measurement *</Label>
              <Input
                value={materialForm.uom}
                onChange={(e) => setMaterialForm({...materialForm, uom: e.target.value})}
                placeholder="e.g., pcs, kg, m, sqft"
              />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={materialForm.stock_quantity || ''}
                onChange={(e) => setMaterialForm({...materialForm, stock_quantity: parseInt(e.target.value) || 0})}
                placeholder="Enter stock quantity"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Stock Level</Label>
                <Input
                  type="number"
                  value={materialForm.min_stock_level || ''}
                  onChange={(e) => setMaterialForm({...materialForm, min_stock_level: parseInt(e.target.value) || 0})}
                  placeholder="Min level"
                />
              </div>
              <div>
                <Label>Max Stock Level</Label>
                <Input
                  type="number"
                  value={materialForm.max_stock_level || ''}
                  onChange={(e) => setMaterialForm({...materialForm, max_stock_level: parseInt(e.target.value) || 0})}
                  placeholder="Max level"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMaterial}>Add Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material Category *</Label>
              <Select value={materialForm.category} onValueChange={(v) => setMaterialForm({...materialForm, category: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {materialCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material Name *</Label>
              <Input
                value={materialForm.name}
                onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                placeholder="Enter material name"
              />
            </div>
            <div>
              <Label>Rate (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={materialForm.rate || ''}
                onChange={(e) => setMaterialForm({...materialForm, rate: parseFloat(e.target.value) || 0})}
                placeholder="Enter rate"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={materialForm.purchase_price || ''}
                  onChange={(e) => setMaterialForm({...materialForm, purchase_price: parseFloat(e.target.value) || 0})}
                  placeholder="Enter purchase price"
                />
              </div>
              <div>
                <Label>MRP (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={materialForm.mrp || ''}
                  onChange={(e) => setMaterialForm({...materialForm, mrp: parseFloat(e.target.value) || 0})}
                  placeholder="Enter MRP"
                />
              </div>
            </div>
            <div>
              <Label>Unit of Measurement *</Label>
              <Input
                value={materialForm.uom}
                onChange={(e) => setMaterialForm({...materialForm, uom: e.target.value})}
                placeholder="e.g., pcs, kg, m, sqft"
              />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={materialForm.stock_quantity || ''}
                onChange={(e) => setMaterialForm({...materialForm, stock_quantity: parseInt(e.target.value) || 0})}
                placeholder="Enter stock quantity"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Stock Level</Label>
                <Input
                  type="number"
                  value={materialForm.min_stock_level || ''}
                  onChange={(e) => setMaterialForm({...materialForm, min_stock_level: parseInt(e.target.value) || 0})}
                  placeholder="Min level"
                />
              </div>
              <div>
                <Label>Max Stock Level</Label>
                <Input
                  type="number"
                  value={materialForm.max_stock_level || ''}
                  onChange={(e) => setMaterialForm({...materialForm, max_stock_level: parseInt(e.target.value) || 0})}
                  placeholder="Max level"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaterial}>Update Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
