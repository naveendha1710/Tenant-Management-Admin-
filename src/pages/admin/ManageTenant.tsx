import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Edit, User, Building, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";


interface TenantData {
  id: string;
  tenant_id?: string;
  company_name?: string;
  contact_person_name?: string;
  contact_person?: string; // Keep for backward compatibility
  email?: string;
  contact_phone?: string;
  phone?: string; // Keep for backward compatibility
  company_address?: string;
  business_type?: string;
  status?: string;
  monthly_rent?: number;
  security_deposit?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  auth_id?: string;
  space_id?: string;
  created_at?: string;
  updated_at?: string;
}



export default function ManageTenant() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<TenantData>>({});

  useEffect(() => {
    if (tenantId) {
      fetchTenantDetails(tenantId);
    }
  }, [tenantId]);

  const fetchTenantDetails = async (id: string) => {
    try {
      setLoading(true);
      console.log('Fetching tenant details for ID:', id);
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id);

      if (error) {
        console.error('Supabase fetch error:', error);
        throw new Error(`Tenant not found: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Tenant not found');
      }

      const tenantData = data[0];

      setTenant(tenantData);
      setFormData(tenantData);
    } catch (error: any) {
      console.error('Error fetching tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tenant details",
        variant: "destructive"
      });
      navigate('/admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TenantData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!tenant || !formData) return;

    try {
      const updateData = {
        company_name: formData.company_name,
        contact_person_name: formData.contact_person,
        email: formData.email,
        contact_phone: formData.phone,
        company_address: formData.company_address,
        business_type: formData.business_type,
        status: formData.status,
        monthly_rent: formData.monthly_rent,
        security_deposit: formData.security_deposit,
        lease_start_date: formData.lease_start_date,
        lease_end_date: formData.lease_end_date,
        pan_number: formData.pan_number,
        gst_number: formData.gst_number,
        notes: formData.notes,
        space_requirement: formData.space_requirement,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenant.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Failed to update tenant: ${error.message}`);
      }
      
      toast({
        title: "Success",
        description: "Tenant details updated successfully"
      });

      // Update local state
      setTenant({ ...tenant, ...formData });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant details",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Manage Tenant" subtitle="Loading tenant details...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tenant) {
    return (
      <DashboardLayout title="Manage Tenant" subtitle="Tenant not found">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Tenant not found</p>
          <Button onClick={() => navigate('/admin/tenants')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Manage Tenant" 
      subtitle={`${tenant.company_name || 'NULL'} - ${tenant.lead_id || tenant.id}`}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/tenants')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setFormData(tenant);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Tenant
              </Button>
            )}
          </div>
        </div>

        {/* Tenant Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(tenant.status)}>
                {tenant.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{(tenant.monthly_rent || 0).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lease End</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">
                {tenant.lease_end_date ? new Date(tenant.lease_end_date).toLocaleDateString() : 'NULL'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">{tenant.space_requirement || 'NULL'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Details Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                {isEditing ? (
                  <Input
                    id="company_name"
                    value={formData.company_name || ''}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{tenant.company_name || 'NULL'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                {isEditing ? (
                  <Input
                    id="contact_person"
                    value={formData.contact_person || ''}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{tenant.contact_person_name || 'NULL'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{tenant.email || 'NULL'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{tenant.contact_phone || 'NULL'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="space_type">Space Type</Label>
                {isEditing ? (
                  <Input
                    id="sector"
                    value={formData.space_type || ''}
                    onChange={(e) => handleInputChange('space_type', e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{tenant.space_type || 'NULL'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lease Information */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Information</CardTitle>
              <CardDescription>Lease terms and financial details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <Select
                    value={formData.status || ''}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(tenant.status)}>
                    {tenant.status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lease_start_date">Lease Start Date</Label>
                  {isEditing ? (
                    <Input
                      id="lease_start_date"
                      type="date"
                      value={formData.lease_start_date || ''}
                      onChange={(e) => handleInputChange('lease_start_date', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">
                      {tenant.lease_start_date ? new Date(tenant.lease_start_date).toLocaleDateString() : 'NULL'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lease_end_date">Lease End Date</Label>
                  {isEditing ? (
                    <Input
                      id="lease_end_date"
                      type="date"
                      value={formData.lease_end_date || ''}
                      onChange={(e) => handleInputChange('lease_end_date', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">
                      {tenant.lease_end_date ? new Date(tenant.lease_end_date).toLocaleDateString() : 'NULL'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
                  {isEditing ? (
                    <Input
                      id="monthly_rent"
                      type="number"
                      value={formData.monthly_rent || ''}
                      onChange={(e) => handleInputChange('monthly_rent', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm">₹{tenant.monthly_rent?.toLocaleString()}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
                  {isEditing ? (
                    <Input
                      id="security_deposit"
                      type="number"
                      value={formData.security_deposit || ''}
                      onChange={(e) => handleInputChange('security_deposit', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm">₹{tenant.security_deposit?.toLocaleString() || 'NULL'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="space_requirement">Space Requirement</Label>
                {isEditing ? (
                  <Textarea
                    id="space_requirement"
                    value={formData.space_requirement || ''}
                    onChange={(e) => handleInputChange('space_requirement', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm">{tenant.space_requirement || 'NULL'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Legal & Tax Information</CardTitle>
            <CardDescription>PAN, GST and other legal details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                {isEditing ? (
                  <Input
                    id="pan_number"
                    value={formData.pan_number || ''}
                    onChange={(e) => handleInputChange('pan_number', e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{tenant.pan_number || 'NULL'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                {isEditing ? (
                  <Input
                    id="gst_number"
                    value={formData.gst_number || ''}
                    onChange={(e) => handleInputChange('gst_number', e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{tenant.gst_number || 'NULL'}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              {isEditing ? (
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="text-sm">{tenant.notes || 'NULL'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}