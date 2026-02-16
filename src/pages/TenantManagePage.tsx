import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenantById, updateTenant, Tenant } from '@/services/tenantApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';



export default function TenantManagePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch tenant data using service
  const fetchTenant = async () => {
    if (!tenantId) return;

    try {
      const data = await fetchTenantById(tenantId);
      setTenant(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tenant data",
        variant: "destructive"
      });
      navigate('/admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  // Update tenant data using service
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !tenantId) return;

    setSaving(true);
    try {
      await updateTenant(tenantId, {
        company_name: tenant.company_name,
        contact_person: tenant.contact_person,
        email: tenant.email,
        status: tenant.status,
        monthly_rent: tenant.monthly_rent,
        lease_end_date: tenant.lease_end_date
      });

      toast({
        title: "Success",
        description: "Tenant updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!tenant) {
    return <div className="flex justify-center p-8">Tenant not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/admin/tenants')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">Manage Tenant</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={tenant.company_name}
                  onChange={(e) => setTenant({...tenant, company_name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={tenant.contact_person}
                  onChange={(e) => setTenant({...tenant, contact_person: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={tenant.email}
                  onChange={(e) => setTenant({...tenant, email: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={tenant.status}
                  onValueChange={(value) => setTenant({...tenant, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  value={tenant.monthly_rent}
                  onChange={(e) => setTenant({...tenant, monthly_rent: Number(e.target.value)})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="lease_end_date">Lease End Date</Label>
                <Input
                  id="lease_end_date"
                  type="date"
                  value={tenant.lease_end_date}
                  onChange={(e) => setTenant({...tenant, lease_end_date: e.target.value})}
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}