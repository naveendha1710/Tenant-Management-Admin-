import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, UserCheck, Trash2, Building2, Mail, Phone } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { mockTenants } from "@/data/mockData";

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "expired":
      return "bg-red-100 text-red-800 border-red-200";
    case "inactive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function CircularViewPage() {
  const { spanName } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock data for different spans
  const spanTenants = {
    'SPAN1': mockTenants.filter(t => ['1', '2'].includes(t.id)),
    'SPAN2': mockTenants.filter(t => t.id === '3')
  };

  useEffect(() => {
    fetchTenants();
  }, [spanName]);

  const fetchTenants = async () => {
    try {
      const tenantsData = spanTenants[spanName as keyof typeof spanTenants] || [];
      const formattedTenants = tenantsData.map(tenant => ({
        ...tenant,
        contact_person: tenant.representative_name,
        email: tenant.contact_email,
        phone: tenant.contact_phone,
        status: tenant.status.toLowerCase(),
        monthly_rent: 25000 + Math.floor(Math.random() * 20000),
        lease_end_date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
      
      setTenants(formattedTenants);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const companyName = formData.get('companyName') as string;
    const contactPerson = formData.get('contactPerson') as string;
    
    if (!companyName.trim() || !contactPerson.trim()) {
      toast({
        title: "Validation Error",
        description: "Company name and contact person are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const tenantId = `TEN${Date.now().toString().slice(-6)}`;
      const newTenant = {
        id: Date.now().toString(),
        tenant_id: tenantId,
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        email: (formData.get('email') as string)?.trim() || '',
        phone: (formData.get('phone') as string)?.trim() || '',
        status: 'active',
        monthly_rent: parseFloat(formData.get('monthlyRent') as string) || 0,
        lease_end_date: (formData.get('leaseEnd') as string) || null,
        sector: (formData.get('sector') as string) || 'General',
        representative_name: contactPerson.trim(),
        contact_email: (formData.get('email') as string)?.trim() || '',
        contact_phone: (formData.get('phone') as string)?.trim() || ''
      };

      setTenants(prev => [newTenant, ...prev]);
      toast({
        title: "Success",
        description: `Tenant ${tenantId} added to ${spanName} successfully`,
      });

      setIsAddDialogOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add tenant",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={`${spanName} - Circular View`} subtitle="Manage tenants in circular view">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading tenants...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${spanName} - Circular View`} subtitle="Manage tenants in circular view">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>{spanName} Tenant Management</CardTitle>
                <CardDescription>Manage tenants in {spanName} circular view</CardDescription>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Total Tenants: {tenants.length}
            </div>
          </CardContent>
        </Card>

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tenants.map((tenant: any) => (
            <Card key={tenant.id} className="border hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tenant.company_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{tenant.sector}</p>
                    </div>
                  </div>
                  <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                    {tenant.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.phone}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Representative</div>
                  <div className="text-sm font-medium">{tenant.contact_person}</div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Monthly Rent</div>
                  <div className="text-sm font-medium">₹{tenant.monthly_rent?.toLocaleString()}</div>
                </div>
                
                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log('View tenant:', tenant.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log('Assignment tenant:', tenant.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Assignment
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${tenant.company_name}?`)) {
                        setTenants(prev => prev.filter(t => t.id !== tenant.id));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tenants.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tenants in {spanName}</h3>
              <p className="text-muted-foreground mb-4">Add the first tenant to get started</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Tenant Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Tenant to {spanName}</DialogTitle>
              <DialogDescription>
                Create a new tenant record for {spanName}
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Input id="sector" name="sector" placeholder="e.g., Technology, Healthcare" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Monthly Rent (₹)</Label>
                  <Input id="monthlyRent" name="monthlyRent" type="number" placeholder="0" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="leaseEnd">Lease End Date</Label>
                <Input id="leaseEnd" name="leaseEnd" type="date" />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Add Tenant
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}