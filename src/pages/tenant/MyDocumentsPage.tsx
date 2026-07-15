import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// AlertDialog imports removed as delete functionality is no longer needed.
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, Eye, Trash2, FileText, AlertTriangle, CheckCircle, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { supabase } from '@/lib/supabaseClient';
import { BranchTabs } from '@/components/tenant/BranchTabs';
import { useAuth } from '@/contexts/AuthContext';

const getDocumentTypes = (isGstCompany: boolean) => {
  const baseTypes = [
    { value: 'pan_card', label: 'PAN Card', required: true },
    { value: 'company_registration', label: 'Company Registration', required: true },
    { value: 'insurance', label: 'Insurance Documents', required: false },
    { value: 'id_proof', label: 'ID Proof', required: false },
    { value: 'address_proof', label: 'Address Proof', required: false }
  ];
  
  if (isGstCompany) {
    return [{ value: 'gst_certificate', label: 'GST Certificate', required: true }, ...baseTypes];
  }
  
  return baseTypes;
};

export default function MyDocumentsPage() {
  const { tenant, loading: tenantLoading } = useTenantProfile();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTenantIds, setActiveTenantIds] = useState<string[]>([]);
  const documentsTableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const documentTypes = tenant ? getDocumentTypes(tenant.is_gst_company) : [];

  useEffect(() => {
    const initTenantIds = async () => {
      if (!user?.email || activeTenantIds.length > 0) return;
      
      // First check if user has tenantId in their profile
      if (user?.appUser?.tenantId) {
        setActiveTenantIds([user.appUser.tenantId]);
        return;
      }
      
      // Fallback: try to find tenant by email
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (error) {
          console.error('Error loading tenant:', error);
          return;
        }
        
        if (data) setActiveTenantIds([data.id]);
      } catch (error) {
        console.error('Error in initTenantIds:', error);
      }
    };
    initTenantIds();
  }, [user?.email, user?.appUser?.tenantId]);

  useEffect(() => {
    if (activeTenantIds.length === 0) {
      setLoading(false);
      return;
    }
    
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, company, documents')
          .in('id', activeTenantIds);
        
        if (error) throw error;
        const allDocs = data?.flatMap(t => 
          (t.documents || []).map((doc: any) => ({ ...doc, tenantName: t.company }))
        ) || [];
        setDocuments(allDocs);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, [activeTenantIds, toast]);

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedFile || !tenant) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('category', 'tenant-documents');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });
      
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      
      const result = await response.json();
      if (!result.success) throw new Error('Upload failed');
      
      const { data: tenantData, error: fetchError } = await supabase
        .from('tenants')
        .select('documents')
        .eq('id', tenant.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newDoc = {
        id: Date.now().toString(),
        document_type: formData.get('documentType') as string,
        document_name: formData.get('documentName') as string,
        expiry_date: formData.get('expiryDate') as string || null,
        status: 'pending_verification',
        uploaded_date: new Date().toISOString(),
        file_size: selectedFile.size,
        file_path: result.file.path,
        file_url: result.file.url
      };
      
      const updatedDocs = [...(tenantData.documents || []), newDoc];
      const { error } = await supabase
        .from('tenants')
        .update({ documents: updatedDocs })
        .eq('id', tenant.id);
      
      if (error) throw error;
      
      setDocuments([{
        id: newDoc.id,
        document_type: newDoc.document_type,
        document_name: newDoc.document_name,
        expiry_date: newDoc.expiry_date,
        status: newDoc.status,
        uploaded_date: new Date(newDoc.uploaded_date).toISOString().split('T')[0],
        file_size: `${(newDoc.file_size / 1024 / 1024).toFixed(1)} MB`,
        file_path: newDoc.file_path,
        file_url: newDoc.file_url
      }, ...documents]);
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({ title: "Success", description: "Document uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleViewDocument = (doc: any) => {
    const fileUrl = doc.file_url || doc.file_path;
    if (fileUrl) {
      const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;
      window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({ title: "Error", description: "Document not available", variant: "destructive" });
    }
  };

  // Delete functionality removed as per requirement to hide edit/delete options.

  const handleViewDetails = () => {
    documentsTableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      verified: 'bg-green-100 text-green-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      expiring_soon: 'bg-orange-100 text-orange-800',
      expired: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring_soon': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Calendar className="h-4 w-4 text-yellow-500" />;
    }
  };

  const expiringDocuments = documents.filter(doc => {
    if (doc.status === 'expiring_soon') return true;
    if (!doc.expiry_date) return false;
    const expiryDate = new Date(doc.expiry_date);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate <= thirtyDaysFromNow;
  });

  const verifiedDocuments = documents.filter(doc => doc.status === 'verified');
  const requiredDocumentTypes = documentTypes.filter(type => type.required);
  const complianceRate = requiredDocumentTypes.length > 0 
    ? Math.round((verifiedDocuments.length / requiredDocumentTypes.length) * 100)
    : 0;

  if (tenantLoading || loading) {
    return (
      <DashboardLayout title="My Documents" subtitle="Loading your documents...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!tenant) {
    return (
      <DashboardLayout title="My Documents" subtitle="No tenant data found">
        <Card>
          <CardContent className="p-6">
            <p>Unable to load document information. Please contact support.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Documents" subtitle="Manage your compliance documents and certificates">
      <div className="space-y-4 sm:space-y-6">
        <BranchTabs onBranchChange={setActiveTenantIds} />
        
        {expiringDocuments.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span>
                  {expiringDocuments.length} document(s) expiring soon. Please renew to maintain compliance.
                </span>
                <Button variant="outline" size="sm" onClick={handleViewDetails}>
                  View Details
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{verifiedDocuments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{expiringDocuments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Compliance Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{complianceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Requirements</CardTitle>
            <CardDescription>Required documents for compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {requiredDocumentTypes.map((type) => {
                const hasDocument = verifiedDocuments.some(doc => doc.document_type === type.value);
                const isPanVerified = type.value === 'pan_card' && tenant.pan_number;
                const isGstVerified = type.value === 'gst_certificate' && tenant.gst_number;
                const isVerified = hasDocument || isPanVerified || isGstVerified;
                
                return (
                  <div key={type.value} className="flex items-center gap-3 p-3 border rounded-lg">
                    {isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {isVerified ? 'Verified' : 'Required'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card ref={documentsTableRef}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>Manage your uploaded documents</CardDescription>
              </div>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">{document.tenantName || 'Main'}</TableCell>
                      <TableCell className="capitalize">
                        {document.document_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="font-medium">{document.document_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(document.status)}
                          <Badge className={getStatusColor(document.status)}>
                            {document.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {document.expiry_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(document.expiry_date).toLocaleDateString()}
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{new Date(document.upload_date || document.uploaded_date).toLocaleDateString()}</TableCell>
                      <TableCell>{document.size || document.file_size || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDocument(document)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDocument(document)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload a new compliance document</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Select name="documentType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} {type.required && '*'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="documentName">Document Name</Label>
                <Input 
                  id="documentName" 
                  name="documentName" 
                  placeholder="Enter document name" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                <Input 
                  id="expiryDate" 
                  name="expiryDate" 
                  type="date" 
                />
              </div>
              
              <div className="space-y-2">
                <Label>File Upload</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <Input 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    id="file-upload"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Choose File
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, JPG, PNG, DOC up to 10MB
                  </p>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={!selectedFile}>
                Upload Document
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{documentToDelete?.document_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteDocument}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
