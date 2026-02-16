import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Wrench, CalendarDays, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActionCenterProps {
  kpis: {
    pendingInvoices: number;
    openTickets: number;
    expiringDocuments: number;
    daysUntilExpiry: number | null;
  };
  loading: boolean;
  onRenewalRequest: () => void;
}

export function ActionCenter({ kpis, loading, onRenewalRequest }: ActionCenterProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Action Center</CardTitle>
        <CardDescription>Key metrics and urgent tasks at a glance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Key Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{kpis.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">Require Payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Maintenance Tickets</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{kpis.openTickets}</div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Documents</CardTitle>
               <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{kpis.expiringDocuments}</div>
               <p className="text-xs text-muted-foreground">Expiring in 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Until Lease Expiry</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{kpis.daysUntilExpiry ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Days Remaining</p>
            </CardContent>
          </Card>
        </div>

        {/* Urgent To-Do List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Urgent Actions</h3>
          <div className="space-y-3">
            {kpis.daysUntilExpiry !== null && kpis.daysUntilExpiry <= 30 && (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Your lease agreement expires in {kpis.daysUntilExpiry} days.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={onRenewalRequest}>Request Renewal</Button>
              </div>
            )}
            {kpis.pendingInvoices > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">You have {kpis.pendingInvoices} pending invoice(s).</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => navigate('/tenant/invoices')}>Pay Now</Button>
              </div>
            )}
            {kpis.expiringDocuments > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-medium text-orange-800">You have {kpis.expiringDocuments} document(s) expiring soon.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/tenant/my-documents')}>Update Document</Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
