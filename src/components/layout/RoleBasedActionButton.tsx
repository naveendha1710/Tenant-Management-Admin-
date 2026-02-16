import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';

export function RoleBasedActionButton() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Don't show button for finance, crm, or maintenance roles
  if (!userRole || ['finance', 'crm', 'maintenance'].includes(userRole)) {
    return null;
  }

  const fetchSpaces = async () => {
    // Mock spaces data
    const mockSpaces = [
      { id: '1', name: 'Office 103', floor: 1, buildings: { name: 'Building A' } },
      { id: '2', name: 'Office 104', floor: 2, buildings: { name: 'Building B' } }
    ];
    setSpaces(mockSpaces);
  };

  const handleAddTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    const companyName = formData.get('companyName') as string;
    const contactPerson = formData.get('contactPerson') as string;
    
    if (!companyName.trim() || !contactPerson.trim()) {
      toast({
        title: "Validation Error",
        description: "Company name and contact person are required",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      const generateTenantId = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `TEN${timestamp}`;
      };
      const tenantId = generateTenantId();
      
      const tenantData = {
        tenant_id: tenantId,
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        email: (formData.get('email') as string)?.trim() || null,
        phone: (formData.get('phone') as string)?.trim() || null,
        space_id: (formData.get('spaceId') as string) || null,
        lease_start_date: (formData.get('leaseStart') as string) || null,
        lease_end_date: (formData.get('leaseEnd') as string) || null,
        monthly_rent: parseFloat(formData.get('monthlyRent') as string) || 0,
        security_deposit: parseFloat(formData.get('securityDeposit') as string) || 0,
        status: 'active'
      };

      // Mock successful insert
      const data = [tenantData];
      const error = null;
      
      // Mock space update
      if (tenantData.space_id) {
        console.log('Space updated successfully');
      }

      toast({
        title: "Success",
        description: `Tenant ${tenantId} added successfully`,
      });

      setIsAddTenantOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error('Error adding tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add tenant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddTenant = () => {
    fetchSpaces();
    setIsAddTenantOpen(true);
  };

  // Show Add Tenant button for super_admin and admin
  if (userRole === 'super_admin' || userRole === 'admin') {
    return (
      <>
        <Button 
          className="bg-primary hover:bg-primary-hover"
          onClick={handleOpenAddTenant}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>

        {/* Add Tenant Dialog */}
        <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
              <DialogDescription>
                Create a new tenant record and assign space
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input id="contactPerson" name="contactPerson" required />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="spaceId">Assign Space (Optional)</Label>
                <Select name="spaceId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select available space" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((space: any) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.buildings?.name} - {space.name} (Floor {space.floor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaseStart">Lease Start Date</Label>
                  <Input id="leaseStart" name="leaseStart" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseEnd">Lease End Date</Label>
                  <Input id="leaseEnd" name="leaseEnd" type="date" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Monthly Rent (₹)</Label>
                  <Input id="monthlyRent" name="monthlyRent" type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                  <Input id="securityDeposit" name="securityDeposit" type="number" placeholder="0" />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddTenantOpen(false)} 
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Tenant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show Raise Ticket button for tenant
  if (userRole === 'tenant') {
    return (
      <Button 
        className="bg-orange-600 hover:bg-orange-700"
        onClick={() => navigate('/tenant/maintenance-requests')}
      >
        <AlertTriangle className="mr-2 h-4 w-4" />
        Raise Ticket
      </Button>
    );
  }

  return null;
}