import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Building2, Users, Edit, Trash2, Eye, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface TenantTitle {
  id: string;
  name: string;
  description?: string;
  company_count: number;
  created_at: string;
}

interface Company {
  id: string;
  title_id: string;
  company_name: string;
  contact_person_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  monthly_rent: number;
  lease_start_date?: string;
  lease_end_date?: string;
}

export default function TenantTitlesPage() {
  const { titleId } = useParams();
  const [titles, setTitles] = useState<TenantTitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<TenantTitle | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isAddTitleOpen, setIsAddTitleOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form states
  const [titleForm, setTitleForm] = useState({ name: '', description: '' });
  const [companyForm, setCompanyForm] = useState({
    company_name: '', contact_person_name: '', contact_email: '', 
    contact_phone: '', monthly_rent: 0, status: 'active'
  });

  useEffect(() => {
    fetchTitles();
  }, []);

  useEffect(() => {
    if (titleId && titles.length > 0) {
      const title = titles.find(t => t.id === titleId);
      if (title) {
        setSelectedTitle(title);
      }
    }
  }, [titleId, titles]);

  useEffect(() => {
    if (selectedTitle) {
      fetchCompanies(selectedTitle.id);
    }
  }, [selectedTitle]);

  const fetchTitles = async () => {
    try {
      const mockTitles = [
        { id: '1', name: 'SEZ1', description: 'Special Economic Zone 1', company_count: 3, created_at: '2024-01-01' },
        { id: '2', name: 'SEZ2', description: 'Special Economic Zone 2', company_count: 2, created_at: '2024-01-02' },
        { id: '3', name: 'Tech Hub', description: 'Technology Companies Hub', company_count: 1, created_at: '2024-01-03' }
      ];
      setTitles(mockTitles);
    } catch (error: any) {
      console.error('Error fetching titles:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };



  const fetchCompanies = async (titleId: string) => {
    try {
      const mockCompanies = [
        { id: '1', title_id: titleId, company_name: 'TechStart Solutions', contact_person_name: 'John Doe', contact_email: 'john@techstart.com', contact_phone: '+91 9876543210', status: 'active', monthly_rent: 25000 },
        { id: '2', title_id: titleId, company_name: 'Innovate Labs', contact_person_name: 'Jane Smith', contact_email: 'jane@innovate.com', contact_phone: '+91 9876543211', status: 'active', monthly_rent: 30000 }
      ];
      setCompanies(mockCompanies.filter(c => c.title_id === titleId));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      toast({ title: 'Success', description: 'Title created successfully' });
      setTitleForm({ name: '', description: '' });
      setIsAddTitleOpen(false);
      fetchTitles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitle) return;
    
    try {
      toast({ title: 'Success', description: 'Company created successfully' });
      setCompanyForm({
        company_name: '', contact_person_name: '', contact_email: '', 
        contact_phone: '', monthly_rent: 0, status: 'active'
      });
      setIsAddCompanyOpen(false);
      fetchCompanies(selectedTitle.id);
      fetchTitles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteTitle = async (titleId: string) => {
    if (!confirm('Are you sure? This will delete all companies under this title.')) return;
    
    try {
      toast({ title: 'Success', description: 'Title deleted successfully' });
      fetchTitles();
      if (selectedTitle?.id === titleId) {
        setSelectedTitle(null);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    
    try {
      toast({ title: 'Success', description: 'Company deleted successfully' });
      fetchCompanies(selectedTitle!.id);
      fetchTitles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Tenant Management" subtitle="Manage titles and companies">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tenant Management" subtitle="Manage titles and companies">
      <div className="space-y-4 sm:space-y-6">
        {/* Title List View */}
        {!selectedTitle ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">Tenant Titles</h2>
              <Button onClick={() => setIsAddTitleOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Title
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {titles.map((title) => (
                <Card key={title.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      <Badge variant="outline">{title.company_count} companies</Badge>
                    </div>
                    <CardTitle className="text-lg">{title.name}</CardTitle>
                    <CardDescription>{title.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        className="flex-1" 
                        variant="outline"
                        onClick={() => setSelectedTitle(title)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Companies
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTitle(title.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Company List View */
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setSelectedTitle(null)}>
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back to Titles
                </Button>
                <div>
                  <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{selectedTitle.name}</h2>
                  <p className="text-muted-foreground">{companies.length} companies</p>
                </div>
              </div>
              <Button onClick={() => setIsAddCompanyOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <Users className="h-6 w-6 text-green-600" />
                      <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                        {company.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{company.company_name}</CardTitle>
                    <CardDescription>{company.contact_person_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>Email: {company.contact_email}</div>
                      <div>Phone: {company.contact_phone}</div>
                      <div>Rent: ₹{company.monthly_rent.toLocaleString()}/month</div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCompany(company.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {companies.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No companies yet</h3>
                <p className="text-muted-foreground mb-4">Add the first company to {selectedTitle.name}</p>
                <Button onClick={() => setIsAddCompanyOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Company
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Add Title Dialog */}
        <Dialog open={isAddTitleOpen} onOpenChange={setIsAddTitleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Title</DialogTitle>
              <DialogDescription>Create a new title/SEZ to group companies</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTitle} className="space-y-4">
              <div>
                <Label htmlFor="title_name">Title Name *</Label>
                <Input
                  id="title_name"
                  value={titleForm.name}
                  onChange={(e) => setTitleForm({...titleForm, name: e.target.value})}
                  placeholder="e.g., SEZ1, Tech Hub"
                  required
                />
              </div>
              <div>
                <Label htmlFor="title_description">Description</Label>
                <Input
                  id="title_description"
                  value={titleForm.description}
                  onChange={(e) => setTitleForm({...titleForm, description: e.target.value})}
                  placeholder="Brief description of this title"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddTitleOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Create Title</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Company Dialog */}
        <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>Add a company to {selectedTitle?.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm({...companyForm, company_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={companyForm.contact_person_name}
                    onChange={(e) => setCompanyForm({...companyForm, contact_person_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={companyForm.contact_email}
                    onChange={(e) => setCompanyForm({...companyForm, contact_email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    value={companyForm.contact_phone}
                    onChange={(e) => setCompanyForm({...companyForm, contact_phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  value={companyForm.monthly_rent}
                  onChange={(e) => setCompanyForm({...companyForm, monthly_rent: Number(e.target.value)})}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddCompanyOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Add Company</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}