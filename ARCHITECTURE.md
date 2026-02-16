# Rathinam Nexus Suite - Complete Architecture Documentation

> **Purpose**: This document serves as the single source of truth for understanding the entire Rathinam Nexus Suite project. When starting a new chat or onboarding to this codebase, read this document to understand the system architecture, business logic, data flows, and technical implementation.

---

## 1. System Overview

**Rathinam Nexus Suite** is a comprehensive enterprise property/tenant management platform designed for educational institutions and tech parks. It manages buildings, tenants, leases, billing, maintenance, assets, and helpdesk operations with sophisticated role-based access control.

### Core Business Purpose
- Manage multiple buildings, floors, and rental units across campus
- Handle complete tenant lifecycle from application to lease termination
- Automate billing, invoicing, and payment tracking with multi-charge support
- Coordinate maintenance requests and work orders with technician assignment
- Track fixed assets with SEZ compliance, depreciation, and physical audit
- Provide role-specific dashboards and workflows for different user types
- Generate financial reports, analytics, and export capabilities
- Real-time notifications and email alerts for critical events

### Tech Stack
- **Frontend**: React 18.3 + TypeScript + Vite 7.2 + Tailwind CSS 3.4 + Radix UI
- **Backend**: Node.js 18+ / Express 4.18 + Multer (file uploads)
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Email**: Nodemailer 7.0 with dynamic SMTP configuration
- **State Management**: React Query 5.83 (server state), React Context (auth/notifications)
- **Forms**: React Hook Form 7.61 + Zod 3.25 validation
- **Export**: jsPDF 3.0 (PDF), ExcelJS 4.4 (Excel), Recharts 2.15 (Charts)
- **Deployment**: Docker + Docker Compose + Nginx reverse proxy

---

## 2. Authentication & Authorization System

**Primary File**: `src/contexts/AuthContext.tsx`

### Authentication Flow

1. **Login Process**:
   - User enters email/password on `/auth` page
   - System checks `users` table in Supabase first
   - If not found, checks `tenants` table (for tenant users)
   - Falls back to hardcoded demo users if Supabase fails
   - Password validation: Plain text comparison (⚠️ **SECURITY RISK** - no hashing)
   - On success: Updates `last_login`, stores user in localStorage

2. **Session Management**:
   - Storage: `localStorage` with keys `demo_user` and `demo_role`
   - Persistence: Survives page refresh, cleared on logout
   - No JWT tokens - relies on localStorage state

3. **Demo Users** (Fallback when database unavailable):
   ```
   admin@rathinam.tec / admin123 → Super Admin
   finance@rathinam.tec / admin123 → Accountant
   maintenance@rathinam.edu / admin123 → Maintenance Manager
   tenant@techstart.com / admin123 → Tenant
   ```

### Role-Based Access Control (RBAC)

**Available Roles**:
- **Super Admin**: Full system access, all permissions, user management, system configuration
- **Admin**: Similar to Super Admin with configurable permissions
- **Accountant**: Financial operations (invoices, payments, reports, rent collection)
- **Maintenance Manager**: Maintenance tickets, work orders, technician management, asset maintenance
- **Helpdesk**: Ticket management, tenant support, issue resolution
- **Technician**: Assigned maintenance tasks, ticket updates, field work
- **Tenant**: Self-service portal (view lease, pay invoices, submit tickets, view assets)
- **Viewer**: Read-only access to buildings, tenants, and reports
- **Custom**: Granular module-level permissions with fine-grained control

**Permission System** (`src/utils/permissions.ts`):
- Each user has array of `Permission` objects stored in database
- Each permission has: `module`, `view`, `add`, `edit`, `delete` flags
- Modules: Overview, Buildings, Tenants, Companies, Rent Collection, Invoices, Expenses, Deposits, Financial Reports, Manage Tickets, Users, Settings, Helpdesk, Asset Management
- `PermissionChecker` class validates actions before rendering UI/executing operations
- Dynamic menu generation based on user permissions
- Tenant-specific permissions for portal access control

**Route Protection** (`src/components/RouteGuard.tsx`):
- `ProtectedRoute`: Checks if user is authenticated
- `PermissionGuard`: Checks module-level permissions
- Redirects to `/not-authorized` if permission denied
- Redirects to `/auth` if not logged in

**Dashboard Routing Logic** (`src/App.tsx`):
- On login, system checks user's first module with `view: true` permission
- Routes to that module's dashboard (e.g., `/admin/buildings`)
- Tenants always route to `/tenant/dashboard`
- Fallback: `/admin/dashboard`

### AuthContext Methods
- `login(email, password)` - Authenticates user, returns user object
- `logout()` - Clears localStorage and state
- `refreshUser()` - Re-fetches user data from database
- `clearCache()` - Nuclear option: clears all localStorage, redirects to login

---

## 3. Backend Architecture

**Server Entry**: `server/index.js` (Express.js 4.18)
**Port**: 3000 (configurable via `PORT` env var)

### Server Startup Sequence
1. Load environment variables from `.env`
2. Create required directories: `uploads/`, `config/`, `logs/`
3. Initialize SMTP config file if missing
4. Register middleware (CORS, JSON parser, logging)
5. Mount API routes
6. Serve static files (React build, uploads)
7. SPA fallback for client-side routing
8. Start listening on port 3000

### A. File Upload System

**Technology**: Multer 1.4.5 with disk storage

**Endpoints**:
- `POST /api/upload` - Single file upload
  - Query param: `category` (e.g., 'tenant-documents', 'general')
  - Returns: `{ success, file: { name, originalname, size, mimetype, category, path, url } }`
- `POST /api/upload-multiple` - Batch upload (max 10 files)
  - Returns: `{ success, files: [...] }`
- `DELETE /api/delete` - Delete file by path
  - Body: `{ filePath: '/uploads/category/filename' }`
- `GET /uploads/*` - Serve uploaded files
  - Cache-Control: 1 year
  - Path sanitization to prevent directory traversal
- `GET /api/files/*` - Alternative file serving endpoint

**Storage Structure**:
```
uploads/
├── general/
│   └── {timestamp}-{random}-{filename}
├── tenant-documents/
│   └── {timestamp}-{random}-{filename}
└── {category}/
    └── {timestamp}-{random}-{filename}
```

**Security**:
- Path sanitization: Removes `../` and normalizes paths
- File size limit: 200MB (configurable via `MAX_FILE_SIZE`)
- Filename sanitization: Replaces spaces/quotes with underscores
- Directory traversal protection: Validates resolved path is within upload directory

### B. Email Service

**File**: `server/services/emailService.js`
**Technology**: Nodemailer 7.0

**Configuration Priority**:
1. Environment variables (`.env`)
2. JSON config file (`server/config/smtpConfig.json`)
3. Default empty config

**SMTP Config Structure**:
```json
{
  "host": "smtp.gmail.com",
  "port": "587",
  "secure": false,
  "user": "your-email@gmail.com",
  "pass": "your-app-password",
  "from": "Rathinam Nexus <your-email@gmail.com>"
}
```

**Email Logging**:
- Location: `server/logs/emailLogs.json`
- Max records: 1000 (FIFO)
- Logged data: timestamp, to, subject, status, messageId, error

**API Endpoints**:
- `GET /api/admin/smtp/get` - Retrieve config (password masked as `******`)
- `POST /api/admin/smtp/save` - Save SMTP config
  - Validates: email format, port range (1-65535), required fields
  - Preserves existing password if sent as `******`
- `POST /api/admin/smtp/send` - Send email
  - Body: `{ to, subject, text?, html? }`
  - Validates email format
- `POST /api/admin/smtp/test` - Send test email
  - Body: `{ testEmail }`
  - Sends predefined test message
- `GET /api/admin/smtp/logs` - Fetch email logs
  - Query param: `limit` (default 100)
- `POST /api/admin/smtp/reset` - Reset config to empty defaults

### C. Asset Management Routes

**File**: `server/routes/assetRoutes.js` (currently disabled in production)
**Purpose**: CRUD operations for fixed assets and movements

**Endpoints** (when enabled):
- `GET /api/assets/assets` - List all assets
- `GET /api/assets/assets/:id` - Get asset by ID
- `POST /api/assets/assets` - Create asset
- `PUT /api/assets/assets/:id` - Update asset
- `DELETE /api/assets/assets/:id` - Delete asset
- `GET /api/assets/movements` - List asset movements
- `POST /api/assets/movements` - Create movement request
- `GET /api/assets/dashboard/stats` - Asset statistics

### D. Health & Monitoring

- `GET /api/health` - Health check
  - Returns: `{ status: 'ok', timestamp, uploadPath, port }`
- `GET /api/test` - API connectivity test
  - Returns: `{ message: 'API is working', timestamp }`

### E. Middleware Stack

**Request Flow**:
```
1. CORS (allow all origins)
2. express.json() (parse JSON bodies)
3. express.urlencoded() (parse form data)
4. Logging middleware (logs all requests with timestamp)
5. API Routes (/api/*)
6. Static file serving (React build)
7. Upload file serving (/uploads/*)
8. SPA fallback (index.html for all other routes)
9. Error handler (Multer errors, 500 errors)
```

