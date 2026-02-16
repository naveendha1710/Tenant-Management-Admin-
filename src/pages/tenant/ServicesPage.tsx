import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CreditCard, 
  Upload, 
  Wrench, 
  User, 
  BarChart3,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

const services = [
  {
    id: 'lease',
    title: 'Lease Management',
    description: 'View and manage your lease agreements, renewals, and amendments',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    features: [
      'View current lease agreement',
      'Download lease documents',
      'Digital signature for renewals',
      'Lease history and amendments'
    ],
    status: 'active',
    url: '/tenant/my-lease'
  },
  {
    id: 'invoices',
    title: 'Invoice Management',
    description: 'View invoices, make payments, and track payment history',
    icon: CreditCard,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    features: [
      'View all invoices',
      'Online payment gateway',
      'Payment history tracking',
      'Download receipts'
    ],
    status: 'active',
    url: '/tenant/my-invoices'
  },
  {
    id: 'documents',
    title: 'Compliance Management',
    description: 'Upload and manage compliance documents with expiry tracking',
    icon: Upload,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    features: [
      'Upload compliance documents',
      'Document verification status',
      'Expiry date reminders',
      'Document history'
    ],
    status: 'active',
    url: '/tenant/my-documents'
  },
  {
    id: 'maintenance',
    title: 'Maintenance Request System',
    description: 'Submit and track maintenance requests for your space',
    icon: Wrench,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    features: [
      'Submit maintenance tickets',
      'Track request status',
      'Upload supporting images',
      'Communication with staff'
    ],
    status: 'active',
    url: '/tenant/maintenance-requests'
  },
  {
    id: 'profile',
    title: 'Account Management',
    description: 'Manage your profile information and account settings',
    icon: User,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    features: [
      'Update company information',
      'Change contact details',
      'Password management',
      'Account activity'
    ],
    status: 'active',
    url: '/tenant/my-account'
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    description: 'View insights about your space utilization and expenses',
    icon: BarChart3,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    features: [
      'Space utilization metrics',
      'Payment analytics',
      'Maintenance statistics',
      'Compliance tracking'
    ],
    status: 'coming_soon',
    url: '/tenant/dashboard'
  }
];

export default function ServicesPage() {
  const navigate = useNavigate();

  const handleServiceClick = (service: any) => {
    if (service.status === 'active') {
      navigate(service.url);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'coming_soon': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'maintenance': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'coming_soon': return <Badge className="bg-yellow-100 text-yellow-800">Coming Soon</Badge>;
      case 'maintenance': return <Badge className="bg-orange-100 text-orange-800">Under Maintenance</Badge>;
      default: return null;
    }
  };

  return (
    <DashboardLayout title="Services" subtitle="Explore all available services and features">
      <div className="space-y-4 sm:space-y-6">
        {/* Services Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Available Services</CardTitle>
            <CardDescription>
              Access all tenant services from one central location. Click on any service to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {services.map((service) => {
                const IconComponent = service.icon;
                return (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      service.status === 'active' ? 'hover:scale-105' : 'opacity-75'
                    }`}
                    onClick={() => handleServiceClick(service)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className={`p-2 rounded-lg ${service.bgColor}`}>
                          <IconComponent className={`h-6 w-6 ${service.color}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(service.status)}
                          {getStatusBadge(service.status)}
                        </div>
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {service.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {service.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {service.status === 'active' ? (
                        <Button className="w-full" size="sm">
                          Access Service
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button className="w-full" size="sm" variant="outline" disabled>
                          {service.status === 'coming_soon' ? 'Coming Soon' : 'Under Maintenance'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used actions for your convenience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/tenant/my-invoices')}
              >
                <CreditCard className="h-5 w-5" />
                <span>Pay Invoice</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/tenant/maintenance-requests')}
              >
                <Wrench className="h-5 w-5" />
                <span>Report Issue</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/tenant/my-documents')}
              >
                <Upload className="h-5 w-5" />
                <span>Upload Document</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/tenant/my-lease')}
              >
                <FileText className="h-5 w-5" />
                <span>View Lease</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>Current status of all tenant services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <service.icon className={`h-5 w-5 ${service.color}`} />
                    <div>
                      <p className="font-medium">{service.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.status === 'active' ? 'Fully operational' : 
                         service.status === 'coming_soon' ? 'Feature in development' : 
                         'Temporary maintenance'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}