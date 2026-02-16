import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Eye, UserCheck, Trash2, Plus, Building2, Mail, Phone } from 'lucide-react';

export default function CircularView() {
  const { spanId } = useParams();
  const [tenants, setTenants] = useState<any[]>([]);
  const [spanName, setSpanName] = useState('');

  useEffect(() => {
    loadTenants();
  }, [spanId]);

  const loadTenants = () => {
    // Mock tenants data for SPAN groups
    const mockTenants = {
      'SPAN1': [
        { id: '1', company_name: 'Alpha Technologies', contact_person: 'Rajesh Kumar', email: 'rajesh@alpha.com', phone: '+91 9876543220', status: 'active', assigned: true, monthly_rent: 28000 },
        { id: '2', company_name: 'Beta Solutions', contact_person: 'Priya Sharma', email: 'priya@beta.com', phone: '+91 9876543221', status: 'active', assigned: false, monthly_rent: 32000 },
        { id: '3', company_name: 'Gamma Innovations', contact_person: 'Arjun Patel', email: 'arjun@gamma.com', phone: '+91 9876543222', status: 'pending', assigned: false, monthly_rent: 25000 }
      ],
      'SPAN2': [
        { id: '4', company_name: 'Delta Corp', contact_person: 'Sneha Reddy', email: 'sneha@delta.com', phone: '+91 9876543223', status: 'active', assigned: true, monthly_rent: 35000 },
        { id: '5', company_name: 'Epsilon Systems', contact_person: 'Vikram Singh', email: 'vikram@epsilon.com', phone: '+91 9876543224', status: 'active', assigned: false, monthly_rent: 30000 }
      ]
    };

    const spanTenants = mockTenants[spanId as keyof typeof mockTenants] || [];
    setTenants(spanTenants);
    setSpanName(spanId || '');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      expired: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const handleView = (tenant: any) => {
    console.log('View tenant:', tenant);
  };

  const handleAssignment = (tenant: any) => {
    console.log('Assignment tenant:', tenant);
  };

  const handleDelete = (tenant: any) => {
    if (confirm(`Are you sure you want to delete ${tenant.company_name}?`)) {
      setTenants(prev => prev.filter(t => t.id !== tenant.id));
    }
  };

  return (
    <DashboardLayout title={`${spanName} Tenants`} subtitle={`Manage tenants in ${spanName}`}>
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.filter(t => t.status === 'active').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.filter(t => t.assigned).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{tenants.filter(t => !t.assigned).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{spanName} Tenants</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Tenant
            </Button>
          </div>
          {tenants.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No tenants found in {spanName}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tenant.company_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{tenant.contact_person}</p>
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
                      <div className="text-xs text-muted-foreground mb-1">Monthly Rent</div>
                      <div className="text-sm font-medium">₹{(tenant.monthly_rent || 0).toLocaleString()}</div>
                    </div>
                    
                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(tenant)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignment(tenant)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Assignment
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(tenant)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}