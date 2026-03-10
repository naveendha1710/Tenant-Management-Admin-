import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface Branch {
  id: string;
  company: string;
  location_name?: string;
}

interface BranchTabsProps {
  onBranchChange: (tenantIds: string[]) => void;
}

export function BranchTabs({ onBranchChange }: BranchTabsProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    loadBranches();
  }, [user]);

  const loadBranches = async () => {
    if (!user?.email) return;

    try {
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('id, company')
        .eq('email', user.email)
        .single();

      if (!currentTenant) return;
      setCurrentTenantId(currentTenant.id);

      const branchAccess = user.appUser?.branchAccess || [];
      
      if (branchAccess.length === 0) {
        setBranches([currentTenant]);
        onBranchChange([currentTenant.id]);
        return;
      }

      const { data: accessibleBranches } = await supabase
        .from('tenants')
        .select('id, company')
        .in('id', branchAccess);

      const allBranches = [currentTenant, ...(accessibleBranches || [])];
      setBranches(allBranches);
      onBranchChange(allBranches.map(b => b.id));
    } catch (error) {
      console.error('Error loading branches:', error);
      // Fallback: just use current tenant
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('id, company')
        .eq('email', user.email)
        .maybeSingle();
      
      if (currentTenant) {
        setBranches([currentTenant]);
        onBranchChange([currentTenant.id]);
      }
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'all') {
      onBranchChange(branches.map(b => b.id));
    } else {
      onBranchChange([value]);
    }
  };

  if (branches.length <= 1) return null;

  return (
    <Select value={activeTab} onValueChange={handleTabChange}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            All Branches
          </div>
        </SelectItem>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {branch.company}
              {branch.id === currentTenantId && ' (Main)'}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
