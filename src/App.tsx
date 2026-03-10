import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RouteGuard, PermissionGuard } from "./components/RouteGuard";

function TenantPermissionGuard({ children, module }: { children: React.ReactNode; module: string }) {
  const { user } = useAuth();
  const hasAccess = user?.appUser?.permissions?.some((p: any) => p.module === module && p.view) ?? true;
  
  if (!hasAccess) {
    return <Navigate to="/not-authorized" replace />;
  }
  
  return <>{children}</>;
}
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import SpaceAllocation from "./pages/SpaceAllocation";
import FloorPlans from "./pages/FloorPlans";
import Analytics from "./pages/Analytics";

import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import NotAuthorized from "./pages/NotAuthorized";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import CrmDashboard from "./pages/CrmDashboard";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import MyLeasePage from "./pages/tenant/MyLeasePage";
import MyInvoicesPage from "./pages/tenant/MyInvoicesPage";
import MyDocumentsPage from "./pages/tenant/MyDocumentsPage";
import MaintenanceRequestsPage from "./pages/tenant/MaintenanceRequestsPage";
import MyAssetsPage from "./pages/tenant/MyAssetsPage";
import TenantCompanyProfile from "./pages/tenant/TenantCompanyProfile";
import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import NotificationsPage from "./pages/NotificationsPage";

import QuotationPage from "./pages/QuotationPage";
import InvoicesPage from "./pages/finance/InvoicesPage";
import BillingPage from "./pages/finance/BillingPage";
import DocumentsPage from "./pages/finance/DocumentsPage";
import { TaxCompliancePage, FinancialReportsPage } from "./pages/finance";
import TenantListPage from "./pages/finance/TenantListPage";
import TenantDetailPage from "./pages/finance/TenantDetailPage";

import {
  ApplicationsPage as AdminApplicationsPage,
  LeadsPage as AdminLeadsPage,
  SpaceAllocationPage,
  BillingPage as AdminBillingPage,
  BuildingsPage,
  FloorPlansPage,
  ManageTicketsPage as AdminManageTicketsPage,
  SettingsPage,
  AddTenantPage,
  ApplicationsApprovalPage,
  TenantApplications
} from "./pages/admin";
import BuildingManage from "./pages/admin/BuildingManage";
import CircularViewPage from "./pages/admin/CircularViewPage";
import AdminOverview from "./pages/admin/Overview";
import AdminSpacesPage from "./pages/admin/SpacesPage";
import ManageTenant from "./pages/admin/ManageTenant";
import TenantManagePage from "./pages/TenantManagePage";
import TenantManage from "./pages/TenantManage";
import CompanyGroup from "./pages/admin/CompanyGroup";
import AccountsPage from "./pages/admin/AccountsPage";
import TenantManagement from "./pages/admin/TenantManagement";
import TenantProfile from "./pages/admin/TenantProfile";
import Settings from "./pages/admin/Settings";
import UserManagement from "./pages/admin/UserManagement";
import MasterSettings from "./pages/admin/MasterSettings";
import ApprovalsPage from "./pages/admin/ApprovalsPage";
import EmailSettingsPage from "./pages/admin/EmailSettingsPage";
import UnifiedHelpdeskPage from "./pages/admin/UnifiedHelpdeskPage";
import AdminCreateTicketPage from "./pages/admin/AdminCreateTicketPage";
import AssetMaster from "./pages/assets/AssetMaster";
import AssetMovement from "./pages/assets/AssetMovement";
import AssetManagement from "./pages/assets/AssetManagement";
import Configuration from "./pages/assets/Configuration";
import PreventiveMaintenanceList from "./pages/preventive-maintenance/PreventiveMaintenanceList";
import PhysicalAuditModule from "./pages/physical-audit/PhysicalAuditModule";




const queryClient = new QueryClient();

// Demo mode - no database initialization needed