**Error Handling**:
- Multer errors: 400 with specific error message
- File size exceeded: "File too large"
- API not found: 404 with JSON error
- Unhandled errors: 500 with generic message

---

## 4. Frontend Architecture

### A. Application Entry Point

**File**: `src/main.tsx`
- Renders React app into `#root` div
- Wraps app with providers

**File**: `src/App.tsx`
- Main routing configuration
- Provider hierarchy:
  ```
  QueryClientProvider (React Query)
    └─ LoadingProvider (global loading state)
        └─ AuthProvider (authentication)
            └─ NotificationsProvider (real-time notifications)
                └─ TooltipProvider (Radix UI)
                    └─ BrowserRouter (React Router)
                        └─ ErrorBoundary
                            └─ Routes
  ```

### B. Routing Structure

**Route Organization** (from `src/App.tsx`):

1. **Public Routes** (no authentication required):
   - `/auth` - Login page
   - `/home` - Public homepage
   - `/` - Redirects to `/auth`

2. **Admin Routes** (`/admin/*`):
   - `/admin/dashboard` - Overview dashboard with KPIs (permission: "Overview")
   - `/admin/overview` - Alternative overview route
   - `/admin/buildings` - Building management (permission: "Buildings")
   - `/admin/building-manage/:buildingId` - Building detail/edit page
   - `/admin/tenants` - Tenant list (permission: "Tenants")
   - `/admin/tenant-management` - Advanced tenant management
   - `/admin/tenant-profile/:tenantId` - Tenant profile view
   - `/admin/tenants/manage/:tenantId` - Tenant detail management
   - `/admin/company-group/:groupId` - Company group view
   - `/admin/circular-view/:groupId` - Circular company view
   - `/admin/applications` - Tenant applications
   - `/admin/tenant-applications` - Application management
   - `/admin/space-allocation` - Space assignment
   - `/admin/spaces` - Space management
   - `/admin/billing` - Billing management
   - `/admin/accounts` - Financial accounts (permission: "Accounts")
   - `/admin/helpdesk` - Unified helpdesk (permission: "Helpdesk")
   - `/admin/create-ticket` - Create new ticket
   - `/admin/user-management` - User management (permission: "Users")
   - `/admin/settings` - System settings (permission: "Settings")
   - `/admin/master-settings` - Master data configuration
   - `/admin/settings/email` - SMTP configuration
   - `/admin/approvals` - Approval workflows
   - `/admin/add-tenant` - Add new tenant

3. **Asset Routes** (`/assets/*`):
   - `/assets/master` - Asset master list with CRUD operations
   - `/assets/movement` - Asset movement requests (location, maintenance, disposal)
   - `/assets/inventory` - Inventory management dashboard
   - `/assets/configuration` - Asset ID configuration
   - `/assets/preventive-maintenance` - PM scheduling and tracking
   - `/assets/physical-audit` - QR code-based physical audit

4. **Tenant Routes** (`/tenant/*`):
   - `/tenant/dashboard` - Tenant dashboard
   - `/tenant/lease` - Lease details
   - `/tenant/invoices` - Invoice list
   - `/tenant/documents` - Document repository
   - `/tenant/maintenance-requests` - Maintenance tickets
   - `/tenant/my-assets` - Assets assigned to tenant

5. **Maintenance Routes** (`/maintenance/*`):
   - `/maintenance/dashboard` - Maintenance dashboard
   - `/maintenance/tickets` - Ticket list

6. **Shared Routes**:
   - `/notifications` - Notification center (all users)
   - `/not-authorized` - Permission denied page
   - `*` - 404 Not Found

**Route Protection Pattern**:
```tsx
<Route path="/admin/buildings" element={
  <ProtectedRoute>              {/* Check authentication */}
    <PermissionGuard path="/admin/buildings">  {/* Check permissions */}
      <BuildingsPage />
    </PermissionGuard>
  </ProtectedRoute>
} />
```

### C. Context Providers

**1. AuthContext** (`src/contexts/AuthContext.tsx`)
- State: `user`, `role`, `loading`
- Methods: `login()`, `logout()`, `refreshUser()`, `clearCache()`
- Used by: All protected routes, permission checks

**2. NotificationsContext** (`src/contexts/NotificationsContext.tsx`)
- Real-time notification subscriptions
- Notification count badge
- Mark as read functionality

**3. LoadingContext** (`src/contexts/LoadingContext.tsx`)
- Global loading state for async operations
- Used by: Data fetching, form submissions

### D. Component Architecture

**UI Components** (`src/components/ui/`):
- **Radix UI Primitives**: Dialog, Dropdown, Tabs, Accordion, Alert, etc.
- **Custom Components**:
  - `responsive-table.tsx` - Mobile-friendly table
  - `export-dropdown.tsx` - PDF/Excel export menu
  - `star-rating.tsx` - Rating input
  - `demo-notice.tsx` - Demo mode banner
  - `back-to-home.tsx` - Navigation helper

**Feature Components**:

**Admin** (`src/components/admin/`):
- `TenantForm.tsx` - Create/edit tenant with multi-charge support
- `InvoiceForm.tsx` - Invoice creation with line items
- `SpaceManagement.tsx` - Unit allocation and floor plans
- `PermissionsEditor.tsx` - Role permission editor
- `FloorPlansManager.tsx` - Floor plan upload/management
- `RentCollectionManagement.tsx` - Rent payment tracking
- `ExpensesManagement.tsx` - Expense entry and categorization
- `DepositsManagement.tsx` - Security deposit tracking
- `AuditLogs.tsx` - System audit trail
- `BulkActions.tsx` - Batch operations for tenants/assets

**CRM** (`src/components/crm/`):
- Components removed - CRM functionality deprecated

**Tenant** (`src/components/tenant/`):
- `MaintenanceTicketForm.tsx` - Submit maintenance request with asset linking
- `PaymentGateway.tsx` - Online payment integration
- `LeaseManagement.tsx` - View lease agreement and terms
- `DigitalSignature.tsx` - E-signature capture for documents
- `ProfileManagement.tsx` - Update tenant profile and contact info
- `AssetList.tsx` - View assets assigned to tenant

**Finance** (`src/components/finance/`):
- `InvoiceManagement.tsx` - Invoice list/search
- `MonthlyRevenueChart.tsx` - Revenue visualization
- `CreateInvoiceModal.tsx` - Quick invoice creation

**Charts** (`src/components/charts/`):
- `DashboardCharts.tsx` - Overview metrics and KPIs
- `CashFlowChart.tsx` - Cash flow visualization
- `IncomeVsExpensesChart.tsx` - P&L chart with trend analysis
- `OccupancyChart.tsx` - Building occupancy rates
- `AssetDepreciationChart.tsx` - Asset value depreciation

**Layout** (`src/components/layout/`):
- `DashboardLayout.tsx` - Main layout wrapper
- `AppSidebar.tsx` - Navigation sidebar
- `DynamicSidebar.tsx` - Role-based menu
- `NotificationBadge.tsx` - Notification counter
- `RoleBasedActionButton.tsx` - Conditional action buttons

### E. Page Components

**Admin Pages** (`src/pages/admin/`):
- `Overview.tsx` - Dashboard with KPIs, charts, and quick actions
- `BuildingsPage.tsx` - Building list with search and filters
- `BuildingManage.tsx` - Building detail/edit with floor management
- `TenantManagement.tsx` - Tenant list with advanced filters
- `TenantProfile.tsx` - Tenant detail view with lease, invoices, tickets
- `ApplicationsPage.tsx` - Tenant applications with approval workflow
- `UnifiedHelpdeskPage.tsx` - Helpdesk ticket management with filters
- `AdminCreateTicketPage.tsx` - Create ticket on behalf of tenant
- `UserManagement.tsx` - User CRUD with role assignment
- `Settings.tsx` - System settings and configuration
- `MasterSettings.tsx` - Master data management (dropdowns, categories)
- `EmailSettingsPage.tsx` - SMTP configuration and email logs
- `AccountsPage.tsx` - Chart of accounts and financial setup
- `CompanyGroup.tsx` - Company group management and hierarchy
- `SpacesPage.tsx` - Space/unit management across buildings
- `ApprovalsPage.tsx` - Approval workflow management

**Tenant Pages** (`src/pages/tenant/`):
- `TenantDashboard.tsx` - Tenant overview with quick stats
- `MyLeasePage.tsx` - Lease agreement viewer with download
- `MyInvoicesPage.tsx` - Invoice history with payment options
- `MyDocumentsPage.tsx` - Document repository with upload
- `MaintenanceRequestsPage.tsx` - Ticket list with status tracking
- `MyAssetsPage.tsx` - Assets assigned to tenant with details

**Asset Pages** (`src/pages/assets/`):
- `AssetMaster.tsx` - Asset list with CRUD, QR code generation, bulk import
- `AssetMovement.tsx` - Movement requests with approval workflow
- `AssetManagement.tsx` - Asset dashboard with analytics
- `Configuration.tsx` - Asset ID configuration with multiple structures

**Physical Audit Pages** (`src/pages/physical-audit/`):
- `PhysicalAuditModule.tsx` - QR code scanning and manual verification

**Preventive Maintenance Pages** (`src/pages/preventive-maintenance/`):
- `PreventiveMaintenanceList.tsx` - PM scheduling and tracking

