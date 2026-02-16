import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, CreditCard, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import emptyState from "@/assets/empty-state.jpg";

export default function Billing() {
  return (
    <DashboardLayout 
      title="Billing & Accounts" 
      subtitle="Manage invoices, payments, and financial records"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹12.4L</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹2.1L</div>
              <p className="text-xs text-muted-foreground">12 overdue invoices</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invoices
              </CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Payment Rate
              </CardTitle>
              <CreditCard className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">On-time payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Card */}
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <img 
              src={emptyState} 
              alt="Coming soon" 
              className="w-full sm:w-64 h-48 object-cover rounded-lg mb-6 opacity-70"
            />
            <h3 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-semibold mb-4">Billing System Coming Soon</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Advanced billing and accounts management features are in development. 
              This will include invoice generation, payment tracking, and financial reporting.
            </p>
            <div className="flex gap-3">
              <Badge variant="secondary">Auto-Invoice Generation</Badge>
              <Badge variant="secondary">Payment Gateway Integration</Badge>
              <Badge variant="secondary">Financial Reports</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}