// Normalize role names for routing
function normalizeRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'super admin':
    case 'accountant':
    case 'viewer':
    case 'custom':
    case 'helpdesk':
    case 'technician':
    case 'maintenance manager':
      return 'admin';
    default:
      return role.toLowerCase();
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authContext = useAuth();

  // Handle null context
  if (!authContext) {
    return <Navigate to="/auth" replace />;
  }

  const { user, loading } = authContext;

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dashboard">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if no user
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const MODULE_ROUTES: Record<string, string> = {
  'Overview': '/admin/dashboard',
  'Buildings': '/admin/buildings',
  'Tenants': '/admin/tenants',
  'Companies': '/admin/company-group',
  'Rent Collection': '/admin/rent-collection',
  'Invoices': '/admin/invoices',
  'Expenses': '/admin/expenses',
  'Deposits': '/admin/deposits',
  'Financial Reports': '/admin/reports',
  'Manage Tickets': '/admin/helpdesk',
  'Users': '/admin/user-management',
  'Settings': '/admin/settings',
  'Helpdesk': '/admin/helpdesk',
  'Assets': '/assets/master',
  'Asset Master': '/assets/master',
  'Asset Movement': '/assets/movement',
  'Inventory': '/assets/inventory',
  'Configuration': '/assets/configuration',
  'Preventive Maintenance': '/assets/preventive-maintenance',
  'Physical Audit': '/assets/physical-audit'
};

function getRoleDashboardPath(role: string | null, user: any = null): string {
  if (!role) return '/dashboard';
  
  if (role.toLowerCase() === 'tenant') {
    return '/tenant/dashboard';
  }
  
  if (user?.appUser?.permissions && user.appUser.permissions.length > 0) {
    // Check if Overview is enabled first (default dashboard)
    const overviewModule = user.appUser.permissions.find((p: any) => p.module === 'Overview' && p.view === true);
    if (overviewModule) {
      return '/admin/dashboard';
    }
    
    // Otherwise, find first enabled module
    const firstModule = user.appUser.permissions.find((p: any) => p.view === true);
    if (firstModule && MODULE_ROUTES[firstModule.module]) {
      return MODULE_ROUTES[firstModule.module];
    }
  }
  
  return '/not-authorized';
}

function RoleBasedRedirect() {
  const authContext = useAuth();

  if (!authContext) {
    return <Navigate to="/auth" replace />;
  }

  const { role, loading, user } = authContext;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dashboard">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user && !role) {
    return <Navigate to="/auth" replace />;
  }

  const redirectPath = getRoleDashboardPath(role, user);
  return <Navigate to={redirectPath} replace />;
}



