import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  CreditCard, 
  Wrench,
  AlertTriangle,
  Calendar,
  Download,
  TrendingUp,
  Loader2,
  Plus,
  ChevronDown,
  Building2
} from 'lucide-react';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Agreement {
  id: string;
  rent_amount: number;
  lease_tenure: string;
  rent_commencement_date: string;
  lease_end_date: string;
  status: string;
  escalations: any[];
  maintenance_charges: any[];
  general_charges: any[];
  service_charge: any;
}

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  created_at: string;
}

export default function TenantDashboard() {
  const navigate = useNavigate();
  const { tenant, loading } = useTenantProfile();
  const { user } = useAuth();
  
  // Redirect if Dashboard is disabled
  useEffect(() => {
    if (!user?.appUser?.permissions) return;
    
    const hasDashboardAccess = user.appUser.permissions.some((p: any) => p.module === 'Dashboard' && p.view);
    
    if (!hasDashboardAccess) {
      // Find first available tab
      const availableTabs = [
        { module: 'My Lease', path: '/tenant/lease' },
        { module: 'Invoices', path: '/tenant/invoices' },
        { module: 'Documents', path: '/tenant/documents' },
        { module: 'Maintenance', path: '/tenant/maintenance-requests' },
        { module: 'My Assets', path: '/tenant/my-assets' }
      ];
      
      const firstAvailable = availableTabs.find(tab => 
        user.appUser.permissions.some((p: any) => p.module === tab.module && p.view)
      );
      
      if (firstAvailable) {
        navigate(firstAvailable.path, { replace: true });
      }
    }
  }, [user, navigate]);
  const [openTickets, setOpenTickets] = useState(0);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [currentRent, setCurrentRent] = useState(0);
  const [rentBreakdown, setRentBreakdown] = useState({ floor: 0, maintenance: 0, general: 0, service: 0 });
  const [leaseProgress, setLeaseProgress] = useState(0);
  const [totalLeaseMonths, setTotalLeaseMonths] = useState(0);
  const [elapsedMonths, setElapsedMonths] = useState(0);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);
  const [activeTenantIds, setActiveTenantIds] = useState<string[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string>('');

  useEffect(() => {
    const loadBranches = async () => {
      if (!user?.email) return;
      
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('id, company')
        .eq('email', user.email)
        .single();

      if (!currentTenant) return;

      const branchAccess = user.appUser?.branchAccess || [];
      const allBranches = [currentTenant];
      
      if (branchAccess.length > 0) {
        const { data: accessibleBranches } = await supabase
          .from('tenants')
          .select('id, company')
          .in('id', branchAccess);
        
        if (accessibleBranches) {
          allBranches.push(...accessibleBranches);
        }
      }
      
      setBranches(allBranches);
      setActiveTenantIds([currentTenant.id]);
      setCurrentTenantId(currentTenant.id);
      setSelectedBranch(currentTenant.id);
    };
    
    loadBranches();
  }, [user]);

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('tenant_video_played');
    
    if (!hasPlayed) {
      setShouldPlayVideo(true);
      sessionStorage.setItem('tenant_video_played', 'true');
    }

    const handleBeforeUnload = () => {
      sessionStorage.removeItem('tenant_video_played');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleVideoEnd = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.currentTime = video.duration;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email) return;
      
      try {
        const { data: tenantData, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (error) {
          console.error('Error loading tenant:', error);
          return;
        }

        if (tenantData && activeTenantIds.length === 0) {
          setActiveTenantIds([tenantData.id]);
          return;
        }

        if (!tenantData || activeTenantIds.length === 0) return;

        const { data: agreementsData } = await supabase
          .from('agreements')
          .select('*')
          .in('tenant_id', activeTenantIds)
          .eq('status', 'Active');

        if (agreementsData && agreementsData.length > 0) {
            setAgreements(agreementsData);
            
            let totalRent = 0;
            let totalFloor = 0;
            let totalMaintenance = 0;
            let totalGeneral = 0;
            let totalService = 0;
            let earliestStart: Date | null = null;
            let latestEnd: Date | null = null;
            
            agreementsData.forEach((agreementData) => {
              const today = new Date();
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              
              let floorRent = agreementData.rent_amount || 0;
              const escalations = agreementData.escalations || [];
              escalations.forEach((esc: any) => {
                if (esc.date && new Date(esc.date) <= today) {
                  floorRent = floorRent + (floorRent * (esc.percentage || 0) / 100);
                }
              });
              floorRent = Math.round(floorRent);
              
              const maintenanceCharges = agreementData.maintenance_charges?.filter((c: any) => !c.isIncludedInRent) || [];
              const maintenanceTotal = maintenanceCharges.reduce((sum: number, c: any) => sum + ((c.sqft || 0) * (c.ratePerSqft || 0)), 0);
              
              const generalCharges = agreementData.general_charges?.filter((c: any) => {
                if (c.dueDate) {
                  const dueDate = new Date(c.dueDate);
                  return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
                }
                return false;
              }) || [];
              const generalTotal = generalCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
              
              const serviceCharge = agreementData.service_charge;
              const serviceTotal = (serviceCharge && !serviceCharge.isIncludedInRent) ? (serviceCharge.amount || 0) : 0;
              
              totalFloor += floorRent;
              totalMaintenance += maintenanceTotal;
              totalGeneral += generalTotal;
              totalService += serviceTotal;
              totalRent += floorRent + maintenanceTotal + generalTotal + serviceTotal;
              
              const startDate = new Date(agreementData.rent_commencement_date);
              const endDate = new Date(agreementData.lease_end_date);
              
              if (!earliestStart || startDate < earliestStart) earliestStart = startDate;
              if (!latestEnd || endDate > latestEnd) latestEnd = endDate;
            });
            
            setCurrentRent(totalRent);
            setRentBreakdown({ 
              floor: Math.round(totalFloor), 
              maintenance: Math.round(totalMaintenance), 
              general: Math.round(totalGeneral), 
              service: Math.round(totalService) 
            });
            
            if (earliestStart && latestEnd) {
              const today = new Date();
              const totalDays = (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24);
              const elapsedDays = (today.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24);
              setLeaseProgress(Math.min((elapsedDays / totalDays) * 100, 100));
              
              const totalMonths = Math.floor(totalDays / 30);
              const elapsed = Math.floor(elapsedDays / 30);
              setTotalLeaseMonths(totalMonths);
              setElapsedMonths(elapsed);
            }
        }
        
        const { count } = await supabase
            .from('maintenance_tickets')
            .select('id', { count: 'exact', head: true })
            .in('tenant_id', activeTenantIds)
            .neq('status', 'resolved');
        
        setOpenTickets(count || 0);
        
        const { data: ticketsData } = await supabase
            .from('maintenance_tickets')
            .select('id, ticket_number, title, status, created_at')
            .in('tenant_id', activeTenantIds)
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(2);
        
        if (ticketsData) {
          setRecentTickets(ticketsData);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    fetchData();
  }, [user, activeTenantIds]);

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    setActiveTenantIds([value]);
  };

  if (loading || activeTenantIds.length === 0) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!tenant) {
    return (
      <DashboardLayout title="Dashboard" subtitle="No tenant data found">
        <Card>
          <CardContent className="p-6">
            <p>Unable to load tenant information. Please contact support.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const leaseMonthsElapsed = elapsedMonths;
  const leaseTotalMonths = totalLeaseMonths;

  const hasInvoiceAccess = user?.appUser?.permissions?.some((p: any) => p.module === 'Invoices' && p.view) ?? true;
  const hasLeaseAccess = user?.appUser?.permissions?.some((p: any) => p.module === 'My Lease' && p.view) ?? true;
  const hasMaintenanceAccess = user?.appUser?.permissions?.some((p: any) => p.module === 'Maintenance' && p.view) ?? true;

  return (
    <DashboardLayout 
      title={`Welcome back, ${tenant.company}`} 
      subtitle="Your property management dashboard"
      action={
        branches.length > 1 ? (
          <Select value={selectedBranch} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-[250px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.company}{branch.id === currentTenantId ? ' (Main)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="relative">
          <Card className={`relative z-20 overflow-hidden ${
            showCompanyDetails ? 'rounded-b-none' : 'rounded-xl'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/45 via-blue-600/30 to-transparent z-10"></div>
            <video
              autoPlay={shouldPlayVideo}
              muted
              playsInline
              onEnded={handleVideoEnd}
              onLoadedMetadata={(e) => !shouldPlayVideo && (e.currentTarget.currentTime = e.currentTarget.duration)}
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 5%)' }}
              className="absolute right-[-1%] top-0 h-full w-auto object-contain"
            >
              <source src="/videos/tenant_dashboard_logo_animation.mp4?v=3" type="video/mp4" />
            </video>
            <CardContent className="p-6 relative z-20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <h2 className="text-2xl font-bold text-white">{tenant.company}</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    {tenant.is_gst_company ? (
                      <Badge variant="outline">GST Registered</Badge>
                    ) : (
                      <Badge variant="outline">Non-GST</Badge>
                    )}
                  </div>
                  <div className="text-sm text-white/90">
                    <span className="font-medium">{tenant.name}</span> | {tenant.email} | {tenant.phone}
                  </div>
                </div>
                <button
                  onClick={() => setShowCompanyDetails(!showCompanyDetails)}
                  className="text-white/80 hover:text-white transition-all duration-300 relative z-30"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showCompanyDetails ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </CardContent>
          </Card>
          
          <div className={`relative z-10 -mt-2 bg-white border border-gray-200 rounded-b-xl shadow-lg transition-all duration-300 ease-in-out ${
            showCompanyDetails ? 'opacity-100 translate-y-0 max-h-[500px]' : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden'
          }`}>
            <div className="p-6 pt-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">GST Number</span>
                  <p className="font-mono text-sm text-slate-600">{tenant.gst_number || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">PAN Number</span>
                  <p className="font-mono text-sm text-slate-600">{tenant.pan_number || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">TAN Number</span>
                  <p className="font-mono text-sm text-slate-600">{tenant.tan_number || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">CIN Number</span>
                  <p className="font-mono text-sm text-slate-600">{tenant.cin_number || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => hasInvoiceAccess && navigate('/tenant/invoices')}
            onMouseEnter={() => setHoveredCard('rent')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Rent</p>
                  <p className="text-2xl font-bold">₹{currentRent.toLocaleString()}</p>
                  <Badge className="bg-green-100 text-green-800 mt-2">Active</Badge>
                </div>
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <div 
                className={`border-t space-y-1 text-xs transition-all duration-500 ease-in-out overflow-hidden ${
                  hoveredCard === 'rent' ? 'max-h-40 opacity-100 pt-3 mt-3' : 'max-h-0 opacity-0 pt-0 mt-0'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Floor Rent:</span>
                  <span className="font-medium">₹{rentBreakdown.floor.toLocaleString()}</span>
                </div>
                {rentBreakdown.maintenance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance:</span>
                    <span className="font-medium">₹{rentBreakdown.maintenance.toLocaleString()}</span>
                  </div>
                )}
                {rentBreakdown.general > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">General:</span>
                    <span className="font-medium">₹{rentBreakdown.general.toLocaleString()}</span>
                  </div>
                )}
                {rentBreakdown.service > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-medium">₹{rentBreakdown.service.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={hasLeaseAccess ? "cursor-pointer hover:shadow-lg transition-shadow" : "opacity-50"} onClick={() => hasLeaseAccess && navigate('/tenant/lease')}>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Lease Status</p>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-100 text-green-800">{agreements[0]?.status || 'Active'}</Badge>
                  <span className="text-sm">Month {leaseMonthsElapsed} of {leaseTotalMonths}</span>
                </div>
                <Progress value={leaseProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={hasMaintenanceAccess ? "cursor-pointer hover:shadow-lg transition-shadow" : "opacity-50"} 
            onClick={() => hasMaintenanceAccess && navigate('/tenant/maintenance-requests')}
            onMouseEnter={() => setHoveredCard('tickets')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-bold">{openTickets}</p>
                </div>
                <Wrench className="h-8 w-8 text-yellow-600" />
              </div>
              {recentTickets.length > 0 && (
                <div 
                  className={`border-t space-y-2 transition-all duration-500 ease-in-out overflow-hidden ${
                    hoveredCard === 'tickets' ? 'max-h-40 opacity-100 pt-3 mt-3' : 'max-h-0 opacity-0 pt-0 mt-0'
                  }`}
                >
                  {recentTickets.slice(0, 2).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1">{ticket.title}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasInvoiceAccess && (
                <Button className="w-full" onClick={() => navigate('/tenant/invoices')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  View Invoices
                </Button>
              )}
              {hasLeaseAccess && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/tenant/lease')}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Lease Details
                </Button>
              )}
              {hasMaintenanceAccess && (
                <Button variant="outline" className="w-full" onClick={() => navigate('/tenant/maintenance-requests')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Raise Ticket
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>Recent updates and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {openTickets > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Wrench className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">Open Maintenance Tickets</p>
                    <p className="text-xs text-yellow-700">You have {openTickets} active ticket(s)</p>
                  </div>
                </div>
              )}
              {agreements.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Lease Active</p>
                    <p className="text-xs text-muted-foreground">Month {leaseMonthsElapsed} of {leaseTotalMonths}</p>
                  </div>
                </div>
              )}
              {currentRent > 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">Current Monthly Rent</p>
                    <p className="text-xs text-green-700">₹{currentRent.toLocaleString()}/month</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest Maintenance Ticket</CardTitle>
            <CardDescription>Your most recent service request</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTickets.length > 0 ? (
              <div
                className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/tenant/maintenance-requests')}
              >
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full border-2 border-slate-300">
                  <Wrench className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-slate-600">#{recentTickets[0].ticket_number}</span>
                    <Badge className={getStatusColor(recentTickets[0].status)}>
                      {recentTickets[0].status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{recentTickets[0].title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Created {new Date(recentTickets[0].created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No maintenance tickets yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}