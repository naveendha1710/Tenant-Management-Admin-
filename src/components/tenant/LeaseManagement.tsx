import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Download, 
  Eye, 
  PenTool, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LeaseAgreement {
  id: string;
  version: string;
  title: string;
  signed_date: string;
  status: 'active' | 'superseded' | 'pending' | 'expired';
  file_url: string;
  is_current: boolean;
  expiry_date?: string;
  renewal_eligible?: boolean;
}

interface LeaseManagementProps {
  agreements: LeaseAgreement[];
  currentLease: {
    monthly_rent: number;
    lease_start_date: string;
    lease_end_date: string;
    space: {
      name: string;
      building: string;
      area: number;
    };
  };
  onSignDocument: (agreementId: string) => void;
  onRequestRenewal: () => void;
}

export function LeaseManagement({ 
  agreements, 
  currentLease, 
  onSignDocument, 
  onRequestRenewal 
}: LeaseManagementProps) {
  const [selectedAgreement, setSelectedAgreement] = useState<string | null>(null);
  const { toast } = useToast();

  const daysUntilExpiry = Math.ceil(
    (new Date(currentLease.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getRenewalAlert = () => {
    if (daysUntilExpiry <= 30) {
      return { type: 'urgent', message: 'Lease expires in 30 days or less. Immediate action required!' };
    } else if (daysUntilExpiry <= 60) {
      return { type: 'warning', message: 'Lease expires in 60 days. Consider renewal options.' };
    } else if (daysUntilExpiry <= 90) {
      return { type: 'info', message: 'Lease expires in 90 days. Start planning for renewal.' };
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      superseded: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleViewDocument = (agreement: LeaseAgreement) => {
    toast({
      title: "Opening Document",
      description: `Opening ${agreement.title} in document viewer`,
    });
  };

  const handleDownloadDocument = (agreement: LeaseAgreement) => {
    toast({
      title: "Download Started",
      description: `Downloading ${agreement.title}`,
    });
  };

  const renewalAlert = getRenewalAlert();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Renewal Alerts */}
      {renewalAlert && (
        <Alert className={`${
          renewalAlert.type === 'urgent' ? 'border-red-500 bg-red-50' :
          renewalAlert.type === 'warning' ? 'border-orange-500 bg-orange-50' :
          'border-blue-500 bg-blue-50'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span>{renewalAlert.message}</span>
            <Button 
              size="sm" 
              onClick={onRequestRenewal}
              className={
                renewalAlert.type === 'urgent' ? 'bg-red-600 hover:bg-red-700' :
                renewalAlert.type === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Request Renewal
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Lease Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Lease Agreement</CardTitle>
          <CardDescription>Active lease terms and conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Monthly Rent</label>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                ₹{currentLease.monthly_rent.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Lease Period</label>
              <div className="text-sm font-medium">
                {new Date(currentLease.lease_start_date).toLocaleDateString()} - 
                {new Date(currentLease.lease_end_date).toLocaleDateString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Space Details</label>
              <div className="text-sm font-medium">
                {currentLease.space.building} - {currentLease.space.name}
                <br />
                <span className="text-muted-foreground">{currentLease.space.area} sq ft</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Days Remaining</label>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">
                {daysUntilExpiry}
              </div>
              <Progress 
                value={Math.max(0, Math.min(100, ((365 - daysUntilExpiry) / 365) * 100))} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement History */}
      <Card>
        <CardHeader>
          <CardTitle>Agreement History</CardTitle>
          <CardDescription>All lease agreements and amendments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agreements.map((agreement) => (
              <div key={agreement.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{agreement.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Version {agreement.version} • Signed: {new Date(agreement.signed_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(agreement.status)}>
                      {agreement.status.toUpperCase()}
                    </Badge>
                    {agreement.is_current && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        CURRENT
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDocument(agreement)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadDocument(agreement)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  
                  {agreement.status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={() => onSignDocument(agreement.id)}
                    >
                      <PenTool className="mr-2 h-4 w-4" />
                      Sign Document
                    </Button>
                  )}
                  
                  {agreement.is_current && agreement.renewal_eligible && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onRequestRenewal}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Renew
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lease Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Timeline</CardTitle>
          <CardDescription>Important dates and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Lease Started</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(currentLease.lease_start_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Current Period</p>
                <p className="text-sm text-muted-foreground">
                  {daysUntilExpiry} days remaining
                </p>
              </div>
            </div>
            
            <div className={`flex items-center gap-4 p-3 rounded-lg ${
              daysUntilExpiry <= 30 ? 'bg-red-50' : 'bg-orange-50'
            }`}>
              <Calendar className={`h-5 w-5 ${
                daysUntilExpiry <= 30 ? 'text-red-600' : 'text-orange-600'
              }`} />
              <div>
                <p className="font-medium">Lease Expiry</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(currentLease.lease_end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}