**Shared Pages** (`src/pages/`):
- `AdminDashboard.tsx` - Admin overview with role-based widgets
- `MaintenanceDashboard.tsx` - Maintenance overview with ticket stats
- `NotificationsPage.tsx` - Notification center with filters
- `Auth.tsx` - Login page with role-based routing
- `HomePage.tsx` - Public homepage
- `NotFound.tsx` - 404 page
- `NotAuthorized.tsx` - 403 permission denied page

---

## 5. Data Layer & Services

### A. Supabase Integration

**File**: `src/lib/supabaseClient.ts`
**Pattern**: Singleton instance

**Configuration**:
```typescript
VITE_SUPABASE_URL=https://jsejlncgwnddevsdbmot.supabase.co
VITE_SUPABASE_ANON_KEY=<jwt_token>
```

**Features**: Persistent sessions, auto token refresh, real-time subscriptions

### B. Service Layer (`src/services/`)

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `tenantService.ts` | Tenant CRUD | `fetchTenantById()`, `updateTenant()`, `createTenant()` |
| `enhancedTenantService.ts` | Advanced tenant ops | Real-time subscriptions, bulk operations |
| `billingService.ts` | Invoice/payment ops | `createInvoice()`, `recordPayment()`, `generateReceipt()` |
| `buildingService.ts` | Building CRUD | `getBuildings()`, `createBuilding()`, `updateBuilding()` |
| `buildingsService.ts` | Building queries | Floor/unit management, occupancy tracking |
| `spaceService.ts` | Unit allocation | `allocateSpace()`, `getAvailableUnits()`, `releaseSpace()` |
| `assetService.ts` | Asset management | `createAsset()`, `trackMovement()`, `calculateDepreciation()` |
| `maintenanceService.ts` | Ticket management | `createTicket()`, `assignTechnician()`, `updateStatus()` |
| `helpdeskService.ts` | Helpdesk ops | `getTickets()`, `updateStatus()`, `addComment()` |
| `emailService.ts` | Email notifications | `sendEmail()`, `sendBulkEmail()`, `loadSMTPConfig()` |
| `notificationService.ts` | Real-time notifications | `createNotification()`, `markAsRead()`, `subscribe()` |
| `floorPlanService.ts` | Floor plan management | `uploadFloorPlan()`, `getFloorPlans()`, `deleteFloorPlan()` |
| `settingsService.ts` | System settings | `getSettings()`, `updateSettings()`, `getMasterData()` |
| `companyGroupService.ts` | Company groups | `getGroups()`, `createGroup()`, `updateHierarchy()` |
| `tenantApplicationService.ts` | Application workflow | `submitApplication()`, `approveApplication()`, `rejectApplication()` |
| `tenantPortalService.ts` | Tenant self-service | `getTenantData()`, `makePayment()`, `uploadDocument()` |

### C. Mock Data (`src/data/`)

| File | Purpose |
|------|----------|
| `mockData.ts` | General mock data |
| `mockTenantData.ts` | Tenant fixtures |
| `mockFloorPlans.ts` | Floor plan fixtures |
| `userData.ts` | User/role data |
| `invoiceData.ts` | Invoice fixtures |
| `agreementData.ts` | Lease agreement templates |

### D. Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|----------|
| `useNotifications` | Real-time notification subscription |
| `useTenantProfile` | Tenant profile data |
| `useGlobalLoading` | Global loading state |
| `use-mobile` | Responsive breakpoint detection |

### E. Utilities (`src/utils/`)

**Core Utils**:
- `permissions.ts` - Permission checking logic
- `roleBasedMenus.ts` - Dynamic menu generation
- `idUtils.ts` - ID generation
- `numberToWords.ts` - Currency conversion

**Export Utils**:
- `exportAdmin.ts`, `exportBilling.ts`, `exportMaintenance.ts`, `exportFinance.ts`, `exportTenantData.ts`
- `chartGenerator.ts`, `reportGenerator.ts`
- Formats: PDF (jsPDF), Excel (ExcelJS), CSV
- Support for charts, tables, and formatted reports

---

## 6. Database Schema & Business Entities

### Core Tables (Supabase PostgreSQL)

**Users & Authentication**:
- `users` - System users (admin, staff, managers)
  - Fields: id, email, password, name, role, isActive, isApprover, permissions, lastLogin, created_at, updated_at
  - Roles: Super Admin, Admin, Accountant, Maintenance Manager, Helpdesk, Technician, Viewer, Custom
  - Password: Plain text (⚠️ **SECURITY RISK** - should be hashed)

**Property Management**:
- `buildings` - Property buildings
  - Fields: id, name, address, city, state, pincode, total_floors, total_units, status, created_at, updated_at
  - Status: Active, Inactive, Under Construction
- `floors` - Building floors
  - Fields: id, building_id, floor_number, floor_name, total_units, area_sqft, created_at
- `units` - Rental units/spaces
  - Fields: id, floor_id, building_id, unit_number, unit_name, area_sqft, rent_amount, status, tenant_id, lease_start, lease_end, created_at
  - Status: Available, Occupied, Maintenance, Reserved
- `space_categories` - Unit types (office, retail, warehouse, lab)

**Tenant Management**:
- `tenants` - Tenant companies
  - Fields: id, tenant_id, company_name, contact_person, email, phone, mobile, status, monthly_rent, lease_start_date, lease_end_date, security_deposit, pan_number, gst_number, address, city, state, pincode, website, industry, employee_count, created_at, updated_at
  - Status: Active, Inactive, Pending, Suspended, Terminated
- `tenant_charges` - Additional charges per tenant
  - Fields: id, tenant_id, charge_type, charge_name, amount, frequency, start_date, end_date, is_active
  - Types: General Charges, Service Charges, Utility Charges
- `tenant_applications` - Application submissions
  - Fields: id, company_name, contact_person, email, phone, status, submitted_date, approved_date, approved_by, rejection_reason, documents
  - Status: Pending, Approved, Rejected, Under Review
- `agreements` - Lease agreements
  - Fields: id, tenant_id, agreement_type, start_date, end_date, rent_amount, security_deposit, terms, document_url, status, signed_date, created_at
  - Status: Draft, Active, Expired, Terminated, Renewed

**Financial Management**:
- `invoices` - Billing invoices
  - Fields: id, invoice_number, tenant_id, invoice_date, due_date, amount, tax_amount, total_amount, status, payment_date, payment_method, notes, created_at, updated_at
  - Status: Draft, Pending, Paid, Overdue, Cancelled, Partially Paid
- `invoice_items` - Invoice line items
  - Fields: id, invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount
- `payments` - Payment records
  - Fields: id, invoice_id, tenant_id, amount, payment_date, payment_method, transaction_id, reference_number, notes, created_at
  - Methods: Cash, Cheque, Bank Transfer, UPI, Card, Online
- `expenses` - Operating expenses
  - Fields: id, category, subcategory, amount, date, description, vendor, invoice_number, payment_method, status, created_at
  - Categories: Utilities, Maintenance, Salaries, Taxes, Insurance, Others
- `deposits` - Security deposits
  - Fields: id, tenant_id, amount, deposit_date, refund_date, refund_amount, status, notes, created_at
  - Status: Held, Refunded, Partially Refunded, Forfeited
- `rent_collection` - Rent payment tracking
  - Fields: id, tenant_id, month, year, amount, due_date, payment_date, status, late_fee, discount, notes

**Maintenance & Helpdesk**:
- `maintenance_tickets` - Maintenance requests
  - Fields: id, ticket_number, tenant_id, category, subcategory, priority, status, title, description, location, building_id, floor_id, unit_id, assigned_to, reported_by, created_date, updated_date, resolved_date, resolution_notes, rating, feedback
  - Status: Open, In Progress, Pending, On Hold, Resolved, Closed, Cancelled
  - Priority: Low, Medium, High, Critical, Emergency
  - Categories: Electrical, Plumbing, HVAC, Carpentry, Painting, Cleaning, IT, Security, Others
- `ticket_comments` - Ticket communication
  - Fields: id, ticket_id, user_id, comment, attachments, is_internal, created_date
- `ticket_assets` - Junction table linking tickets to assets
  - Fields: id, ticket_id, asset_id, created_at
- `technicians` - Maintenance staff
  - Fields: id, user_id, name, email, phone, specialization, category, status, availability, created_at
  - Status: Active, Inactive, On Leave, Busy

**Asset Management**:
- `assets` - Fixed assets
  - Fields: id, asset_id, manual_asset_id, name, description, category, sub_type, manufacturer, model, serial_number, purchase_date, purchase_cost, supplier, warranty_expiry, status, location, building_id, floor_id, room_rack, tenant_id, handover_type, handover_name, handover_email, handover_contact, depreciation_method, depreciation_rate, current_value, last_depreciation_date, sez_status, customs_category, boe_number, boe_date, cif_value, duty_foregone, image_url, qr_code, pm_enabled, pm_start_date, pm_end_date, pm_frequency_days, pm_next_date, id_config_id, created_at, updated_at, created_by, updated_by
  - Status: Active, In Use, Maintenance, Idle, Disposed, Scrapped, Under Repair
  - Depreciation Methods: Straight Line, Written Down Value (WDV), None
  - SEZ Status: SEZ, DTA, Bonded
  - Customs Category: Capital Goods, Consumables, Spares, Raw Materials
