import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, FileText, DollarSign } from 'lucide-react';
import { Agreement, generateAgreementPDF } from '@/utils/exportTenantData';

interface AgreementViewModalProps {
  agreement: Agreement | null;
  tenantName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgreementViewModal({ agreement, tenantName, isOpen, onClose }: AgreementViewModalProps) {
  if (!agreement) return null;

  const handleDownload = () => {
    generateAgreementPDF(agreement, tenantName);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      superseded: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {agreement.title}
          </DialogTitle>
          <DialogDescription>
            Agreement version {agreement.version} - {tenantName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Agreement Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agreement Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Start Date:</span>
                    <span className="text-sm font-medium">
                      {agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">End Date:</span>
                    <span className="text-sm font-medium">
                      {agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Signed Date:</span>
                    <span className="text-sm font-medium">
                      {agreement.signed_date ? new Date(agreement.signed_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Rent:</span>
                    <span className="text-sm font-medium">
                      {agreement.monthly_rent ? `₹${agreement.monthly_rent.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge className={getStatusColor(agreement.status)}>
                      {agreement.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Version:</span>
                    <span className="text-sm font-medium">v{agreement.version}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agreement Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agreement Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {agreement.agreement_text || 'Agreement content not available.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}