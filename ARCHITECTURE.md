# Rathinam Nexus Suite - Complete Architecture Documentation

**Last Updated:** January 2025  
**Version:** 3.0  
**Status:** Production-Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Core Modules](#core-modules)
4. [Database Architecture](#database-architecture)
5. [Authentication & Authorization](#authentication--authorization)
6. [Key Features](#key-features)
7. [API Architecture](#api-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Implementation](#security-implementation)
10. [Performance Optimizations](#performance-optimizations)

---

## System Overview

Rathinam Nexus Suite is a comprehensive enterprise management platform designed for multi-tenant property and asset management. The system provides end-to-end solutions for:

- **Property Management**: Building, floor, and space allocation
- **Tenant Management**: Onboarding, agreements, billing, and reporting
- **Asset Management**: Complete lifecycle tracking with workflow approvals
- **Preventive Maintenance**: Scheduled PM tasks with assignment and tracking
- **Helpdesk System**: Ticket management with SLA tracking
- **Workflow Engine**: Configurable multi-step approval workflows
- **Financial Management**: Rent collection, invoicing, expenses, and deposits
- **Reporting & Analytics**: Comprehensive tenant and PM reports

### Architecture Pattern

- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js/Express with Supabase (PostgreSQL)
- **State Management**: React Query + Context API
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Real-time**: Supabase Realtime subscriptions
- **File Storage**: Supabase Storage + Local uploads

---

## Technology Stack

### Frontend Technologies

```typescript
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.5.3",
  "build": "Vite 5.4.2",
  "routing": "React Router DOM 6.26.1",
  "state": "TanStack Query 5.53.1",
  "ui": "Tailwind CSS 3.4.10 + shadcn/ui",
  "forms": "React Hook Form 7.53.0",
  "charts": "Recharts 2.12.7",
  "pdf": "jsPDF 2.5.1",
  "excel": "xlsx 0.18.5",
  "qr": "qrcode.react 3.1.0",
  "workflow": "ReactFlow 11.11.4"
}
```

### Backend Technologies

```typescript
{
  "runtime": "Node.js 20+",
  "framework": "Express 4.19.2",
  "database": "PostgreSQL 15 (Supabase)",
  "orm": "Supabase Client 2.45.3",
  "auth": "Supabase Auth + Custom JWT",
  "storage": "Supabase Storage + Multer",
  "email": "Nodemailer 6.9.15",
  "validation": "Zod 3.23.8"
}
```

### Database

- **Primary**: PostgreSQL 15 (Supabase)
- **Real-time**: Supabase Realtime
- **Row Level Security**: Enabled for all tables
- **Migrations**: SQL-based versioned migrations

---

## Core Modules

### 1. Tenant Management Module

**Purpose**: Complete tenant lifecycle management from application to move-out

**Key Features**:
- Tenant onboarding with digital signatures
- Agreement management with space assignments
- Branch and parent-child tenant relationships
- Company group management
- Tenant-specific permissions and access control
- Document management (ID proofs, agreements, etc.)

**Database Tables**:
- `tenants` - Core tenant information
- `agreements` - Lease agreements with JSONB fields
- `tenant_applications` - Application workflow
- `tenant_documents` - Document storage references

**Components**:
- `TenantManagement.tsx` - Main tenant list and management
- `TenantForm.tsx` - Create/edit tenant
- `TenantViewDialog.tsx` - Detailed tenant view
- `AgreementViewModal.tsx` - Agreement details
- `TenantCompanyProfile.tsx` - Tenant portal profile

**Services**:
- `tenantService.ts` - CRUD operations
- `enhancedTenantService.ts` - Advanced queries
- `realTimeTenantService.ts` - Real-time subscriptions
- `tenantReportService.ts` - Comprehensive reporting

---

### 2. Asset Management Module

**Purpose**: Complete asset lifecycle tracking from procurement to disposal

**Key Features**:
- Asset master data with hierarchical categorization (Type > Category > Sub-Category)
- Asset combinations (Color, Material, Size)
- Multiple asset images (max 2 per asset)
- QR code generation for asset tracking
- Location tracking (Building > Floor > Room)
- Handover management (Tenant or Other)
- Depreciation calculation (automatic yearly)
- SEZ/Customs classification
- Vendor/Contract management
- Asset history and audit trail
- Bulk asset creation with auto-generated IDs
- Thermal label printing (2x1 inch format)

**Database Tables**:
- `assets` - Core asset information
- `asset_movements` - Movement requests and approvals
- `asset_history` - Change tracking
- `physical_audits` - Physical verification records
- `asset_service_records` - Service and maintenance history
- `preventive_maintenance` - PM schedules
- `pm_task_instances` - Date-specific PM tasks
- `form_dropdowns` - Asset categories
- `form_subcategories` - Asset sub-categories
- `form_sub_subcategories` - Asset types
- `sub_subcategory_combinations` - Color/Material/Size combinations
- `id_configs` - Asset ID generation configuration

**Components**:
- `AssetMaster.tsx` - Main asset management interface
- `AssetList.tsx` - Asset listing with filters
- `AssetForm.tsx` - Create/edit asset
- `AssetMovement.tsx` - Movement request creation
- `PMTaskBoard.tsx` - PM task assignment and tracking
- `PMSchedule.tsx` - PM schedule configuration
- `PhysicalAuditModule.tsx` - Physical audit interface

**Services**:
- `assetService.ts` - CRUD and business logic
- `pmTaskService.ts` - PM task management
- `pmService.ts` - PM schedule operations

**Key Workflows**:
1. **Asset Creation**: Category selection → Auto-ID generation → Location assignment → Handover
2. **Asset Movement**: Request creation → Workflow approval → Location update → History tracking
3. **PM Scheduling**: Asset selection → Frequency setup → Task generation → Assignment → Completion
4. **Physical Audit**: Asset scan → Location verification → Condition check → GPS capture

---

### 3. Workflow Engine Module

**Purpose**: Configurable multi-step approval workflows for asset movements and other processes

**Key Features**:
- Visual workflow builder with drag-and-drop
- Node types: Movement Request, Approval, Condition (Approved/Rejected), End
- Approval types: Any One, All Must Approve
- SLA tracking with escalation
- Real-time notifications
- Workflow versioning
- Tenant-specific workflows with fallback to default
- Complete audit trail
- Workflow execution viewer

**Database Tables**:
- `workflows` - Workflow definitions
- `workflow_nodes` - Individual workflow nodes
- `workflow_edges` - Node connections
- `workflow_instances` - Runtime workflow executions
- `workflow_instance_steps` - Step-by-step execution tracking
- `workflow_actions` - User actions (approve/reject)
- `workflow_notifications` - Notification delivery tracking

**Components**:
- `WorkflowBuilder.tsx` - Visual workflow designer
- `WorkflowManagementPage.tsx` - Workflow list and management
- `PendingApprovalsDashboard.tsx` - Approval queue
- `ApprovalList.tsx` - User-specific approvals
- `WorkflowExecutionViewer.tsx` - Workflow progress visualization

**Services**:
- `workflowEngine.ts` - Core execution engine
- `workflowService.ts` - Workflow CRUD operations

**Workflow Execution Flow**:
1. **Trigger**: Asset movement request created
2. **Instance Creation**: Workflow instance created with context data
3. **Node Traversal**: Engine moves through nodes based on graph
4. **Approval Steps**: Users approve/reject at each approval node
5. **Condition Evaluation**: Routes based on approval/rejection
6. **Completion**: Reaches END node (approved or rejected)
7. **Entity Update**: Asset locations updated on approval

**Graph Structure**:
```
MOVEMENT_REQUEST → APPROVAL_1 → CONDITION_APPROVED → APPROVAL_2 → END (Approved)
                              ↓
                         CONDITION_REJECTED → END (Rejected)
```

---

### 4. Preventive Maintenance (PM) Module

**Purpose**: Scheduled preventive maintenance task management with assignment and tracking

**Key Features**:
- PM schedule configuration per asset
- Automatic task instance generation based on frequency
- Date-specific task assignment
- Task status tracking (Overdue, Due Today, Upcoming, Completed)
- Bulk assignment to auditors
- Multi-level filtering (Category, Building, Floor, Tenant, etc.)
- PM task board with Kanban-style view
- Integration with physical audit module
- Excel export for reporting

**Database Tables**:
- `preventive_maintenance` - PM schedules per asset
- `pm_task_instances` - Date-specific task instances
- `physical_audits` - Audit completion records

**Components**:
- `PMTaskBoard.tsx` - Main PM task interface
- `PMSchedule.tsx` - Schedule configuration
- `PMReportModal.tsx` - PM reporting interface
- `PMReportFilters.tsx` - Report filter options

**Services**:
- `pmTaskService.ts` - Task management and assignment
- `pmService.ts` - Schedule CRUD operations
- `pmReportService.ts` - Report generation
- `pmExcelExportService.ts` - Excel export

**PM Task Lifecycle**:
1. **Schedule Creation**: Asset + Frequency + Start Date
2. **Task Generation**: Automatic daily task instance creation
3. **Assignment**: Assign to auditor (individual or bulk)
4. **Execution**: Auditor performs physical audit
5. **Completion**: Audit result recorded, task marked complete
6. **Next Cycle**: New task generated based on frequency

**Status Logic**:
- **OVERDUE**: Task date < today AND not completed
- **PENDING** (Due Today): Task date = today AND not completed
- **UPCOMING**: Task date > today OR completed
- **COMPLETED**: Audit completed for the task

---

### 5. Tenant Reporting Module

**Purpose**: Comprehensive 360° tenant reporting with multi-sheet Excel export

**Key Features**:
- 5-sheet Excel report generation
- Advanced filtering (Tenant, Company Group, Date Range, Building, Status)
- Real-time data aggregation
- Financial breakdown with escalations
- Space allocation tracking
- Compliance monitoring

**Report Sheets**:
1. **Tenant Summary**: Overview with counts and totals
2. **Agreement Details**: Lease information with expiry tracking
3. **Space Allocation**: Building/Floor/Room assignments
4. **Financial Breakdown**: Rent, charges, escalations
5. **Compliance**: GST, PAN, documents

**Components**:
- `TenantReportModal.tsx` - Report generation interface
- `TenantReportFilters.tsx` - Filter configuration
- `TenantReportPreview.tsx` - Report preview

**Services**:
- `tenantReportService.ts` - Data aggregation and report generation
- `tenantExcelExportService.ts` - Excel file creation

**Data Flow**:
1. User selects filters
2. Service queries database with filters
3. Data aggregated across multiple tables
4. Report structure built with 5 sheets
5. Excel file generated and downloaded

---

### 6. Helpdesk Module

**Purpose**: Unified ticket management system for maintenance requests with email notifications

**Key Features**:
- Ticket creation with asset linking
- Priority and category management
- Status workflow (Open → In Progress → Resolved → Closed)
- Technician assignment
- SLA tracking
- Tenant and admin views
- Real-time email notifications with user preferences
- Ticket history and comments
- Configurable email templates per event and role

**Database Tables**:
- `maintenance_tickets` - Core ticket data
- `ticket_assets_junction` - Asset-ticket relationships
- `ticket_comments` - Ticket communication
- `ticket_attachments` - File attachments
- `email_global_settings` - Global email on/off switch
- `notification_settings` - Per-event notification rules
- `email_templates` - Email templates per event and role
- `email_branding` - Company branding for emails
- `notification_logs` - Email delivery logs

**Components**:
- `UnifiedHelpdeskPage.tsx` - Admin helpdesk interface
- `MaintenanceRequestsPage.tsx` - Tenant ticket view
- `MaintenanceTicketForm.tsx` - Ticket creation
- `TicketDetailView.tsx` - Ticket details and actions

**Services**:
- `helpdeskService.ts` - Ticket CRUD operations
- `ticketNotifications.ts` - Notification handling

**Email Notification System**:
- Global email toggle in `email_global_settings` table
- Per-event notification rules in `notification_settings` table
- Per-user notification preferences via `receive_ticket_notifications` column
- Email templates per event and role (creator, manager, helpdesk)
- Batch email sending with rate limiting
- Complete notification logging in `notification_logs` table

**Notification Flow**:
1. **Ticket Event**: Ticket status changes (created, assigned, resolved, etc.)
2. **Global Check**: Verify global email notifications are enabled
3. **Event Check**: Check if event has notifications enabled
4. **User Filter**: Only send to users with `receive_ticket_notifications = true`
5. **Template Render**: Fetch and render email template for user role
6. **Batch Send**: Send emails via SMTP with rate limiting
7. **Log Result**: Record success/failure in notification logs

**User Notification Control**:
- Users can enable/disable ticket email notifications in UserForm.tsx
- Setting stored in `users.receive_ticket_notifications` column
- Only applies to users with Manage Tickets, Helpdesk, or Tenant roles
- Checked before sending any ticket-related emails

---

### 7. Financial Management Module

**Purpose**: Complete financial operations including rent, invoices, expenses, and deposits

**Key Features**:
- Rent collection tracking
- Invoice generation and approval
- Expense management
- Deposit tracking
- Payment recording
- Financial reports and analytics

**Database Tables**:
- `rent_collections` - Rent payment records
- `invoices` - Invoice generation
- `expenses` - Expense tracking
- `deposits` - Deposit management
- `payments` - Payment records

**Components**:
- `RentCollectionManagement.tsx` - Rent tracking
- `InvoiceManagement.tsx` - Invoice operations
- `ExpensesManagement.tsx` - Expense tracking
- `DepositsManagement.tsx` - Deposit management

**Services**:
- `billingService.ts` - Billing operations

---

## Database Architecture

### Core Tables

#### Users & Authentication
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT,
  permissions JSONB,
  is_active BOOLEAN,
  is_approver BOOLEAN,
  asset_movement_approver BOOLEAN,
  asset_incharge BOOLEAN,
  asset_auditor BOOLEAN,
  tenant_id UUID REFERENCES tenants(id),
  branch_access UUID[],
  user_management_access JSONB,
  notifications_enabled BOOLEAN,
  receive_ticket_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Tenants
```sql
tenants (
  id UUID PRIMARY KEY,
  company TEXT,
  name TEXT,
  email TEXT,
  phone_numbers TEXT,
  status TEXT,
  is_main_branch BOOLEAN,
  parent_tenant_id UUID REFERENCES tenants(id),
  companygroup TEXT,
  is_gst_company BOOLEAN,
  gst_number TEXT,
  pan_number TEXT,
  tan_number TEXT,
  cin_number TEXT,
  branch_access UUID[],
  permissions JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Assets
```sql
assets (
  id UUID PRIMARY KEY,
  asset_id TEXT UNIQUE,
  asset_name TEXT,
  asset_category TEXT,
  asset_sub_category TEXT,
  asset_type TEXT,
  asset_combination UUID REFERENCES sub_subcategory_combinations(id),
  manufacturer TEXT,
  make_model TEXT,
  serial_number TEXT,
  asset_description TEXT,
  asset_spec TEXT,
  asset_value NUMERIC,
  asset_status TEXT,
  status TEXT,
  building UUID REFERENCES buildings(id),
  floor_id UUID REFERENCES floors(id),
  room_id UUID REFERENCES rooms(id),
  handover_to UUID REFERENCES tenants(id),
  handover_other_name TEXT,
  handover_other_email TEXT,
  handover_other_contact TEXT,
  asset_pictures TEXT, -- JSON array
  asset_incharge UUID REFERENCES users(id),
  purchase_date DATE,
  warranty_date DATE,
  depreciation_date DATE,
  depreciation_percentage NUMERIC,
  last_depreciation_date DATE,
  sez_status TEXT,
  customs_category TEXT,
  contract TEXT,
  vendor_id UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by TEXT,
  updated_by TEXT
)
```

#### Asset Movements
```sql
asset_movements (
  id UUID PRIMARY KEY,
  request_number TEXT UNIQUE,
  assets UUID[], -- Array of asset IDs
  movement_type TEXT,
  movement_date DATE,
  from_building UUID REFERENCES buildings(id),
  from_floor UUID REFERENCES floors(id),
  from_room TEXT,
  to_building UUID REFERENCES buildings(id),
  to_floor UUID REFERENCES floors(id),
  to_room TEXT,
  from_tenant TEXT,
  to_tenant TEXT,
  handover_to TEXT,
  handover_name TEXT,
  handover_email TEXT,
  handover_mobile TEXT,
  movement_reason TEXT,
  remarks TEXT,
  approval_required BOOLEAN,
  approval_status TEXT,
  movement_status TEXT,
  workflow_approver_ids UUID[], -- All approvers in workflow
  requested_by TEXT,
  created_at TIMESTAMP
)
```

#### Preventive Maintenance
```sql
preventive_maintenance (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  pm_enabled BOOLEAN,
  pm_frequency_days INTEGER,
  pm_next_date DATE,
  pm_end_date DATE,
  pm_last_completed_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

pm_task_instances (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  pm_schedule_id UUID REFERENCES preventive_maintenance(id),
  task_date DATE,
  status TEXT, -- OVERDUE, PENDING, UPCOMING, COMPLETED
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  assignment_notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(asset_id, task_date)
)
```

#### Workflow Engine
```sql
workflows (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id),
  entity_type TEXT,
  version INTEGER,
  is_active BOOLEAN,
  is_default BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

workflow_nodes (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  node_id TEXT,
  node_type TEXT, -- start, approval, condition, end
  label TEXT,
  position_x NUMERIC,
  position_y NUMERIC,
  approval_type TEXT, -- single, all, any
  approver_user_ids UUID[],
  sla_hours INTEGER,
  end_type TEXT, -- approved, rejected (for END nodes)
  created_at TIMESTAMP
)

workflow_edges (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  edge_id TEXT,
  source_node_id TEXT,
  target_node_id TEXT,
  condition_label TEXT,
  created_at TIMESTAMP
)

workflow_instances (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  workflow_version INTEGER,
  entity_type TEXT,
  entity_id UUID,
  tenant_id UUID REFERENCES tenants(id),
  status TEXT, -- pending, in_progress, completed, rejected
  current_node_id TEXT,
  context_data JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
)

workflow_instance_steps (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES workflow_instances(id),
  node_id TEXT,
  step_number INTEGER,
  node_type TEXT,
  status TEXT, -- pending, approved, rejected
  assigned_user_ids UUID[],
  approval_type TEXT,
  required_approvals INTEGER,
  received_approvals INTEGER,
  sla_deadline TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
)

workflow_actions (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES workflow_instances(id),
  step_id UUID REFERENCES workflow_instance_steps(id),
  action_type TEXT, -- approve, reject
  action_by UUID REFERENCES users(id),
  action_at TIMESTAMP,
  remarks TEXT,
  attachments JSONB
)
```

### Row Level Security (RLS)

All tables have RLS enabled with policies based on:
- User role (Super Admin, Admin, Tenant, etc.)
- Tenant ID for multi-tenancy
- Branch access for hierarchical permissions
- Module-specific permissions

Example RLS Policy:
```sql
CREATE POLICY "Users can view their tenant's assets"
ON assets FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE tenant_id = assets.handover_to
  )
);
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login**: Email + Password → Supabase Auth
2. **Password Verification**: RPC function `verify_user_password` or `verify_tenant_password`
3. **Session Creation**: JWT token stored in localStorage
4. **User Context**: AuthContext provides user data across app

### Authorization Levels

1. **Super Admin**: Full system access
2. **Admin**: Tenant-specific admin access
3. **Accountant**: Financial module access
4. **Helpdesk**: Ticket management access
5. **Technician**: Ticket resolution access
6. **Maintenance Manager**: PM and asset access
7. **Tenant**: Limited portal access
8. **Vendor**: Contract-specific access

### Permission System

Permissions stored as JSONB array:
```json
[
  {
    "module": "Assets",
    "view": true,
    "create": true,
    "edit": true,
    "delete": false
  },
  {
    "module": "Tenants",
    "view": true,
    "create": false,
    "edit": false,
    "delete": false
  }
]
```

### Route Protection

```typescript
<PermissionGuard path="/admin/assets">
  <AssetMaster />
</PermissionGuard>
```

---

## Key Features

### 1. Multi-Tenancy
- Tenant isolation at database level
- Branch access control
- Parent-child tenant relationships
- Tenant-specific workflows

### 2. Real-Time Updates
- Supabase Realtime subscriptions
- Live notifications
- Collaborative editing
- Status updates

### 3. Document Management
- Supabase Storage integration
- File upload with compression
- Document categorization
- Access control

### 4. Reporting & Analytics
- Excel export (XLSX)
- PDF generation (jsPDF)
- Custom report builders
- Dashboard analytics

### 5. Mobile Responsiveness
- Responsive design with Tailwind
- Touch-optimized interfaces
- Mobile-first components
- Progressive Web App (PWA) ready

### 6. Audit Trail
- Complete change history
- User action tracking
- Timestamp logging
- Rollback capability

---

## API Architecture

### REST API Endpoints

#### Assets
```
GET    /api/assets              - List assets
POST   /api/assets              - Create asset
GET    /api/assets/:id          - Get asset details
PUT    /api/assets/:id          - Update asset
DELETE /api/assets/:id          - Delete asset
POST   /api/assets/bulk         - Bulk create assets
```

#### Asset Movements
```
GET    /api/movements           - List movements
POST   /api/movements           - Create movement request
GET    /api/movements/:id       - Get movement details
PUT    /api/movements/:id       - Update movement status
```

#### Workflows
```
GET    /api/workflows           - List workflows
POST   /api/workflows           - Create workflow
GET    /api/workflows/:id       - Get workflow details
PUT    /api/workflows/:id       - Update workflow
DELETE /api/workflows/:id       - Delete workflow
POST   /api/workflows/:id/publish - Publish workflow
```

#### Approvals
```
GET    /api/approvals           - Get pending approvals
POST   /api/approvals/:id/approve - Approve step
POST   /api/approvals/:id/reject  - Reject step
```

#### PM Tasks
```
GET    /api/pm-tasks            - List PM tasks
POST   /api/pm-tasks/assign     - Assign task
POST   /api/pm-tasks/bulk-assign - Bulk assign tasks
GET    /api/pm-tasks/stats      - Get task statistics
```

### Supabase RPC Functions

```sql
-- Password verification
verify_user_password(user_email TEXT, user_password TEXT) RETURNS BOOLEAN

-- Workflow helpers
get_active_workflow(p_tenant_id UUID, p_entity_type TEXT) RETURNS TABLE(...)
can_user_approve_step(p_step_id UUID, p_user_id UUID) RETURNS BOOLEAN

-- PM task generation
generate_pm_task_instances(p_start_date DATE, p_end_date DATE) RETURNS VOID
```

---

## Deployment Architecture

### Production Deployment

```
┌─────────────────┐
│   Cloudflare    │ (CDN + DDoS Protection)
└────────┬────────┘
         │
┌────────▼────────┐
│   Nginx/Apache  │ (Reverse Proxy + SSL)
└────────┬────────┘
         │
┌────────▼────────┐
│   React App     │ (Static Build)
│   (Vite Build)  │
└────────┬────────┘
         │
┌────────▼────────┐
│  Node.js API    │ (Express Server)
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase      │ (PostgreSQL + Auth + Storage)
└─────────────────┘
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# API
VITE_API_URL=https://api.rathinam-nexus.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx

# Storage
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=10485760
```

### Build Process

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Build backend
cd server && npm run build

# Deploy
npm run deploy
```

---

## Security Implementation

### 1. Authentication Security
- Encrypted password storage (bcrypt)
- JWT token-based sessions
- Session timeout (8 hours)
- Password complexity requirements

### 2. Authorization Security
- Role-based access control (RBAC)
- Row-level security (RLS)
- Module-level permissions
- API endpoint protection

### 3. Data Security
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)
- CSRF protection (token validation)
- File upload validation

### 4. Network Security
- HTTPS/SSL encryption
- CORS configuration
- Rate limiting
- DDoS protection (Cloudflare)

### 5. Audit & Compliance
- Complete audit trail
- User action logging
- Data retention policies
- GDPR compliance ready

---

## Performance Optimizations

### 1. Frontend Optimizations
- Code splitting with React.lazy()
- Image compression and lazy loading
- Virtual scrolling for large lists
- Debounced search inputs
- Memoized components (React.memo)
- Optimized re-renders

### 2. Backend Optimizations
- Database indexing on frequently queried columns
- Query optimization with EXPLAIN ANALYZE
- Connection pooling
- Caching with Redis (optional)
- Batch operations for bulk updates

### 3. Database Optimizations
- Composite indexes for multi-column queries
- Partial indexes for filtered queries
- JSONB indexing for metadata fields
- Materialized views for complex reports
- Query result caching

### 4. Asset Loading
- Lazy loading of asset lists (pagination)
- On-demand data fetching
- Optimistic UI updates
- Background data synchronization

### 5. File Handling
- Image compression before upload
- Thumbnail generation
- CDN for static assets
- Chunked file uploads for large files

---

## Module Integration Flow

### Asset Movement with Workflow Approval

```
1. User creates asset movement request
   ↓
2. System checks if workflow exists for tenant
   ↓
3. Workflow instance created
   ↓
4. First approval step created
   ↓
5. Notifications sent to approvers
   ↓
6. Approver approves/rejects
   ↓
7. Workflow engine moves to next node
   ↓
8. Process repeats until END node
   ↓
9. If approved: Asset locations updated
   ↓
10. Asset history records created
```

### PM Task Execution Flow

```
1. PM schedule created for asset
   ↓
2. Daily cron job generates task instances
   ↓
3. Tasks appear on PM Task Board
   ↓
4. Admin assigns tasks to auditors
   ↓
5. Auditor performs physical audit
   ↓
6. Audit result recorded
   ↓
7. Task marked as completed
   ↓
8. Next task generated based on frequency
```

### Tenant Reporting Flow

```
1. User selects report filters
   ↓
2. Service queries multiple tables
   ↓
3. Data aggregated and transformed
   ↓
4. 5-sheet Excel structure created
   ↓
5. Financial calculations performed
   ↓
6. Excel file generated
   ↓
7. File downloaded to user
```

---

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native mobile application
2. **Advanced Analytics**: AI-powered insights and predictions
3. **IoT Integration**: Sensor data for asset monitoring
4. **Blockchain**: Immutable audit trail
5. **Multi-language**: Internationalization (i18n)
6. **Advanced Workflows**: More node types and conditions
7. **API Gateway**: GraphQL API layer
8. **Microservices**: Service-oriented architecture

### Scalability Roadmap
1. **Horizontal Scaling**: Load balancer + multiple app servers
2. **Database Sharding**: Tenant-based data partitioning
3. **Caching Layer**: Redis for session and query caching
4. **Message Queue**: RabbitMQ for async processing
5. **CDN**: Global content delivery network
6. **Monitoring**: Application performance monitoring (APM)

---

## Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Component-based architecture
- Functional components with hooks
- Custom hooks for reusable logic
- Service layer for business logic

### Git Workflow
- Feature branches from `main`
- Pull request reviews required
- Automated testing on PR
- Semantic versioning
- Changelog maintenance

### Testing Strategy
- Unit tests with Jest
- Integration tests with React Testing Library
- E2E tests with Playwright
- API tests with Supertest
- Performance testing with Lighthouse

---

## Support & Maintenance

### Monitoring
- Application logs (Winston)
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- Uptime monitoring (UptimeRobot)

### Backup Strategy
- Daily database backups
- Weekly full system backups
- Point-in-time recovery enabled
- Backup retention: 30 days

### Update Process
1. Development → Staging → Production
2. Database migrations tested in staging
3. Rollback plan prepared
4. User notification before updates
5. Post-deployment verification

---

## Contact & Documentation

**Project Repository**: [GitHub Link]  
**Documentation**: [Docs Link]  
**Support Email**: support@rathinam-nexus.com  
**Developer**: Rathinam Development Team

---

**End of Architecture Documentation**