function AppContent() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/home" element={<HomePage />} />
                
                {/* Root and dashboard redirects */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <RoleBasedRedirect />
                  </ProtectedRoute>
                } />



                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/dashboard">
                      <AdminOverview />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/overview" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/overview">
                      <AdminOverview />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/tenants" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/tenants">
                      <Tenants />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/tenants/manage/:tenantId" element={
                  <ProtectedRoute>
                    <ManageTenant />
                  </ProtectedRoute>
                } />
                <Route path="/tenants/manage/:tenantId" element={
                  <ProtectedRoute>
                    <TenantManage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/applications" element={
                  <ProtectedRoute>
                    <AdminApplicationsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/leads" element={
                  <ProtectedRoute>
                    <AdminLeadsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/space-allocation" element={
                  <ProtectedRoute>
                    <SpaceAllocationPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/billing" element={
                  <ProtectedRoute>
                    <AdminBillingPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/buildings" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/buildings">
                      <BuildingsPage />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/building-manage/:buildingId" element={
                  <ProtectedRoute>
                    <BuildingManage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/circular-view/:groupId" element={
                  <ProtectedRoute>
                    <CompanyGroup />
                  </ProtectedRoute>
                } />
                <Route path="/admin/floor-plans" element={
                  <ProtectedRoute>
                    <FloorPlans />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/settings">
                      <Settings />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings/email" element={
                  <ProtectedRoute>
                    <EmailSettingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/user-management" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/user-management">
                      <UserManagement />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/master-settings" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/master-settings">
                      <MasterSettings />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/approvals" element={
                  <ProtectedRoute>
                    <ApprovalsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/spaces" element={
                  <ProtectedRoute>
                    <AdminSpacesPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/add-tenant" element={
                  <ProtectedRoute>
                    <AddTenantPage />
                  </ProtectedRoute>
                } />


                <Route path="/admin/tenant-applications" element={
                  <ProtectedRoute>
                    <TenantApplications />
                  </ProtectedRoute>
                } />

                <Route path="/admin/company-group/:groupId" element={
                  <ProtectedRoute>
                    <CompanyGroup />
                  </ProtectedRoute>
                } />
                <Route path="/admin/accounts" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/accounts">
                      <AccountsPage />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/tenant-management" element={
                  <ProtectedRoute>
                    <PermissionGuard path="/admin/tenant-management">
                      <TenantManagement />
                    </PermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/admin/tenant-profile/:tenantId" element={
                  <ProtectedRoute>
                    <TenantProfile />
                  </ProtectedRoute>
                } />
                <Route path="/admin/applications" element={
                  <ProtectedRoute>
                    <AdminApplicationsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/helpdesk" element={
                  <ProtectedRoute>
                    <UnifiedHelpdeskPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/create-ticket" element={
                  <ProtectedRoute>
                    <AdminCreateTicketPage />
                  </ProtectedRoute>
                } />

                {/* Asset Management Routes */}
                <Route path="/assets/master" element={
                  <ProtectedRoute>
                    <AssetMaster />
                  </ProtectedRoute>
                } />
                <Route path="/assets/movement" element={
                  <ProtectedRoute>
                    <AssetMovement />
                  </ProtectedRoute>
                } />
                <Route path="/assets/inventory" element={
                  <ProtectedRoute>
                    <AssetManagement />
                  </ProtectedRoute>
                } />
                <Route path="/assets/configuration" element={
                  <ProtectedRoute>
                    <Configuration />
                  </ProtectedRoute>
                } />
                <Route path="/assets/preventive-maintenance" element={
                  <ProtectedRoute>
                    <PreventiveMaintenanceList />
                  </ProtectedRoute>
                } />
                <Route path="/assets/physical-audit" element={
                  <ProtectedRoute>
                    <PhysicalAuditModule />
                  </ProtectedRoute>
                } />




                {/* CRM Routes */}
                <Route path="/crm/dashboard" element={
                  <ProtectedRoute>
                    <CrmDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/crm/quotation" element={
                  <ProtectedRoute>
                    <QuotationPage />
                  </ProtectedRoute>
                } />

                {/* Notifications Route (All Users) */}
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />

                {/* Tenant Routes */}
                <Route path="/tenant/dashboard" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="Dashboard">
                      <TenantDashboard />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/tenant/lease" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="My Lease">
                      <MyLeasePage />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/tenant/invoices" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="Invoices">
                      <MyInvoicesPage />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/tenant/documents" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="Documents">
                      <MyDocumentsPage />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/tenant/maintenance-requests" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="Maintenance">
                      <MaintenanceRequestsPage />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/tenant/my-assets" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="My Assets">
                      <MyAssetsPage />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/tenant/profile" element={
                  <ProtectedRoute>
                    <TenantPermissionGuard module="Profile">
                      <TenantCompanyProfile />
                    </TenantPermissionGuard>
                  </ProtectedRoute>
                } />
                



                {/* Maintenance Routes */}
                <Route path="/maintenance/dashboard" element={
                  <ProtectedRoute>
                    <MaintenanceDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/maintenance/tickets" element={
                  <ProtectedRoute>
                    <MaintenanceDashboard />
                  </ProtectedRoute>
                } />

                {/* Not Authorized Route */}
                <Route path="/not-authorized" element={<NotAuthorized />} />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LoadingProvider>
      <AuthProvider>
        <NotificationsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </NotificationsProvider>
      </AuthProvider>
    </LoadingProvider>
  </QueryClientProvider>
);

export default App;
