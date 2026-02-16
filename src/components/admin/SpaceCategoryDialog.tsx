import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';

interface SpaceCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ name: string; display_name: string }>;
  onCategoriesChange: (categories: Array<{ name: string; display_name: string }>) => void;
}

export const SpaceCategoryDialog: React.FC<SpaceCategoryDialogProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChange
}) => {
  const [newCategory, setNewCategory] = useState('');

  const handleDelete = async (idx: number) => {
    const updated = categories.filter((_, i) => i !== idx);
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('app_settings').update({ value: updated }).eq('key', 'space_categories');
    onCategoriesChange(updated);
  };

  const handleAdd = async () => {
    if (newCategory.trim()) {
      const name = newCategory.toLowerCase().replace(/\s+/g, '_');
      const newCat = { name, display_name: newCategory };
      const updated = [...categories, newCat];
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('app_settings').update({ value: updated }).eq('key', 'space_categories');
      onCategoriesChange(updated);
      setNewCategory('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Space Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Current Categories</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded">
                  <span className="text-sm">{cat.display_name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-red-100"
                    onClick={() => handleDelete(idx)}
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="new_category">Add New Category</Label>
            <div className="flex gap-2">
              <Input
                id="new_category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., gym, lounge"
              />
              <Button onClick={handleAdd}>
                Add
              </Button>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
