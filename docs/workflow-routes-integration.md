# Workflow Engine - Route Integration Guide

## Add these routes to App.tsx

### 1. Import Components

```typescript
// Add to imports section
import { WorkflowManagementPage } from './pages/admin/WorkflowManagementPage';
import { WorkflowBuilder } from './components/workflow/WorkflowBuilder';
import { PendingApprovalsDashboard } from './components/workflow/PendingApprovalsDashboard';
```

### 2. Add Routes (inside <Routes> component)

```typescript
{/* Workflow Management Routes */}
<Route 
  path="/admin/workflows" 
  element={
    <ProtectedRoute>
      <PermissionGuard path="/admin/workflows">
        <WorkflowManagementPage />
      </PermissionGuard>
    </ProtectedRoute>
  } 
/>

<Route 
  path="/admin/workflows/builder/:workflowId?" 
  element={
    <ProtectedRoute>
      <PermissionGuard path="/admin/workflows">
        <WorkflowBuilder />
      </PermissionGuard>
    </ProtectedRoute>
  } 
/>

<Route 
  path="/admin/approvals" 
  element={
    <ProtectedRoute>
      <PendingApprovalsDashboard />
    </ProtectedRoute>
  } 
/>
```

---

## Add to Sidebar Menu (roleBasedMenus.ts or AppSidebar.tsx)

### Option 1: Add to existing Settings/Admin section

```typescript
{
  title: 'Workflows',
  icon: GitBranch,
  href: '/admin/workflows',
  permission: 'can_manage_workflows'
},
{
  title: 'Pending Approvals',
  icon: Clock,
  href: '/admin/approvals',
  badge: pendingCount // Optional: show count
}
```

### Option 2: Create new Workflow section

```typescript
{
  title: 'Workflow',
  icon: GitBranch,
  items: [
    {
      title: 'Manage Workflows',
      href: '/admin/workflows',
      icon: Settings,
      permission: 'can_manage_workflows'
    },
    {
      title: 'Pending Approvals',
      href: '/admin/approvals',
      icon: Clock,
      badge: pendingCount
    },
    {
      title: 'Workflow History',
      href: '/admin/workflow-history',
      icon: History
    }
  ]
}
```

---

## Update roleBasedMenus.ts

Add this to the menu configuration:

```typescript
// Import icon
import { GitBranch, Clock, History } from 'lucide-react';

// Add to menu items array
{
  title: 'Workflows',
  icon: GitBranch,
  items: [
    {
      title: 'Pending Approvals',
      href: '/admin/approvals',
      icon: Clock,
      description: 'Review and approve pending requests'
    },
    {
      title: 'Manage Workflows',
      href: '/admin/workflows',
      icon: Settings,
      description: 'Create and configure workflows',
      roles: ['Super Admin', 'Admin'] // Restrict to admins
    }
  ]
}
```

---

## Update Permissions in PermissionGuard

Add workflow permission check in `src/components/RouteGuard.tsx`:

```typescript
const workflowPaths = ['/admin/workflows', '/admin/workflows/builder'];

if (workflowPaths.some(p => location.pathname.startsWith(p))) {
  // Check if user has workflow management permission
  const hasPermission = user?.can_manage_workflows || user?.role === 'Super Admin';
  
  if (!hasPermission) {
    return <Navigate to="/not-authorized" replace />;
  }
}
```

---

## Add Toaster Component (if not already added)

In `App.tsx`, add Toaster for notifications:

```typescript
import { Toaster } from 'sonner';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <AuthProvider>
          <NotificationsProvider>
            <TooltipProvider>
              <BrowserRouter>
                <Toaster position="top-right" richColors />
                <ErrorBoundary>
                  <Routes>
                    {/* ... routes ... */}
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationsProvider>
        </AuthProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}
```

---

## Quick Access Button (Optional)

Add a quick access button to asset movement page:

```typescript
// In AssetMovement.tsx or AssetMaster.tsx
import { GitBranch } from 'lucide-react';

<Button 
  variant="outline" 
  onClick={() => navigate('/admin/workflows')}
>
  <GitBranch className="w-4 h-4 mr-2" />
  Configure Workflows
</Button>
```

---

## Dashboard Widget (Optional)

Add pending approvals widget to admin dashboard:

```typescript
// In Overview.tsx or AdminDashboard.tsx
import { PendingApprovalsDashboard } from '../components/workflow/PendingApprovalsDashboard';

<Card>
  <CardHeader>
    <CardTitle>Pending Approvals</CardTitle>
  </CardHeader>
  <CardContent>
    <PendingApprovalsDashboard />
  </CardContent>
</Card>
```

---

## Complete Example for App.tsx

```typescript
import { WorkflowManagementPage } from './pages/admin/WorkflowManagementPage';
import { WorkflowBuilder } from './components/workflow/WorkflowBuilder';
import { PendingApprovalsDashboard } from './components/workflow/PendingApprovalsDashboard';
import { Toaster } from 'sonner';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <AuthProvider>
          <NotificationsProvider>
            <TooltipProvider>
              <BrowserRouter>
                <Toaster position="top-right" richColors />
                <ErrorBoundary>
                  <Routes>
                    {/* ... existing routes ... */}
                    
                    {/* Workflow Routes */}
                    <Route 
                      path="/admin/workflows" 
                      element={
                        <ProtectedRoute>
                          <WorkflowManagementPage />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/admin/workflows/builder/:workflowId?" 
                      element={
                        <ProtectedRoute>
                          <WorkflowBuilder />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/admin/approvals" 
                      element={
                        <ProtectedRoute>
                          <PendingApprovalsDashboard />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationsProvider>
        </AuthProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}
```

---

## Testing Access

1. Login as Super Admin
2. Navigate to `/admin/workflows`
3. Click "Create Workflow" button
4. Build workflow in visual editor
5. Save and publish
6. Navigate to `/admin/approvals` to see pending approvals

---

## Navigation Paths

- **Workflow List**: `/admin/workflows`
- **Create Workflow**: `/admin/workflows/builder`
- **Edit Workflow**: `/admin/workflows/builder/:workflowId`
- **Pending Approvals**: `/admin/approvals`
