import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Upload, 
  CreditCard, 
  Wrench, 
  Bell, 
  Download, 
  AlertTriangle, 
  Calendar,
  Search,
  Filter,
  Eye,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  PenTool,
  Image,
  Paperclip,
  Mail,
  Phone,
  MessageCircle,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { NotificationService } from '@/components/tenant/NotificationService';
import { DigitalSignature } from '@/components/tenant/DigitalSignature';
import { TicketDetailView } from '@/components/tenant/TicketDetailView';
import { PaymentGateway } from '@/components/tenant/PaymentGateway';
import { ProfileManagement } from '@/components/tenant/ProfileManagement';
import { LeaseManagement } from '@/components/tenant/LeaseManagement';
import { AgreementViewModal } from '@/components/tenant/AgreementViewModal';
import { MaintenanceModule } from '@/components/tenant/MaintenanceModule';
import { ActionCenter } from '@/components/tenant/ActionCenter';
import { exportInvoicesAsExcel, exportInvoicesAsPDF, generateAgreementPDF } from '@/utils/exportTenantData';
import { mockTenantData } from '@/data/mockTenantData'; // Import mock data
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function TenantPortal() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Data states
  const [tenantData, setTenantData] = useState<any>(mockTenantData.profile);
  const [leaseAgreements, setLeaseAgreements] = useState<any[]>(mockTenantData.lease.agreement_history);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>(mockTenantData.notifications);
  const [kpis, setKpis] = useState({
    pendingInvoices: mockTenantData.kpis.pendingInvoices,
    openTickets: mockTenantData.kpis.openTickets,
    expiringDocuments: mockTenantData.kpis.expiringDocuments,
    daysUntilExpiry: mockTenantData.actionCenter.daysUntilExpiry,
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  /*
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTenantDashboardData = async () => {
      setLoading(true);
      try {
        const userEmail = user.id; // This is the email

        // 1. Fetch tenant data
        const { data: tenantsData, error: tenantError } = await supabase
          .from('tenants')
          .select('*, spaces(*, buildings(*))')
          .eq('email', userEmail);

        if (tenantError) throw new Error(`Failed to fetch tenant data: ${tenantError.message}`);
        
        if (tenantsData && tenantsData.length > 1) {
          console.warn("Multiple tenants found with the same email, using the first one. This may indicate a data issue.");
        }

        const tenantData = tenantsData ? tenantsData[0] : null;
        setTenantData(tenantData);

        if (tenantData) {
          const tenantId = tenantData.id; // This is the UUID

          // 2. Fetch related data using the tenant UUID
          const [
            agreementsRes,
            invoiceKpiRes,
            ticketKpiRes,
            docKpiRes,
          ] = await Promise.all([
            supabase.from('agreements').select('*').eq('tenant_id', tenantId).order('start_date', { ascending: false }),
            supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['pending', 'overdue']),
            supabase.from('maintenance_tickets').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).neq('status', 'resolved'),
            supabase.from('compliance_documents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'expiring_soon'),
          ]);

          if (agreementsRes.error) throw new Error(`Failed to fetch agreements: ${agreementsRes.error.message}`);
          setLeaseAgreements(agreementsRes.data || []);

          // Calculate days until expiry
          let daysRemaining = null;
          const currentLease = agreementsRes.data?.find(a => a.is_current);
          if (currentLease?.end_date) {
            const endDate = new Date(currentLease.end_date);
            const today = new Date();
            const diffTime = endDate.getTime() - today.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          setKpis({
            pendingInvoices: invoiceKpiRes.count ?? 0,
            openTickets: ticketKpiRes.count ?? 0,
            expiringDocuments: docKpiRes.count ?? 0,
            daysUntilExpiry: daysRemaining,
          });
        }
      } catch (error: any) {
        console.error('Error loading tenant dashboard data:', error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchTenantDashboardData();
  }, [user, toast]);
  */

  const handleRequestRenewal = async () => {
    if (!user) return;
    try {
      const { data: admins, error: adminError } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
      if (adminError || !admins || admins.length === 0) throw new Error("Could not find an admin to notify.");
      
      const { data: currentUser, error: userError } = await supabase.from('users').select('id').eq('email', user.email).single();
      if (userError) throw new Error("Could not find current user.");

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: admins[0].id,
        created_by: currentUser.id,
        message: `${tenantData?.company_name || 'A tenant'} has requested a lease renewal.`,
        link_to: `/admin/tenants/${tenantData.id}`,
        type: 'renewal_request'
      });

      if (notificationError) throw new Error("Failed to send renewal request notification.");

      toast({ title: "Success", description: "Your lease renewal request has been sent." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadArchive = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();

      // Add Tenant Summary
      const tenantSummaryContent = `
Tenant ID: ${mockTenantData.profile.tenant_id}
Company Name: ${mockTenantData.profile.company_name}
Contact Person: ${mockTenantData.profile.contact_person}
Email: ${mockTenantData.profile.email}
Phone: ${mockTenantData.profile.phone}
Address: ${mockTenantData.profile.address}
Lease Status: ${mockTenantData.profile.lease_status}
Move-in Date: ${mockTenantData.profile.move_in_date}
`;
      zip.file("Tenant_Summary.txt", tenantSummaryContent);

      // Create folders and add placeholder files
      const leaseAgreementsFolder = zip.folder("Lease_Agreements");
      leaseAgreementsFolder?.file("Current_Lease_Agreement.pdf", "Placeholder for current lease agreement content.");
      leaseAgreementsFolder?.file("Previous_Lease_Agreement_2023.pdf", "Placeholder for previous lease agreement content (2023).");

      const invoicesFolder = zip.folder("Invoices_and_Receipts");
      invoicesFolder?.file("Invoice_2024_01.pdf", "Placeholder for January 2024 invoice.");
      invoicesFolder?.file("Receipt_2024_01.pdf", "Placeholder for January 2024 receipt.");

      const complianceFolder = zip.folder("Compliance_Documents");
      complianceFolder?.file("Insurance_Certificate.pdf", "Placeholder for insurance certificate.");
      complianceFolder?.file("Fire_Safety_Compliance.pdf", "Placeholder for fire safety compliance document.");

      // Generate the zip file
      const content = await zip.generateAsync({ type: "blob" });

      // Trigger download
      saveAs(content, "Tenant_Data_Archive.zip");

      toast({ title: "Success", description: "Your data archive has been downloaded." });
    } catch (error: any) {
      console.error("Error generating or downloading archive:", error);
      toast({ title: "Error", description: error.message || "Failed to generate or download archive.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewAgreement = (agreement: any) => {
    setSelectedAgreement(agreement);
    setIsAgreementModalOpen(true);
  };

  const handleDownloadAgreement = (agreement: any) => {
    try {
      generateAgreementPDF(agreement, tenantData.company_name);
      toast({ title: "Download Started", description: "Agreement PDF is being generated." });
    } catch (error) {
      toast({ title: "Download Error", description: "Failed to generate PDF.", variant: "destructive" });
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <DashboardLayout title="Tenant Dashboard" subtitle="Loading your data...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!tenantData) {
    return (
      <DashboardLayout title="Error" subtitle="Could not load tenant information.">
        <Card>
          <CardHeader><CardTitle>Data not found</CardTitle></CardHeader>
          <CardContent><p>We couldn't find the data associated with your account. Please contact support.</p></CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  
  const currentLease = leaseAgreements.find(a => a.is_current);

  return (
    <DashboardLayout title="Tenant Dashboard" subtitle={`Welcome, ${tenantData.company_name}`}>
      <div className="space-y-4 sm:space-y-6">
        <ActionCenter kpis={kpis} loading={loading} onRenewalRequest={handleRequestRenewal} />

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Download a complete archive of your tenant data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadArchive} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isDownloading ? "Preparing Download..." : "Download Full Archive"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Lease Agreement</CardTitle>
            <CardDescription>Your active lease details and agreement history</CardDescription>
          </CardHeader>
          <CardContent>
            {currentLease ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label className="text-sm font-medium">Tenant ID</Label>
                  <p className="mt-1 text-sm">{tenantData.tenant_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Space</Label>
                  <p className="mt-1 text-sm">{tenantData.spaces.buildings.name} - {tenantData.spaces.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Monthly Rent</Label>
                  <p className="mt-1 text-sm">₹{currentLease.monthly_rent.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lease Period</Label>
                  <p className="mt-1 text-sm">
                    {new Date(currentLease.start_date).toLocaleDateString()} - {new Date(currentLease.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : <p>No current lease agreement found.</p>}
            
            <div className="space-y-4">
              <h4 className="font-medium">Agreement History</h4>
              <p className="text-sm text-muted-foreground">All lease agreements and amendments</p>
              
              <div className="space-y-3">
                {leaseAgreements.map((agreement) => (
                  <div key={agreement.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{agreement.title}</div>
                            <div className="text-sm text-muted-foreground">
                              Version {agreement.version} • Signed: {new Date(agreement.signed_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge>{agreement.status.toUpperCase()}</Badge>
                          {agreement.is_current && <Badge variant="secondary">CURRENT</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewAgreement(agreement)}><Eye className="h-4 w-4 mr-1" />View</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadAgreement(agreement)}><Download className="h-4 w-4 mr-1" />Download</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <MaintenanceModule tenantId={tenantData?.id} />

        <NotificationService 
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />

        <AgreementViewModal
          agreement={selectedAgreement}
          tenantName={tenantData.company_name}
          isOpen={isAgreementModalOpen}
          onClose={() => setSelectedAgreement(null)}
        />
      </div>
    </DashboardLayout>
  );
}