- `asset_movements` - Asset transfers
  - Fields: id, asset_id, movement_type, from_location, to_location, from_building_id, to_building_id, from_floor_id, to_floor_id, movement_date, expected_return_date, actual_return_date, reason, requested_by, approved_by, approval_date, status, gate_pass_number, vendor_name, vendor_contact, notes, created_at
  - Types: Location (internal), Maintenance (external), Disposal
  - Status: Pending, Approved, Rejected, In Transit, Completed, Cancelled
- `physical_audits` - Physical verification records
  - Fields: id, asset_id, audit_date, auditor_name, scan_type, asset_found, location_match, tenant_match, serial_match, physical_condition, audit_result, remarks, created_at
  - Scan Types: QR Code, Manual
  - Physical Condition: Good, Fair, Damaged, Scrap
  - Audit Result: Pass, Issues
- `dropdown_configs` - Dynamic dropdown configurations
  - Fields: id, entity_type, field_name, config_data (JSONB), created_at, updated_at
  - Entity Types: asset, tenant, invoice, ticket
  - Stores categories, sub-types, manufacturers, statuses dynamically
- `id_configs` - ID generation configurations
  - Fields: id, entity_type, structure, separator, start_value, digits, valid_from, valid_till, is_active, created_at, created_by, updated_at, updated_by
  - Structures: cat-type-seq, cat-year-seq, type-seq, cat-seq, year-seq, seq-only
  - Separators: -, /, _
  - Supports multiple active configurations with date ranges

**Notifications & Audit**:
- `notifications` - User notifications
  - Fields: id, user_id, title, message, type, read, link, metadata, created_date
  - Types: Invoice, Payment, Maintenance, Lease, Approval, System, Asset, Ticket
- `audit_logs` - System audit trail
  - Fields: id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent, timestamp
  - Actions: Create, Update, Delete, Login, Logout, Export, Approve, Reject

**Company Groups**:
- `company_groups` - Tenant groupings
  - Fields: id, group_name, parent_company, description, total_tenants, total_rent, created_at, updated_at

**Master Settings**:
- `app_settings` - Application configuration
  - Fields: id, setting_key, setting_value, category, description, is_public, created_at, updated_at
- `form_dropdowns` - Form dropdown options
  - Fields: id, form_name, field_name, options (JSONB), is_active, created_at, updated_at

### Key Relationships

```
buildings (1) ──> (N) floors ──> (N) units ──> (1) tenants
tenants (1) ──> (N) tenant_charges
tenants (1) ──> (N) invoices ──> (N) invoice_items
invoices (1) ──> (N) payments
tenants (1) ──> (N) maintenance_tickets ──> (N) ticket_comments
maintenance_tickets (N) ──> (N) assets (via ticket_assets junction)
tenants (1) ──> (N) agreements
tenants (1) ──> (N) assets (handover)
assets (1) ──> (N) asset_movements
assets (1) ──> (N) physical_audits
assets (N) ──> (1) id_configs
users (1) ──> (N) notifications
users (1) ──> (N) audit_logs
company_groups (1) ──> (N) tenants
```

---

## 7. Real-Time Notification System

### Architecture

**Supabase Edge Functions** (`supabase/functions/`):
- `send-email/` - Email delivery via SMTP
- `trigger-notification/` - Create notification records
- `fetch-notifications/` - Retrieve user notifications
- `mark-read/` - Mark notifications as read
- `archive-notification/` - Archive old notifications
- `get-notification-settings/` - User preferences
- `update-notification-settings/` - Update preferences

**Frontend Components**:
- `NotificationBell.tsx` - Header notification icon with badge
- `NotificationsDrawer.tsx` - Slide-out notification panel
- `NotificationItem.tsx` - Individual notification card
- `NotificationsContext.tsx` - Real-time subscription management

### Notification Flow

1. **Event Trigger** (e.g., invoice created, ticket assigned)
2. **Service Layer** calls `notificationService.createNotification()`
3. **Supabase Edge Function** `trigger-notification` executes
4. **Database Insert** into `notifications` table
5. **Real-Time Broadcast** via Supabase subscriptions
6. **Frontend Update** - NotificationsContext receives event
7. **UI Update** - Badge count increments, drawer updates
8. **Email Notification** (optional) via `send-email` function

### Notification Types & Triggers

| Type | Trigger Event | Recipients |
|------|---------------|------------|
| **Invoice** | Invoice created/due | Tenant, Accountant |
| **Payment** | Payment received | Tenant, Accountant |
| **Maintenance** | Ticket created/updated | Tenant, Maintenance Manager, Technician |
| **Lease** | Lease expiring (30/60/90 days) | Tenant, Admin |
| **Approval** | Application submitted | Admin |
| **System** | User created, settings changed | Super Admin |
| **Reminder** | Overdue invoice, pending approval | Relevant users |

### Real-Time Subscription Pattern

```typescript
// NotificationsContext.tsx
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    setNotifications(prev => [payload.new, ...prev]);
    setUnreadCount(prev => prev + 1);
  })
  .subscribe();
```

### Email Integration

**SMTP Configuration**: `server/config/smtpConfig.json`
**Email Templates**: HTML + plain text
**Delivery**: Async via Nodemailer
**Logging**: `server/logs/emailLogs.json`

**Email Types**:
- Invoice notifications
- Payment confirmations
- Maintenance ticket updates
- Lease renewal reminders
- Application status updates
- Password reset (if implemented)

---

## 8. Export & Reporting

### Export Utilities (`src/utils/`)
- `exportAdmin.ts` - Admin data export
- `exportBilling.ts` - Billing reports
- `exportMaintenance.ts` - Maintenance logs
- `exportFinance.ts` - Financial statements
- `chartGenerator.ts` - Chart generation
- `reportGenerator.ts` - PDF report generation

**Formats**: PDF, Excel, CSV

---

## 9. Deployment & DevOps

### Docker Deployment

**Dockerfile** (Multi-stage build):
```dockerfile
# Stage 1: Build React frontend
FROM node:18 AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:18-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
COPY --from=frontend-build /app/dist ./client/build
EXPOSE 3000
CMD ["node", "index.js"]
```

**docker-compose.yml**:
```yaml
services:
  rathinam-techpark:
    image: naveen171007/rathinam-techpark:1.5.4
    container_name: rathinam-techpark
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - PORT=3000
      - UPLOAD_PATH=/app/uploads
      - MAX_FILE_SIZE=209715200
    restart: unless-stopped
```

