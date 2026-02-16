import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Plus, Filter, MoreHorizontal, Eye, Edit,
  Users, Building2, Calendar, DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getStatusColor = (status: string) => {
  const colors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status as keyof typeof colors] || colors.inactive;
};



export default function EnhancedTenantManagement() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = async () => {
    try {
      // Mock tenants data
      const mockTenants = [
        {
          id: '1',
          company_name: 'TechStart Solutions',
          contact_person_name: 'John Doe',
          contact_email: 'john@techstart.com',
          contact_phone: '+91 9876543210',
          monthly_rent: 25000,
          status: 'active',
          lease_start_date: '2024-01-01',
          lease_end_date: '2024-12-31'
        },
        {
          id: '2',
          company_name: 'Innovate Labs',
          contact_person_name: 'Jane Smith',
          contact_email: 'jane@innovate.com',
          contact_phone: '+91 9876543211',
          monthly_rent: 30000,
          status: 'active',
          lease_start_date: '2024-02-01',
          lease_end_date: '2024-12-31'
        },
        {
          id: '3',
          company_name: 'Digital Dynamics',
          contact_person_name: 'Mike Johnson',
          contact_email: 'mike@digital.com',
          contact_phone: '+91 9876543212',
          monthly_rent: 28000,
          status: 'pending',
          lease_start_date: '2024-03-01',
          lease_end_date: '2024-12-31'
        }
      ];

      setTenants(mockTenants);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = searchTerm === '' || 
      tenant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.contact_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.contact_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = selectedTab === 'all' || tenant.status === selectedTab;

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
      value: tenants.filter(t => t.status === "active").length.toString(),
      icon: Building2,
      color: "text-green-600"
    },
    {
      title: "Pending Renewals",
      value: tenants.filter(t => t.status === "pending").length.toString(),
      icon: Calendar,
      color: "text-yellow-600"
    },
    {
      title: "Monthly Revenue",
      value: `₹${tenants.reduce((sum, t) => sum + (t.monthly_rent || 0), 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600"
    }
  ];



  return (
    <DashboardLayout title="Enhanced Tenant Management" subtitle="Complete tenant management with document storage">
      <div className="space-y-4 sm:space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
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
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-base sm:text-lg md:text-xl">Tenant Management</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage tenants with complete document storage</CardDescription>
              </div>
              <Button onClick={() => toast({ title: "Info", description: "Add Tenant feature coming soon" })} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Button onClick={() => toast({ title: "Info", description: "Add Tenant feature coming soon" })} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tenant
                </Button>
              </div>

              {/* Tabs */}
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">All Tenants</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs sm:text-sm">Active</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs sm:text-sm">Expired</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedTab} className="mt-4">
                  {loading ? (
                    <div className="text-center py-8">Loading tenants...</div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table className="min-w-[1000px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tenant ID</TableHead>
                            <TableHead>Company Name</TableHead>
                            <TableHead>Contact Person</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Business Type</TableHead>
                            <TableHead>Monthly Rent</TableHead>
                            <TableHead>Lease Start</TableHead>
                            <TableHead>Lease End</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTenants.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                No tenants found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredTenants.map((tenant) => (
                              <TableRow key={tenant.id}>
                                <TableCell className="font-medium">{tenant.id}</TableCell>
                                <TableCell>{tenant.company_name}</TableCell>
                                <TableCell>{tenant.contact_person_name}</TableCell>
                                <TableCell>{tenant.contact_email}</TableCell>
                                <TableCell>{tenant.contact_phone}</TableCell>
                                <TableCell>Technology</TableCell>
                                <TableCell>₹{tenant.monthly_rent.toLocaleString()}</TableCell>
                                <TableCell>{new Date(tenant.lease_start_date).toLocaleDateString()}</TableCell>
                                <TableCell>{new Date(tenant.lease_end_date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(tenant.status)}>
                                    {tenant.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Tenant
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>


      </div>
    </DashboardLayout>
  );
}