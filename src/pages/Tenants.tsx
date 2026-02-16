import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  UserCheck, 
  Trash2,
  Building2,
  Users,
  Calendar,
  DollarSign,
  Mail,
  Phone
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { useToast } from "@/hooks/use-toast";



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

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [tenants, setTenants] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
    fetchSpaces();
  }, []);

  const fetchTenants = async () => {
    try {
      console.log('Loading mock tenants data...');
      
      // Use mock data from mockData.ts
      const { mockTenants } = await import('@/data/mockData');
      const tenantsData = mockTenants.map(tenant => ({
        ...tenant,
        contact_person: tenant.representative_name,
        email: tenant.contact_email,
        phone: tenant.contact_phone,
        status: tenant.status.toLowerCase(),
        monthly_rent: 25000 + Math.floor(Math.random() * 20000),
        lease_end_date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));

      setTenants(tenantsData);
      console.log('Mock tenants loaded:', tenantsData);
      
    } catch (error: any) {
      console.error('Error loading mock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaces = async () => {
    try {
      // Use mock spaces data
      const { mockSpaces } = await import('@/data/mockData');
      const spacesData = mockSpaces.map(space => ({
        id: space.id,
        space_number: space.space_number,
        floor: {
          floor_number: space.floor.floor_number,
          building: {
            name: space.floor.building.name
          }
        }
      }));
      setSpaces(spacesData);
    } catch (error) {
      console.error('Error loading mock spaces:', error);
      setSpaces([]);
    }
  };

  const handleAddTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Basic validation
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
      // Generate unique tenant ID
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

      console.log('Attempting to insert tenant:', tenantData);

      // Mock insert - just add to local state
      const newTenant = { ...tenantData, id: Date.now().toString() };
      setTenants(prev => [newTenant, ...prev]);

      toast({
        title: "Success",
        description: `Tenant ${tenantId} added successfully`,
      });

      setIsAddDialogOpen(false);
      // No need to refetch since we updated local state
      
      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error('Error adding tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add tenant. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const filteredTenants = tenants.filter((tenant: any) => {
    // Defensive search - handle null/undefined values
    const searchFields = [
      tenant.company_name,
      tenant.contact_person,
      tenant.email,
      tenant.tenant_id
    ].filter(Boolean); // Remove null/undefined values
    
    const matchesSearch = searchTerm === '' || 
      searchFields.some(field => 
        field?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Defensive tab filtering - handle missing status
    const tenantStatus = tenant.status?.toLowerCase() || 'active';
    const matchesTab = selectedTab === "all" || 
                      (selectedTab === "active" && tenantStatus === "active") ||
                      (selectedTab === "pending" && tenantStatus === "pending") ||
                      (selectedTab === "overdue" && (tenantStatus === "expired" || tenantStatus === "overdue"));
    
    return matchesSearch && matchesTab;
  });

  const stats = [
    {
      title: "Total Tenants",
      value: tenants.length.toString(),
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Leases",
      value: tenants.filter((t: any) => t.status === "active").length.toString(),
      icon: Building2,
      color: "text-green-600"
    },
    {
      title: "Pending Renewals",
      value: tenants.filter((t: any) => t.status === "pending").length.toString(),
      icon: Calendar,
      color: "text-yellow-600"
    },
    {
      title: "Overdue Payments",
      value: tenants.filter((t: any) => t.status === "expired").length.toString(),
      icon: DollarSign,
      color: "text-red-600"
    }
  ];

  return (
    <DashboardLayout 
      title="Tenant Management" 
      subtitle="Manage all tenants, leases, and applications"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card className="shadow-card">
          <CardHeader>
            <div>
              <CardTitle>Tenant Directory</CardTitle>
              <CardDescription>Manage all your tenants and their information</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tenant
                  </Button>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList>
                  <TabsTrigger value="all">All Tenants</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="pending">Pending Renewal</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedTab} className="mt-4">
                  {loading ? (
                    <div className="text-center py-8">Loading tenants...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {filteredTenants.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No tenants found</h3>
                          <p className="text-muted-foreground mb-4">Add the first tenant to get started</p>
                          <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Tenant
                          </Button>
                        </div>
                      ) : (
                        filteredTenants.map((tenant: any) => (
                          <Card key={tenant.id || tenant.tenant_id} className="border hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{tenant.company_name || 'Unknown Company'}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{tenant.sector || 'General'}</p>
                                  </div>
                                </div>
                                <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                                  {tenant.status || 'active'}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{tenant.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{tenant.phone || 'No phone'}</span>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground mb-1">Representative</div>
                                <div className="text-sm font-medium">{tenant.contact_person || 'No contact'}</div>
                              </div>
                              
                              <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground mb-1">Monthly Rent</div>
                                <div className="text-sm font-medium">₹{(tenant.monthly_rent || 0).toLocaleString()}</div>
                              </div>
                              
                              <div className="flex gap-2 pt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log('Navigating to tenant:', tenant.id);
                                    navigate(`/admin/tenants/manage/${tenant.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigate(`/admin/tenants/assign/${tenant.id}`);
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Assignment
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this tenant?')) {
                                      console.log('Delete tenant:', tenant.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Add Tenant Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                        {space.floor?.building?.name} - {space.space_number} (Floor {space.floor?.floor_number})
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