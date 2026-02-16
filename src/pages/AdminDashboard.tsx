import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building, DollarSign, Wrench, Plus, Eye, Settings, Building2, Mail, Phone, MoreHorizontal, Edit, Trash2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mockTenants } from '@/data/mockData';
import { OccupancyChart, MonthlyRentChart, RevenueByPropertyChart, PendingPaymentsChart, TenantDistributionChart } from '@/components/charts/DashboardCharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalSpaces: 0,
    occupiedSpaces: 0,
    monthlyRevenue: 0,
    pendingTickets: 0
  });
  const [tenants, setTenants] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddSEZOpen, setIsAddSEZOpen] = useState(false);
  const [selectedSEZ, setSelectedSEZ] = useState(null);
  const [sezForm, setSezForm] = useState({ name: '', description: '' });
  const { toast } = useToast();
  const navigate = useNavigate();

  const sezData = {
    'SEZ1': {
      name: 'SEZ1 - Special Economic Zone 1',
      description: 'Technology and Software Development Zone',
      tenants: mockTenants.filter(t => ['1', '2'].includes(t.id))
    },
    'SEZ2': {
      name: 'SEZ2 - Special Economic Zone 2', 
      description: 'Digital Marketing and Innovation Zone',
      tenants: mockTenants.filter(t => t.id === '3')
    }
  };



  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Use mock data from mockData.ts
      const mockTenantsData = mockTenants.map(tenant => ({
        id: tenant.id,
        company_name: tenant.company_name,
        contact_person: tenant.representative_name,
        email: tenant.contact_email,
        status: tenant.status.toLowerCase(),
        monthly_rent: 25000 + Math.floor(Math.random() * 20000) // Random rent for demo
      }));

      // Mock spaces data
      const mockSpaces = [
        { id: '1', name: 'Office A-101', floor: 1, area: 500, capacity: 10, space_type: 'office', is_occupied: true, monthly_rate: 25000 },
        { id: '2', name: 'Office A-102', floor: 1, area: 600, capacity: 12, space_type: 'office', is_occupied: true, monthly_rate: 30000 },
        { id: '3', name: 'Office A-103', floor: 1, area: 400, capacity: 8, space_type: 'office', is_occupied: false, monthly_rate: 20000 }
      ];
      
      const mockTickets = [
        { id: '1', ticket_number: 'TKT-001', title: 'AC not working', priority: 'high', status: 'pending', created_at: '2024-01-20' },
        { id: '2', ticket_number: 'TKT-002', title: 'WiFi issues', priority: 'medium', status: 'resolved', created_at: '2024-01-19' }
      ];

      setTenants(mockTenantsData);
      setSpaces(mockSpaces);
      setRecentTickets(mockTickets);

      // Calculate stats
      const occupiedSpaces = mockSpaces.filter(space => space.is_occupied).length;
      const monthlyRevenue = mockTenantsData.reduce((sum, tenant) => sum + tenant.monthly_rent, 0);
      const pendingTickets = mockTickets.filter(ticket => ticket.status === 'pending').length;

      setStats({
        totalTenants: mockTenantsData.length,
        totalSpaces: mockSpaces.length,
        occupiedSpaces,
        monthlyRevenue,
        pendingTickets
      });

    } catch (error) {
      console.error('Error loading mock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'default',
      inactive: 'secondary',
      pending: 'outline',
      expired: 'destructive'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard" subtitle="Space & Tenant Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="Space & Tenant Management">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalTenants}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spaces</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalSpaces}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.occupiedSpaces}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSpaces > 0 ? Math.round((stats.occupiedSpaces / stats.totalSpaces) * 100) : 0}% occupancy
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.pendingTickets}</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4 sm:gap-6">
          <OccupancyChart />
          <MonthlyRentChart />
          <RevenueByPropertyChart />
          <PendingPaymentsChart />
          <TenantDistributionChart />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
            <TabsTrigger value="tenants" className="text-xs sm:text-sm">Tenants</TabsTrigger>
            <TabsTrigger value="companies" className="text-xs sm:text-sm">Companies</TabsTrigger>
            <TabsTrigger value="spaces" className="text-xs sm:text-sm">Spaces</TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs sm:text-sm hidden sm:block">Maintenance</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs sm:text-sm">Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-base sm:text-lg md:text-xl">Tenant Management</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage tenant accounts and leases</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/admin/enhanced-tenant-management')} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Enhanced Management</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant: any) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.company_name}</TableCell>
                        <TableCell>{tenant.contact_person}</TableCell>
                        <TableCell>{tenant.email}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(tenant.status) as any}>
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{tenant.monthly_rent?.toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate('/admin/tenants')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            {!selectedSEZ ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg sm:text-base sm:text-lg md:text-xl">Special Economic Zones (SEZ)</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Select a SEZ to view its tenants</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddSEZOpen(true)} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add SEZ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 sm:gap-6">
                    {Object.entries(sezData).map(([sezId, sez]) => (
                      <Card key={sezId} className="border hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedSEZ(sezId)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Building2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{sez.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{sez.description}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="text-sm text-muted-foreground">
                              {sez.tenants.length} Tenants
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Tenants
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Button variant="ghost" onClick={() => setSelectedSEZ(null)} className="w-full sm:w-auto">
                        ← Back to SEZ List
                      </Button>
                      <div className="flex-1">
                        <CardTitle className="text-lg sm:text-base sm:text-lg md:text-xl">{sezData[selectedSEZ].name}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">{sezData[selectedSEZ].description}</CardDescription>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/admin/tenants')} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Add Tenant to {selectedSEZ}</span>
                      <span className="sm:hidden">Add Tenant</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 sm:gap-6">
                    {sezData[selectedSEZ].tenants.map((tenant) => (
                      <Card key={tenant.id} className="border hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{tenant.company_name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{tenant.representative_name}</p>
                              </div>
                            </div>
                            <Badge variant={tenant.status === 'Active' ? 'default' : 'secondary'}>
                              {tenant.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{tenant.contact_email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{tenant.contact_phone}</span>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground mb-1">Monthly Rent</div>
                            <div className="text-sm font-medium">₹{(25000 + Math.floor(Math.random() * 20000)).toLocaleString()}</div>
                          </div>
                          
                          <div className="flex gap-2 pt-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1">
                                  <MoreHorizontal className="h-4 w-4" />
                                  Actions
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Tenant
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="spaces" className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-lg sm:text-base sm:text-lg md:text-xl">Space Management</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Monitor space allocation and availability</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Space Name</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Area (sq ft)</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spaces.map((space: any) => (
                      <TableRow key={space.id}>
                        <TableCell className="font-medium">{space.name}</TableCell>
                        <TableCell>{space.floor}</TableCell>
                        <TableCell>{space.area}</TableCell>
                        <TableCell>{space.capacity}</TableCell>
                        <TableCell>{space.space_type}</TableCell>
                        <TableCell>
                          <Badge variant={space.is_occupied ? 'destructive' : 'default'}>
                            {space.is_occupied ? 'Occupied' : 'Available'}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{space.monthly_rate?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Overview</CardTitle>
                <CardDescription>Maintenance tickets and status</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Maintenance module - Demo mode</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Recent Maintenance Tickets</CardTitle>
                    <CardDescription>Latest maintenance requests and updates</CardDescription>
                  </div>

                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTickets.map((ticket: any) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'default'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ticket.status === 'resolved' ? 'default' : 'outline'}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isAddSEZOpen} onOpenChange={setIsAddSEZOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New SEZ</DialogTitle>
              <DialogDescription>Create a new Special Economic Zone</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              toast({ title: 'Success', description: 'SEZ added successfully' });
              setSezForm({ name: '', description: '' });
              setIsAddSEZOpen(false);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sez_name">SEZ Name *</Label>
                <Input
                  id="sez_name"
                  value={sezForm.name}
                  onChange={(e) => setSezForm({...sezForm, name: e.target.value})}
                  placeholder="e.g., SEZ3, Tech Hub"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sez_description">Description</Label>
                <Input
                  id="sez_description"
                  value={sezForm.description}
                  onChange={(e) => setSezForm({...sezForm, description: e.target.value})}
                  placeholder="Brief description of this SEZ"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddSEZOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Add SEZ</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}