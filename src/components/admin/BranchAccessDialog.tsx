import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AppUser, userService } from '@/data/userData';
import { tenantDataService, Tenant } from '@/data/tenantData';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

interface BranchAccessDialogProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function BranchAccessDialog({ user, isOpen, onClose, onSave }: BranchAccessDialogProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      loadTenants();
      setSelected(user.branchAccess || []);
    }
  }, [isOpen, user]);

  const loadTenants = async () => {
    const all = await tenantDataService.getAllTenants();
    setTenants(all);
  };

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await userService.updateUser(user.id, { ...user, branchAccess: selected });
      toast({ title: 'Success', description: 'Branch access updated' });
      onSave();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col z-[150]">
        <DialogHeader>
          <DialogTitle>Branch Access - {user.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select branches this user can access. Empty = no restrictions.
          </p>
          {tenants.map(t => (
            <div key={t.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <Checkbox
                id={t.id}
                checked={selected.includes(t.id)}
                onCheckedChange={() => toggle(t.id)}
              />
              <Label htmlFor={t.id} className="flex-1 cursor-pointer flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">{t.company}</p>
                  <p className="text-xs text-muted-foreground">{t.email}</p>
                  {t.branchName && <p className="text-xs text-blue-600">📍 {t.branchName}</p>}
                </div>
              </Label>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Selected: {selected.length} {selected.length === 0 && '(No restrictions)'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