**Deployment Commands**:
```bash
# Build image
docker build -t rathinam-techpark:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Environment Variables

**Frontend** (`.env`):
```
VITE_SUPABASE_URL=https://jsejlncgwnddevsdbmot.supabase.co
VITE_SUPABASE_ANON_KEY=<jwt_token>
```

**Backend** (`server/.env`):
```
PORT=3000
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=209715200
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Rathinam Nexus <your-email@gmail.com>
```

### Nginx Configuration

**nginx.conf** (Reverse proxy):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Build Scripts

**package.json scripts**:
```json
{
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview",
  "db:reset": "node scripts/reset-database.js",
  "db:seed": "node scripts/seed.js"
}
```

### Deployment Checklist

- [ ] Set environment variables
- [ ] Configure SMTP settings
- [ ] Set up Supabase project
- [ ] Run database migrations
- [ ] Build Docker image
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure firewall rules
- [ ] Set up backup strategy
- [ ] Configure monitoring/logging

---

## 10. Security Considerations

### ✅ Implemented
- Path sanitization for file uploads
- CORS enabled
- Password masking in SMTP config
- Email validation (regex)
- Port validation (1-65535)

### ⚠️ Concerns
- Plain text password storage (no hashing)
- Credentials in `.env` files
- No rate limiting on API endpoints
- No request validation middleware
- localStorage for sensitive data

---

## 11. Data Flow Examples

### Tenant Onboarding Flow
```
1. Application Submission → tenant_applications table
2. Admin Reviews → Application status updated
3. Approval/Rejection → Email notification sent
4. If Approved → Tenant record created in tenants table
5. Space Allocation → Unit assigned, status updated to Occupied
6. Lease Agreement → Agreement record created, document uploaded
7. Charges Configuration → tenant_charges records created
8. Initial Invoice → Invoice generated with security deposit + first month rent
9. Email Notification → Welcome email + invoice sent
10. Tenant Portal Access → Credentials created, permissions assigned
```

### Maintenance Request Flow
```
1. Tenant Submits Ticket → maintenance_tickets table
2. Optional: Link Assets → ticket_assets junction table
3. Notification → Maintenance Manager receives alert
4. Ticket Assignment → Technician assigned based on category
5. Status Updates → Open → In Progress → Resolved
6. Comments/Updates → ticket_comments table
7. Email Notifications → Sent at each status change
8. Completion → Tenant rates service, ticket closed
9. Audit Trail → All changes logged in audit_logs
```

### Invoice & Payment Flow
```
1. Admin Creates Invoice → invoices + invoice_items tables
2. Charges Calculation → Rent + tenant_charges aggregated
3. Tax Calculation → GST/tax applied per line item
4. Invoice Finalization → Status: Draft → Pending
5. Email Sent → Invoice PDF attached
6. Tenant Pays → Payment recorded in payments table
7. Invoice Updated → Status: Paid, payment_date set
8. Receipt Generated → PDF receipt created
9. Accounting Updated → rent_collection table updated
10. Notification → Payment confirmation sent
```

### Asset Lifecycle Flow
```
1. Asset Creation → assets table with auto-generated ID
2. ID Generation → Based on active id_configs configuration
3. QR Code Generation → QR code created and stored
4. Initial Location → Building, floor, room assigned
5. Handover → Assigned to tenant or other party
6. Movement Request → asset_movements table (Pending)
7. Approval → Movement approved, status updated
8. Physical Movement → Location updated, gate pass generated
9. PM Scheduling → If pm_enabled, next PM date calculated
10. Physical Audit → QR code scanned, verification recorded
11. Depreciation → Automatic calculation based on method
12. Disposal → Movement type: Disposal, status: Disposed
```

### Physical Audit Flow
```
1. Auditor Opens Module → PhysicalAuditModule page
2. QR Code Scan → Html5Qrcode library captures asset ID
3. Asset Lookup → Fetch asset details from database
4. Verification Checklist → Asset found, location match, condition
5. Record Audit → physical_audits table entry created
6. Discrepancy Handling → If issues, remarks added
7. Audit Report → Export audit results to Excel/PDF
8. Follow-up Actions → Tickets created for damaged assets
```

---

## 12. Performance Optimizations

- React Query for caching & background sync
- Lazy loading of routes
- Image optimization (Recharts for charts)
- Pagination on large datasets
- Email logging with 1000-record limit

---

## 13. Scalability Considerations

### Current Limitations
- Single Node.js server (no clustering)
- File storage on local disk (not cloud)
- Email logs in JSON (not database)
- No API rate limiting

### Recommendations
- Migrate to cloud storage (S3, Azure Blob)
- Implement Redis for caching
- Add API gateway with rate limiting
- Use message queue (Bull, RabbitMQ) for emails
- Implement database connection pooling

---

## 14. Testing & Debugging

### Health Checks
- `GET /api/health` - Server status
- `GET /api/test` - API connectivity

### Logging
- Console logs with timestamps
- Email logs in `server/logs/emailLogs.json`
- Route listing on startup

---

## 15. Project Structure

```
rathinam-nexus-suite-main/
├── server/                    # Node.js/Express backend
│   ├── index.js              # Main server entry
│   ├── services/
│   │   └── emailService.js   # SMTP email handling
│   ├── routes/
│   │   └── assetRoutes.js    # Asset management API
│   ├── config/
│   │   └── smtpConfig.json   # Email configuration
│   └── logs/
│       └── emailLogs.json    # Email audit trail
├── src/                       # React frontend
│   ├── contexts/
│   │   ├── AuthContext.tsx   # Authentication & RBAC
│   │   └── NotificationsContext.tsx
│   ├── services/             # Business logic
│   ├── components/           # React components
│   ├── pages/                # Route pages
│   ├── lib/                  # Utilities & Supabase
│   ├── utils/                # Export & reporting
│   └── App.tsx               # Main routing
├── supabase/                 # Database & Edge Functions
│   ├── functions/            # Serverless functions
│   └── migrations/           # Schema migrations
├── public/                   # Static assets
└── docker-compose.yml        # Full stack deployment
```

---

## 16. API Endpoints Summary

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### File Management
- `POST /api/upload` - Single file upload
- `POST /api/upload-multiple` - Batch upload
- `DELETE /api/delete` - Delete file
- `GET /uploads/*` - Serve uploaded files

### Email Configuration
- `GET /api/admin/smtp/get` - Get SMTP config
- `POST /api/admin/smtp/save` - Save SMTP config
- `POST /api/admin/smtp/send` - Send email
- `POST /api/admin/smtp/test` - Test SMTP
- `GET /api/admin/smtp/logs` - Get email logs
- `POST /api/admin/smtp/reset` - Reset config

### Asset Management
- `GET /api/assets/assets` - List assets
- `GET /api/assets/assets/:id` - Get asset
- `POST /api/assets/assets` - Create asset
- `PUT /api/assets/assets/:id` - Update asset
- `DELETE /api/assets/assets/:id` - Delete asset
- `GET /api/assets/movements` - List movements
- `POST /api/assets/movements` - Create movement
- `GET /api/assets/dashboard/stats` - Asset stats

### Health & Testing
- `GET /api/health` - Health check
- `GET /api/test` - API test

---

## Summary

**Rathinam Nexus Suite** is a **production-ready enterprise application** with:
- ✅ Comprehensive tenant/property management with multi-building support
- ✅ Multi-role access control with custom permissions and dynamic menus
- ✅ Integrated email/notification systems with real-time updates
- ✅ Real-time data synchronization via Supabase subscriptions
- ✅ Advanced asset management with SEZ compliance and QR code tracking
- ✅ Preventive maintenance scheduling and physical audit system
- ✅ Flexible billing with multi-charge support and automated invoicing
- ✅ Helpdesk system with technician assignment and SLA tracking
- ✅ Export & reporting capabilities (PDF, Excel, CSV)
- ✅ Docker deployment support with Nginx reverse proxy
- ✅ Master data management with dynamic dropdown configurations
- ✅ Audit trail for all critical operations

The architecture is **modular and extensible**, with clear separation of concerns:
- **Frontend**: React + TypeScript with component-based architecture
- **Backend**: Node.js/Express with RESTful API design
- **Database**: PostgreSQL (Supabase) with real-time capabilities
- **State Management**: React Query for server state, Context API for global state
- **Authentication**: Role-based with granular permissions

**Security Considerations**:
- ⚠️ Plain text password storage (should implement bcrypt hashing)
- ✅ Path sanitization for file uploads
- ✅ CORS enabled with configurable origins
- ✅ Email validation and input sanitization
- ⚠️ No rate limiting (should implement for production)
- ⚠️ localStorage for session management (consider JWT tokens)

**Scalability Recommendations**:
- Migrate file storage to cloud (AWS S3, Azure Blob)
- Implement Redis for caching and session management
- Add API gateway with rate limiting
- Use message queue (Bull, RabbitMQ) for email/notifications
- Implement database connection pooling
- Add horizontal scaling with load balancer
- Implement CDN for static assets

**Production Readiness**:
- ✅ Docker containerization
- ✅ Environment-based configuration
- ✅ Error handling and logging
- ✅ Health check endpoints
- ✅ Audit trail for compliance
- ⚠️ Security hardening needed (password hashing, rate limiting)
- ⚠️ Monitoring and alerting setup recommended

---

**Document Version**: 2.0  
**Last Updated**: 2024  
**Maintained By**: Development Team

---

## 17. Development Workflow & Scripts

### Database Management Scripts (`scripts/`)

| Script | Purpose |
|--------|----------|
| `export-db.ts` | Export database to JSON |
| `export-schema.ts` | Export database schema |
| `import-database.ts` | Import database from JSON |
| `import-simple.ts` | Simple import utility |
| `migrate-agreements.ts` | Migrate agreement data |
| `make-responsive.js` | UI responsiveness helper |

### Development Commands

```bash
# Frontend development
npm run dev                    # Start Vite dev server
npm run build                  # Production build
npm run preview                # Preview production build

# Database operations
npm run db:reset               # Reset database
npm run db:seed                # Seed initial data
npm run db:reset-and-seed      # Reset + seed
npm run db:status              # Check database status

# User management
npm run create-users           # Create initial users
npm run update-roles           # Update user roles

# Utilities
npm run check-connection       # Test Supabase connection
npm run migrate:agreements     # Migrate agreements

# Backend server
cd server
npm start                      # Production mode
npm run dev                    # Development mode
```

### Project Configuration Files

| File | Purpose |
|------|----------|
| `vite.config.ts` | Vite bundler configuration |
| `tsconfig.json` | TypeScript compiler options |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `postcss.config.js` | PostCSS configuration |
| `components.json` | Radix UI component config |

## 18. Key Features by Role

### Super Admin
- Full system access, user management, role assignment, permission configuration
- Building management, floor plans, space allocation
- Tenant management, application approval, lease management
- Financial oversight, invoice creation, payment tracking, expense management
- Asset management, movement approval, depreciation tracking
- System settings, SMTP configuration, master data management
- Audit logs, bulk operations, data export
- Helpdesk management, ticket assignment, technician management

### Admin
- Similar to Super Admin with configurable permissions
- Building and tenant management
- Financial operations based on assigned permissions
- Asset management and tracking
- Helpdesk and maintenance coordination

### Accountant
- Invoice creation, payment recording, receipt generation
- Rent collection tracking, overdue management
- Expense management, deposit tracking
- Financial reports, tax compliance, GST reports
- Export data to Excel/PDF, chart generation
- View tenant financial history

### Maintenance Manager
- View all tickets across all tenants
- Assign technicians based on category and availability
- Track ticket status, SLA compliance
- Maintenance analytics, technician performance
- Work order scheduling, preventive maintenance
- Asset maintenance tracking

### Helpdesk
- Create tickets on behalf of tenants
- Update ticket status, add comments
- View ticket history, search and filter
- Tenant communication, issue resolution
- Escalation management

### Technician
- View assigned tickets
- Update ticket status, add resolution notes
- Upload photos/documents
- Mark tickets as resolved
- View work history

### Tenant
- View dashboard with lease summary, payment status
- View/download lease agreement
- View/pay invoices online
- Submit maintenance requests with asset linking
- View maintenance ticket status and history
- Access document repository
- View assigned assets
- Update profile information
- Rate completed services

### Viewer
- Read-only access to buildings, tenants, reports
- View dashboards and analytics
- Export reports
- No create/edit/delete permissions

## 19. Troubleshooting Guide

### Common Issues

**Missing Supabase environment variables**: Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**File upload fails**: Check `uploads/` directory exists with write permissions, verify `MAX_FILE_SIZE`

**Email not sending**: Check SMTP configuration at `/admin/settings/email`, verify credentials, check `server/logs/emailLogs.json`

**Permission denied**: Check user permissions in database, verify `PermissionGuard`, call `refreshUser()`

**Real-time notifications not working**: Check Supabase connection, verify `NotificationsContext` mounted, check console for errors

**Docker container won't start**: Check logs with `docker-compose logs`, verify environment variables, ensure port 3000 available

---

## 20. Asset Management Module - Complete Analysis

### Overview
Comprehensive fixed asset tracking system with SEZ compliance, depreciation automation, movement tracking, maintenance scheduling, physical audit, preventive maintenance, and QR code generation.

### Core Features

**1. Asset Master Management** (`src/pages/assets/AssetMaster.tsx`)
- Complete asset lifecycle tracking from purchase to disposal
- Auto-generated asset IDs with configurable structure (see Configuration)
- Multi-category classification (IT Equipment, Furniture, Machinery, Vehicles, Office Equipment)
- Image upload with preview and storage
- Serial number and manufacturer tracking
- Purchase order number field for procurement tracking
- Warranty expiry and PM date tracking
- QR code generation for physical tagging
- Bulk import via Excel template
- Flexible handover system:
  - Tenant handover (dropdown selection from active tenants)
  - Other handover (manual entry with name, email, contact)
  - Toggle between handover types
- HeroUI-inspired table design with avatars and status badges
- Advanced search and filtering
- Export to Excel/PDF with charts

**2. Asset ID Configuration** (`src/pages/assets/Configuration.tsx`)
- Configurable ID generation rules per entity type
- Multiple structure options:
  - **Category-SubType-Number** (e.g., ITE-LPT-0001)
  - **Category-Year-Number** (e.g., ITE-2024-0001)
  - **SubType-Number** (e.g., LPT-0001)
  - **Category-Number** (e.g., ITE-0001)
  - **Year-Number** (e.g., 2024-0001)
  - **Number Only** (e.g., 0001)
- Separator options: Hyphen (-), Slash (/), Underscore (_)
- Configurable start value and digit count (3-6 digits)
- Live preview of generated IDs
- Multiple saved configurations with date ranges
- Activate/deactivate configurations
- Valid from/till date support for configuration transitions
- Stored in `id_configs` table

**3. SEZ/Customs Compliance**
- SEZ vs DTA classification for customs tracking
- Customs category tracking (Capital Goods, Consumables, Spares, Raw Materials)
- BOE (Bill of Entry) number and date recording
- CIF (Cost, Insurance, Freight) value recording
- Duty foregone amount calculation for SEZ benefits
- Import date and customs location tracking
- Usage purpose documentation for compliance

**4. Financial Management**
- Asset cost and capitalization date
- Multiple depreciation methods:
  - **Straight Line**: Equal depreciation per year
  - **Written Down Value (WDV)**: Reducing balance method
  - **None**: Non-depreciable assets
- Automatic yearly depreciation calculation
- Net book value tracking (purchase cost - accumulated depreciation)
- Cost center allocation for departmental accounting
- GL (General Ledger) code mapping
- Depreciation percentage configuration
- Last depreciation date tracking

**5. Location Tracking**
- Building-wise allocation with dropdown
- Floor-level tracking within buildings
- Room/Rack identification for precise location
- SEZ zone classification (SEZ, DTA, Bonded)
- Unit/Department assignment
- Handover tracking (Tenant or Other party)
- Location history via asset_movements

**6. Asset Movement System** (`src/pages/assets/AssetMovement.tsx`)
- Three movement types:
  - **Location**: Internal relocation within campus
  - **Maintenance**: External vendor movement for repairs
  - **Disposal**: Asset retirement/scrapping
- Movement request workflow:
  1. Request creation with reason and justification
  2. Approval authority assignment
  3. Approve/Reject actions with comments
  4. Actual movement date recording
  5. Return date tracking (for maintenance)
- Gate pass number generation for security
- Expected return date tracking
- From → To location mapping (building, floor, room)
- Vendor details for external movements (name, contact)
- Movement history audit trail
- Status tracking: Pending, Approved, Rejected, In Transit, Completed, Cancelled

**7. Maintenance Management**
- Preventive maintenance scheduling (see PM System)
- Breakdown maintenance tracking via tickets
- AMC (Annual Maintenance Contract) management
- Vendor/Engineer assignment
- SLA time tracking for response and resolution
- Downtime hours recording for availability metrics
- Repair cost tracking
- Next due date calculation
- Maintenance status workflow
- Integration with helpdesk tickets via ticket_assets junction

**8. Physical Audit System** (`src/pages/physical-audit/PhysicalAuditModule.tsx`)
- QR code scanning with Html5Qrcode library
- Manual asset ID entry fallback for damaged QR codes
- Real-time asset validation against database
- Verification checklist:
  - **Asset Found**: Yes/No (physical presence)
  - **Location Match**: Yes/No (matches recorded location)
  - **Tenant Match**: Yes/No (matches assigned tenant)
  - **Serial Number Match**: Yes/No (serial number verification)
- Physical condition assessment:
  - Good: Fully functional
  - Fair: Minor issues
  - Damaged: Requires repair
  - Scrap: Beyond repair
- Audit result: Pass (all checks), Issues (discrepancies found)
- Remarks field for detailed observations
- Audit history with pagination
- Auditor name tracking for accountability
- Scan type tracking (QR Code vs Manual)
- Asset details display with image
- Building and floor name resolution
- Stored in `physical_audits` table
- Export audit reports to Excel/PDF

**9. Preventive Maintenance (PM) System** (`src/pages/preventive-maintenance/PreventiveMaintenanceList.tsx`)
- PM schedule creation interface
- Bulk asset selection for PM scheduling
- Configurable PM parameters:
  - **Start date**: PM schedule start (required)
  - **End date**: PM schedule end (optional, null = ongoing)
  - **Frequency in days**: PM interval (required, e.g., 90 days)
- Automatic next PM date calculation:
  - Formula: `last_pm_date + frequency_days`
  - Recalculates after each PM completion
- PM status indicators:
  - **Overdue**: Past due date (red badge)
  - **Due**: Within 7 days (yellow badge)
  - **Upcoming**: More than 7 days (green badge)
- Filter by tenant and asset status
- Sort by PM date (ascending/descending)
- Asset search by name or ID
- PM-enabled assets tracking (boolean flag)
- Tenant name resolution for handover tracking
- Building and floor name resolution
- Pagination support for large datasets
- Stored in assets table fields:
  - `pm_enabled` (boolean)
  - `pm_start_date` (date)
  - `pm_end_date` (date, nullable)
  - `pm_frequency_days` (integer)
  - `pm_next_date` (date, auto-calculated)

**10. QR Code System**
- Individual QR code generation per asset
- Bulk QR code printing for multiple assets
- Logo embedding in QR codes for branding
- Print-optimized layout (grid format)
- Asset ID and name on labels
- Scannable for quick asset lookup
- Html5Qrcode integration for scanning
- QR code stored as image URL in database
- Mobile-friendly scanning interface

**11. Dashboard & Analytics**
- Total assets count by status
- Asset value summary (purchase cost, current value)
- Depreciation summary
- Assets by category (pie chart)
- Assets by location (bar chart)
- Upcoming PM schedule (calendar view)
- Overdue PM alerts
- Movement requests pending approval
- Recent audit results
- Asset utilization metrics

**12. Dynamic Dropdown Configuration**
- Master data management via `dropdown_configs` table
- Configurable categories with codes (e.g., ITE, FUR, MCH)
- Sub-types per category with codes (e.g., LPT, DSK, MON)
- Manufacturer lists per category
- Asset status options (Active, Maintenance, Disposed, etc.)
- SEZ status options (SEZ, DTA, Bonded)
- Customs category options
- JSONB storage for flexible schema
- Admin interface for adding/editing options
- Cascade updates to existing assets

**13. Integration Points**
- **Helpdesk**: Link assets to maintenance tickets via `ticket_assets`
- **Tenants**: Assign assets to tenants for handover tracking
- **Buildings**: Associate assets with buildings and floors
- **Users**: Track created_by and updated_by for audit
- **Notifications**: Alerts for PM due, movement approvals, audit discrepancies
- **Email**: Notifications for movement approvals, PM reminders

**14. Security & Compliance**
- Role-based access control for asset operations
- Audit trail for all asset changes
- SEZ compliance reporting
- Customs documentation tracking
- Depreciation audit trail
- Movement approval workflow
- Physical audit verification

**15. Export & Reporting**
- Asset register report (Excel/PDF)
- Depreciation schedule report
- Movement history report
- PM schedule report
- Audit discrepancy report
- Asset valuation report
- SEZ compliance report
- Custom filters and date ranges

### Database Schema

**assets table** (primary table):
```sql
id, asset_id, manual_asset_id, name, description, category, sub_type, 
manufacturer, model, serial_number, purchase_date, purchase_cost, 
supplier, warranty_expiry, status, location, building_id, floor_id, 
room_rack, tenant_id, handover_type, handover_name, handover_email, 
handover_contact, depreciation_method, depreciation_rate, current_value, 
last_depreciation_date, sez_status, customs_category, boe_number, 
boe_date, cif_value, duty_foregone, image_url, qr_code, pm_enabled, 
pm_start_date, pm_end_date, pm_frequency_days, pm_next_date, 
id_config_id, created_at, updated_at, created_by, updated_by
```

**asset_movements table**:
```sql
id, asset_id, movement_type, from_location, to_location, 
from_building_id, to_building_id, from_floor_id, to_floor_id, 
movement_date, expected_return_date, actual_return_date, reason, 
requested_by, approved_by, approval_date, status, gate_pass_number, 
vendor_name, vendor_contact, notes, created_at
```

**physical_audits table**:
```sql
id, asset_id, audit_date, auditor_name, scan_type, asset_found, 
location_match, tenant_match, serial_match, physical_condition, 
audit_result, remarks, created_at
```

**id_configs table**:
```sql
id, entity_type, structure, separator, start_value, digits, 
valid_from, valid_till, is_active, created_at, created_by, 
updated_at, updated_by
```

**dropdown_configs table**:
```sql
id, entity_type, field_name, config_data (JSONB), created_at, updated_at
```

**ticket_assets table** (junction):
```sql
id, ticket_id, asset_id, created_at
```

### Technical Implementation

**Frontend Components**:
- `AssetMaster.tsx` - Main asset list and CRUD
- `AssetMovement.tsx` - Movement request management
- `Configuration.tsx` - ID configuration interface
- `PreventiveMaintenanceList.tsx` - PM scheduling
- `PhysicalAuditModule.tsx` - QR scanning and audit
- `AssetForm.tsx` - Asset creation/edit form
- `AssetCard.tsx` - Asset detail card
- `QRCodeGenerator.tsx` - QR code generation
- `QRCodeScanner.tsx` - QR code scanning

**Services**:
- `assetService.ts` - Asset CRUD operations
- `assetMovementService.ts` - Movement operations
- `physicalAuditService.ts` - Audit operations
- `idConfigService.ts` - ID configuration
- `dropdownConfigService.ts` - Master data

**Utilities**:
- `assetIdGenerator.ts` - ID generation logic
- `depreciationCalculator.ts` - Depreciation calculations
- `qrCodeUtils.ts` - QR code generation/parsing
- `assetExport.ts` - Export functionality

### Best Practices

1. **Asset ID Management**:
   - Always use configured ID structure
   - Validate uniqueness before creation
   - Support manual override for legacy assets

2. **Movement Tracking**:
   - Require approval for all movements
   - Generate gate pass for security
   - Track return dates for external movements

3. **Physical Audit**:
   - Conduct regular audits (quarterly/annually)
   - Use QR codes for efficiency
   - Document all discrepancies
   - Follow up on issues promptly

4. **Preventive Maintenance**:
   - Schedule PM based on manufacturer recommendations
   - Track PM completion dates
   - Alert before PM due dates
   - Link PM to maintenance tickets

5. **Depreciation**:
   - Run depreciation calculation monthly/yearly
   - Maintain audit trail of calculations
   - Review depreciation rates annually
   - Generate depreciation reports for accounting

6. **SEZ Compliance**:
   - Maintain accurate BOE records
   - Track duty foregone amounts
   - Generate compliance reports
   - Audit SEZ asset movements

---
- Bonded assets (SEZ) count
- Gross asset value
- Net book value
- Duty foregone amount
- Pending approvals
- Under maintenance count
- Audit due alerts
- Warranty expiring alerts
- Movement today count
- PM overdue count
- Physical audit pending count

### Database Schema

**assets table**:
```sql
- id (uuid, primary key)
- asset_id (text, auto-generated, unique)
- asset_name (text)
- asset_category (text)
- asset_type (text)
- manufacturer (text)
- make_model (text)
- serial_number (text)
- asset_description (text)
- asset_spec (text)
- asset_value (numeric)
- quantity (integer)
- asset_status (enum: Active, Idle, Repair, Scrap)
- status (enum: Working, Not Working)
- asset_incharge (text)
- purchase_date (date)
- warranty_date (date)
- pm_date (date)
- depreciation_date (date)
- depreciation_percentage (numeric)
- last_depreciation_date (date)
- comments (text)
- asset_picture (text, URL)
- contract (enum: Yes, No)
- vendor_id (uuid)
- po_number (text)

-- Handover fields
- handover_type (text: 'tenant' | 'other')
- handover_to (uuid, FK to tenants, nullable)
- handover_other_name (text)
- handover_other_email (text)
- handover_other_contact (text)

-- SEZ/Customs fields
- sez_classification (text)
- sez_status (enum: SEZ, DTA)
- customs_category (enum: Capital Goods, Consumables, Spares)
- usage_purpose (text)
- vendor_name (text)
- invoice_number (text)
- invoice_date (date)
- boe_number (text)
- boe_date (date)
- cif_value (numeric)
- duty_foregone_amount (numeric)
- import_date (date)
- customs_location (text)

-- Financial fields
- asset_cost (numeric)
- capitalization_date (date)
- depreciation_method (enum: Straight Line, WDV, None)
- useful_life (integer, years)
- net_book_value (numeric)
- cost_center (text)
- gl_code (text)

-- Location fields
- sez_zone (text)
- unit (text)
- building (uuid, FK to buildings)
- floor (uuid, FK to floors)
- room_rack (text)

-- PM fields
- pm_enabled (boolean)
- pm_start_date (date)
- pm_end_date (date)
- pm_frequency_days (integer)
- pm_next_date (date)
```

**id_configs table**:
```sql
- id (uuid, primary key)
- entity_type (text: 'asset')
- structure (text: 'cat-type-seq', 'cat-year-seq', etc.)
- separator (text: '-', '/', '_')
- start_value (integer)
- digits (integer: 3-6)
- is_active (boolean)
- created_at (timestamp)
```

**physical_audits table**:
```sql
- id (uuid, primary key)
- asset_id (text, FK to assets.asset_id)
- audit_date (timestamp)
- auditor_name (text)
- barcode_scanned (boolean)
- asset_found (boolean)
- location_match (boolean)
- tenant_match (boolean)
- serial_match (boolean)
- condition (text: 'Good', 'Damaged', 'Scrap')
- audit_result (text: 'Pass', 'Issues')
- remarks (text)
```

**dropdown_configs table**:
```sql
- id (uuid, primary key)
- entity_type (text: 'asset')
- field_name (text: 'categories')
- config_data (jsonb)
  - Array of categories with:
    - id, name, code
    - subTypes: [{id, name, code}]
    - manufacturers: [string]
```
- floor (text)
- room_rack (text)
- handover_to (text)
- decommission_date (date)

-- Audit fields
- created_at (timestamp)
- updated_at (timestamp)
- created_by (text)
- updated_by (text)
```

**asset_movements table**:
```sql
- id (uuid, primary key)
- request_number (text, auto-generated)
- asset_id (text, FK to assets.asset_id)
- movement_type (enum: Intra, Inter, Temporary)
- from_location (text)
- to_location (text)
- reason (text)
- expected_return_date (date)
- approval_authority (text)
- gate_pass_number (text)
- movement_status (enum: Pending, Approved, Rejected, Completed)
- actual_movement_date (timestamp)
- created_at (timestamp)
```

**asset_maintenance table**:
```sql
- id (uuid, primary key)
- asset_id (text, FK to assets.asset_id)
- maintenance_type (enum: Preventive, Breakdown)
- schedule_date (date)
- vendor_engineer (text)
- amc_reference (text)
- sla_time (integer, hours)
- downtime_hours (numeric)
- repair_cost (numeric)
- next_due_date (date)
- maintenance_status (enum: Scheduled, In Progress, Completed, Cancelled)
- notes (text)
- created_at (timestamp)
```

**asset_amc table**:
```sql
- id (uuid, primary key)
- asset_id (text, FK to assets.asset_id)
- vendor_name (text)
- amc_number (text)
- start_date (date)
- end_date (date)
- amc_value (numeric)
- coverage_details (text)
- sla_hours (integer)
- status (enum: Active, Expired, Cancelled)
- created_at (timestamp)
```

**asset_physical_audit table**:
```sql
- id (uuid, primary key)
- audit_id (text, auto-generated)
- audit_name (text)
- audit_cycle (enum: Quarterly, Half-Yearly, Yearly)
- start_date (date)
- end_date (date)
- audit_team (text[])
- status (enum: Scheduled, In Progress, Completed, Cancelled)
- total_assets (integer)
- verified_assets (integer)
- discrepancies (integer)
- created_at (timestamp)
- completed_at (timestamp)
```

**asset_audit_records table**:
```sql
- id (uuid, primary key)
- audit_id (uuid, FK to asset_physical_audit)
- asset_id (text, FK to assets.asset_id)
- verification_status (enum: Verified, Missing, Damaged, Misplaced)
- physical_condition (enum: Good, Fair, Poor, Damaged)
- location_verified (boolean)
- actual_location (text)
- remarks (text)
- verified_by (text)
- verified_at (timestamp)
- photos (text[])
```

**asset_pm_schedule table**:
```sql
- id (uuid, primary key)
- pm_id (text, auto-generated)
- asset_id (text, FK to assets.asset_id)
- pm_type (enum: Time-Based, Usage-Based, Condition-Based)
- frequency (enum: Monthly, Quarterly, Half-Yearly, Yearly)
- last_pm_date (date)
- next_pm_date (date)
- pm_checklist (jsonb)
- assigned_to (text)
- status (enum: Scheduled, Overdue, Completed, Skipped)
- created_at (timestamp)
```

**asset_pm_records table**:
```sql
- id (uuid, primary key)
- pm_schedule_id (uuid, FK to asset_pm_schedule)
- asset_id (text, FK to assets.asset_id)
- pm_date (date)
- technician (text)
- checklist_completed (jsonb)
- issues_found (text)
- actions_taken (text)
- parts_replaced (text)
- cost (numeric)
- downtime_hours (numeric)
- next_pm_date (date)
- status (enum: Completed, Incomplete, Cancelled)
- completed_at (timestamp)
```

### Key Workflows

**Asset Creation Flow**:
1. User fills asset form with basic details
2. System generates unique asset_id via RPC function
3. Optional: Upload asset image
4. Optional: Add SEZ/Customs details
5. Optional: Configure depreciation
6. Save to database with created_by audit
7. Generate QR code for physical tagging

**Depreciation Automation**:
1. System checks depreciation_date on asset load
2. Compares with last_depreciation_date
3. If yearly cycle complete and date reached:
   - Calculate: current_value * (depreciation_percentage / 100)
   - Update: asset_value = current_value - depreciation_amount
   - Update: last_depreciation_date = today
4. Runs automatically on every asset list load

**Movement Request Flow**:
1. User selects asset and movement type
2. Fills from/to location details
3. Adds reason and remarks
4. System generates request_number
5. Status set to 'Pending'
6. Approval authority reviews
7. Approve → Status: 'Approved', record actual_movement_date
8. Reject → Status: 'Rejected'
9. Complete → Status: 'Completed'

**QR Code Printing Flow**:
1. User selects multiple assets via checkboxes
2. Clicks "Print QR" button
3. System generates QR codes with embedded logo
4. Creates print-optimized HTML layout
5. Each label shows: QR code, Asset ID, Asset Name
6. Browser print dialog opens
7. User prints on label sheets

**Physical Audit Flow**:
1. Admin creates audit schedule (cycle, dates, team)
2. System generates audit ID and asset list
3. Audit team receives notification
4. Team scans QR codes to verify assets
5. Records verification status:
   - Verified: Asset found, condition good
   - Missing: Asset not found at location
   - Damaged: Asset found but damaged
   - Misplaced: Asset found at wrong location
6. Captures photos and remarks
7. System tracks progress (verified/total)
8. Generates discrepancy report
9. Admin reviews and reconciles
10. Audit marked complete with report

**Preventive Maintenance Flow**:
1. PM schedule created for asset with frequency
2. System calculates next_pm_date based on last_pm_date
3. Notification sent 30/15/7 days before due
4. PM work order generated on due date
5. Technician assigned and notified
6. Technician completes PM checklist:
   - Visual inspection
   - Functional tests
   - Cleaning/Lubrication
   - Parts replacement
   - Calibration
7. Records issues found and actions taken
8. Updates asset condition and status
9. System calculates next PM date
10. PM record saved with cost and downtime
11. If overdue: Alert sent to manager

### UI Components

**AssetList.tsx** (`src/pages/assets/AssetList.tsx`):
- HeroUI-styled table with gray header
- Circular avatar placeholders for assets
- Asset image thumbnails
- Status badges with color coding
- Multi-select checkboxes
- Bulk QR code printing
- Search functionality
- Action buttons: View, Edit, Delete
- Responsive design

**AssetMovement.tsx** (`src/pages/assets/AssetMovement.tsx`):
- Dashboard stats cards
- Movement request form
- From → To location mapping
- Vendor details section
- Approval workflow buttons
- Movement history table
- Status badges

**AssetService.ts** (`src/services/assetService.ts`):
- Complete CRUD operations
- Auto-depreciation logic
- Movement management
- Maintenance tracking
- AMC management
- Dashboard statistics
- Audit log retrieval

### Recent UI Improvements

**HeroUI Design Implementation**:
- Light mode styling with white backgrounds
- Gray-50 table headers
- Uppercase header labels
- Status badges with soft colors
- Hover effects on rows
- Improved typography hierarchy
- Action button tooltips
- Responsive grid layouts

**Table Enhancements**:
- Asset image display in table
- Serial number as subtitle
- Category with type breakdown
- Value formatting with ₹ symbol
- Status color coding:
  - Active: Green
  - Idle: Red
  - Repair: Yellow
- Centered action column

### Integration Points

**Building Service Integration**:
- Links assets to buildings table
- Floor-level allocation
- Location hierarchy: Building → Floor → Room

**User Service Integration**:
- Asset incharge assignment
- Created by / Updated by tracking
- Approval authority mapping

**Vendor Management**:
- Vendor linking for purchases
- AMC vendor tracking
- Maintenance vendor assignment

### Export & Reporting

**Available Exports**:
- Asset master list (Excel/PDF)
- Movement history report
- Maintenance schedule
- Depreciation report
- SEZ compliance report
- Asset valuation summary

**QR Code Features**:
- Individual QR generation
- Bulk printing
- Logo embedding
- Print-optimized layout
- Asset ID encoding

### Security & Permissions

**Access Control**:
- View assets: All users with Assets permission
- Create assets: Add permission required
- Edit assets: Edit permission required
- Delete assets: Delete permission required
- Approve movements: Manager/Admin only

**Audit Trail**:
- Created by tracking
- Updated by tracking
- Timestamp recording
- Movement history
- Maintenance logs

### Performance Optimizations

- Lazy loading of asset images
- Pagination for large datasets
- Indexed database queries
- Cached building/floor data
- Optimized QR code generation
- Batch depreciation processing

### Future Enhancements

**Planned Features**:
- Barcode scanning mobile app
- Asset transfer between companies
- Insurance tracking
- Lease asset management
- Asset disposal workflow
- Physical verification module (✅ Documented)
- Asset tagging history
- Geolocation tracking
- IoT sensor integration
- Predictive maintenance using AI
- Mobile app for PM execution
- Offline audit capability
- Asset lifecycle analytics

**Physical Audit Enhancements**:
- Mobile app with offline mode
- Barcode/RFID scanning
- GPS location tracking
- Photo comparison (before/after)
- Automated discrepancy alerts
- Integration with accounting systems

**PM System Enhancements**:
- Predictive maintenance algorithms
- IoT sensor integration
- Automated work order creation
- Spare parts inventory integration
- Vendor portal for external PM
- PM effectiveness metrics
- Failure pattern analysis

### Troubleshooting

**Common Issues**:

**QR codes not printing**: Check browser print settings, ensure logo image loads

**Depreciation not calculating**: Verify depreciation_date and depreciation_percentage are set

**Movement approval fails**: Check user has approval authority permission

**Asset image not uploading**: Verify file size < 200MB, check upload directory permissions

**Building not showing in dropdown**: Ensure building exists in buildings table

**PM notifications not sending**: Check pm_date is set, verify notification service is running

**Audit progress not updating**: Ensure asset_audit_records are being created, check audit_id FK

**PM overdue not showing**: Verify next_pm_date < today, check PM schedule status is 'Scheduled'

**Audit discrepancies not calculating**: Check verification_status values, ensure audit is 'In Progress'

---

## 21. Recent UI/UX Improvements

### Sidebar Enhancements
- Increased collapsed width from 3rem to 3.6rem (20% wider)
- Hidden toggle button on desktop (mobile-only)
- Removed sidebar rail component
- Desktop hover expand/collapse
- Cleaner edge appearance

### Table Styling - HeroUI Design
- Applied to Asset Master and Tenant Management
- Circular gradient avatars with initials
- Tooltips on all action buttons
- Enhanced typography with bold headers
- Softer status badge colors (light green for Active)
- Hover effects on table rows
- Gray-50 header backgrounds
- Improved visual hierarchy

### Tenant Management Updates
- Space assignment deletion with confirmation
- Multi-select checkbox for bulk operations
- Real-time UI refresh after changes
- Save button for quick updates
- Database synchronization improvements
- Floor sqft recalculation
- Company/tenant display with avatar
- Current rent with subtitle
- Tooltip-enabled action buttons

### Code Quality
- Removed all testing console.log statements
- Cleaned up debug logging
- Minimal code approach
- Optimized component rendering
