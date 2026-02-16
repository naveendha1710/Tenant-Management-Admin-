import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { Building2, Plus, Search, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      // Mock data
      const data = [];
      const error = null;
      // const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase.from('branches').insert({
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        postal_code: formData.get('postalCode') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Branch created successfully",
      });
      
      setIsDialogOpen(false);
      fetchBranches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: formData.get('name') as string,
          address: formData.get('address') as string,
          city: formData.get('city') as string,
          state: formData.get('state') as string,
          postal_code: formData.get('postalCode') as string,
          phone: formData.get('phone') as string,
          email: formData.get('email') as string,
        })
        .eq('id', selectedBranch.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Branch updated successfully",
      });
      
      setIsDialogOpen(false);
      setSelectedBranch(null);
      fetchBranches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Branch deleted successfully",
      });
      
      fetchBranches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredBranches = branches.filter(branch => 
    branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    {
      title: "Total Branches",
      value: branches.length.toString(),
      icon: Building2,
      color: "text-blue-600"
    },
    {
      title: "Active Branches",
      value: branches.length.toString(),
      icon: Building2,
      color: "text-green-600"
    },
    {
      title: "Cities",
      value: new Set(branches.map(b => b.city)).size.toString(),
      icon: MapPin,
      color: "text-purple-600"
    },
    {
      title: "States",
      value: new Set(branches.map(b => b.state)).size.toString(),
      icon: MapPin,
      color: "text-orange-600"
    }
  ];

  return (
    <DashboardLayout 
      title="Branch Management" 
      subtitle="Manage branch locations and settings"
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
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Branch Locations</CardTitle>
                <CardDescription>Manage all branch locations and their details</CardDescription>
              </div>
              <Button onClick={() => { setSelectedBranch(null); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Branches Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBranches.map((branch: any) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {branch.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>{branch.city}, {branch.state}</div>
                              <div className="text-sm text-muted-foreground">{branch.postal_code}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {branch.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {branch.phone}
                              </div>
                            )}
                            {branch.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {branch.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(branch.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => { setSelectedBranch(branch); setIsDialogOpen(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Branch</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this branch? This will affect all associated users and data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteBranch(branch.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branch Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedBranch ? 'Edit Branch' : 'Create New Branch'}</DialogTitle>
              <DialogDescription>
                {selectedBranch ? 'Update branch information' : 'Add a new branch location'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={selectedBranch ? handleUpdateBranch : handleCreateBranch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={selectedBranch?.name || ''}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  name="address" 
                  defaultValue={selectedBranch?.address || ''}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    defaultValue={selectedBranch?.city || ''}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state" 
                    name="state" 
                    defaultValue={selectedBranch?.state || ''}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input 
                  id="postalCode" 
                  name="postalCode" 
                  defaultValue={selectedBranch?.postal_code || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={selectedBranch?.phone || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  defaultValue={selectedBranch?.email || ''}
                />
              </div>
              <Button type="submit" className="w-full">
                {selectedBranch ? 'Update Branch' : 'Create Branch'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}