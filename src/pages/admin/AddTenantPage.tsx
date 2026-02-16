import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// Admin client for user management
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Building, User, Mail, Phone, MapPin, CheckCircle, Key, Settings, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AddTenantPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [maintenanceCategories, setMaintenanceCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    monthly_rent: '',
    lease_start: '',
    lease_end: '',
    security_deposit: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load maintenance categories
  useState(() => {
    const loadCategories = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'maintenance_categories')
          .single();
        if (data?.value) {
          setMaintenanceCategories(data.value);
        }
      } catch (error) {
        console.error('Failed to load maintenance categories:', error);
      }
    };
    loadCategories();
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.company_name.trim()) newErrors.company_name = 'Company name is required';
    if (!formData.contact_person.trim()) newErrors.contact_person = 'Contact person name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
        newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[0-9\s-()]{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.monthly_rent || parseFloat(formData.monthly_rent) <= 0) newErrors.monthly_rent = 'Valid monthly rent is required';
    if (!formData.lease_start) newErrors.lease_start = 'Lease start date is required';
    if (!formData.lease_end) newErrors.lease_end = 'Lease end date is required';
    if (formData.lease_start && formData.lease_end && new Date(formData.lease_start) >= new Date(formData.lease_end)) {
      newErrors.lease_end = 'Lease end date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug: Log the form data BEFORE validation
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Raw form data:', formData);
    console.log('Lease start value:', JSON.stringify(formData.lease_start));
    console.log('Lease end value:', JSON.stringify(formData.lease_end));
    console.log('Lease start length:', formData.lease_start.length);
    console.log('Lease end length:', formData.lease_end.length);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsLoading(true);

    try {

      // Step 1: Create auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true
      });

      if (authError) {
        toast({ title: "Authentication Error", description: authError.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast({ title: "Error", description: "Could not create user.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Step 2: Create profile using the auth user's ID
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: authData.user.id,
          name: formData.contact_person,
          email: formData.email,
          role: 'tenant'
        });

      if (profileError) {
        toast({ title: "Profile Error", description: `User was created, but profile could not be saved: ${profileError.message}`, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Step 3: Create tenant record using correct column names
      const tenantData = {
        company_name: formData.company_name,
        contact_person_name: formData.contact_person,
        email: formData.email,
        contact_phone: formData.phone,
        monthly_rent: parseFloat(formData.monthly_rent) || 0,
        security_deposit: parseFloat(formData.security_deposit) || 0,
        lease_start_date: formData.lease_start && formData.lease_start.trim() ? formData.lease_start : null,
        lease_end_date: formData.lease_end && formData.lease_end.trim() ? formData.lease_end : null,
        auth_id: authData.user.id,
        status: 'active'
      };
      
      console.log('Tenant data being inserted:', tenantData);
      
      const { error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert(tenantData);

      if (tenantError) {
        toast({ title: "Tenant Error", description: `User created but tenant record failed: ${tenantError.message}`, variant: "destructive" });
      } else {
        toast({ title: "Success!", description: "Tenant created successfully and will appear in the tenant list." });
        navigate('/admin/tenants');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create tenant", variant: "destructive" });
    }

    setIsLoading(false);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    const categoryName = newCategory.toLowerCase().replace(/\s+/g, '_');
    const newCat = { name: categoryName, display_name: newCategory };
    const updatedCategories = [...maintenanceCategories, newCat];
    
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: updatedCategories })
        .eq('key', 'maintenance_categories');
      
      if (!error) {
        setMaintenanceCategories(updatedCategories);
        setNewCategory('');
        toast({ title: "Success", description: "Category added successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const updatedCategories = maintenanceCategories.filter(cat => cat.name !== categoryName);
    
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: updatedCategories })
        .eq('key', 'maintenance_categories');
      
      if (!error) {
        setMaintenanceCategories(updatedCategories);
        toast({ title: "Success", description: "Category deleted successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Add New Tenant" subtitle="Create a new tenant record and user account">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" onClick={() => navigate('/admin/tenants')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Button>
          <Button variant="outline" onClick={() => setShowCategoriesDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Maintenance Categories
          </Button>
        </div>

        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Tenant Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input id="company_name" value={formData.company_name} onChange={(e) => handleInputChange('company_name', e.target.value)} className={errors.company_name ? 'border-red-500' : ''} />
                {errors.company_name && <p className="text-sm text-red-500">{errors.company_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person Name *</Label>
                <Input id="contact_person" value={formData.contact_person} onChange={(e) => handleInputChange('contact_person', e.target.value)} className={errors.contact_person ? 'border-red-500' : ''} />
                {errors.contact_person && <p className="text-sm text-red-500">{errors.contact_person}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Contact Email (for login) *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={errors.email ? 'border-red-500' : ''} />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} className={errors.password ? 'border-red-500' : ''} />
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone Number *</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className={errors.phone ? 'border-red-500' : ''} />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} className={errors.location ? 'border-red-500' : ''} placeholder="Building, Floor, Unit" />
                {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (₹) *</Label>
                  <Input id="monthly_rent" type="number" value={formData.monthly_rent} onChange={(e) => handleInputChange('monthly_rent', e.target.value)} className={errors.monthly_rent ? 'border-red-500' : ''} />
                  {errors.monthly_rent && <p className="text-sm text-red-500">{errors.monthly_rent}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
                  <Input id="security_deposit" type="number" value={formData.security_deposit} onChange={(e) => handleInputChange('security_deposit', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lease_start">Lease Start Date *</Label>
                  <Input id="lease_start" type="date" value={formData.lease_start} onChange={(e) => handleInputChange('lease_start', e.target.value)} className={errors.lease_start ? 'border-red-500' : ''} />
                  {errors.lease_start && <p className="text-sm text-red-500">{errors.lease_start}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lease_end">Lease End Date *</Label>
                  <Input id="lease_end" type="date" value={formData.lease_end} onChange={(e) => handleInputChange('lease_end', e.target.value)} className={errors.lease_end ? 'border-red-500' : ''} />
                  {errors.lease_end && <p className="text-sm text-red-500">{errors.lease_end}</p>}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/tenants')} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating Tenant...' : 'Create Tenant'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Maintenance Categories Dialog */}
        <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Maintenance Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {maintenanceCategories.map((cat) => (
                  <div key={cat.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                    <span className="font-medium">{cat.display_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(cat.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
