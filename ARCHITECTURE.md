---
# Technical Architecture Document – Rathinam Nexus Suite

---

## Reconciliation Notes

- **Backend Presence:** The codebase **does** contain a full Express/Node.js backend. Evidence: `server/index.js` (lines 1‑7) initializes an Express app and defines API routes; `server/package.json` (lines 1‑7) lists `express` as a dependency and sets `main` to `index.js`. This contradicts the earlier claim in *v1* that no backend exists.
- **Authentication Mechanism:** Authentication is handled **both** by Supabase (via JWT‑based sessions) **and** by a custom RPC function `verify_user_password`. The Supabase‑native auth is represented by the `verifyAuth` middleware (`server/middleware/auth.js` lines 8‑58) which validates a Supabase session token and falls back to checking the `tenants` table. The custom `verify_user_password` function (Supabase SQL definition) supports bcrypt hashes **and** a plain‑text fallback.
- **Password Storage:** The `tenants` table includes a `password` column of type `text` (Supabase schema query result). This column is currently used for **plain‑text** passwords when the stored value does not start with `$2` (bcrypt prefix). This matches the warning in *v2* about plain‑text passwords and confirms a real security issue that must be addressed.
- **Why the Docs Diverged:** The **v1** documentation predates the introduction of the Express backend (added in a later commit) and assumes the project relied solely on Supabase’s built‑in auth. The **v2** documentation reflects the current state where a custom backend was added for file uploads, rate‑limiting, and extended API routes, but the documentation was not fully updated to reconcile the two sources. The discrepancies have now been resolved and are reflected in this consolidated architecture.

---

# 1. Overview

Rathinam Nexus Suite is a full‑stack web application that combines a **React/TypeScript** frontend with a **Node‑Express** backend and **Supabase** as the primary data and storage layer. The system manages **tenants**, **assets**, **billing**, **maintenance**, **helpdesk**, and **reports**.

### Core Technologies
- **Frontend:** React 18 (TS), Tailwind CSS, React‑Query, Radix UI components.
- **Backend/API:** Node ≥ 18, Express 4.18, Multer (file uploads), Nodemailer (SMTP).
- **Database & Auth:** Supabase Postgres, Supabase Auth (JWT), custom RPC `verify_user_password`.
- **File Storage:** Supabase Storage buckets (`Tenant_uploads`, `asset_images`).
- **Email:** Nodemailer with runtime‑editable SMTP config.
- **Rate Limiting:** `express-rate-limit`.

---

# 2. Backend / API (Express Server)

**Key Files**
- `server/index.js` – Main server bootstrap, route definitions, middleware, static file serving.
- `server/middleware/auth.js` – Authentication middleware that verifies Supabase JWTs and falls back to tenant lookup.
- `server/services/emailService.js` – SMTP wrapper for sending emails.
- `server/routes/assetRoutes.js` – Asset CRUD routes (currently disabled, see Future Enhancements).

**Data Flow**
1. **Incoming HTTP Request** → Express middleware stack.
2. **Rate Limiting** (`apiLimiter`, `uploadLimiter`, `emailLimiter`) protects endpoints.
3. **Authentication** via `verifyAuth` (checks JWT, then tenant credentials).
4. **Business Logic** – File uploads, SMTP actions, Supabase proxy for tenant files.
5. **Response** – JSON payloads for API calls or streamed files.

**Security / Permissions**
- **CORS** enabled globally (line 42).
- **Rate limits** prevent abuse (lines 48‑66).
- **Path sanitization** (`sanitizePath`, lines 71‑75) blocks directory traversal.
- **Auth middleware** enforces tenant status `Active` before granting access.

**Known Issues**
- Plain‑text password fallback in `verify_user_password` is a risk.
- Asset routes are commented out (lines 306‑308), so asset CRUD is currently performed client‑side via Supabase.

**Future Enhancements**
- Remove plain‑text password fallback; enforce bcrypt only.
- Re‑enable robust `assetRoutes` with validation.
- Add OpenAPI spec generation.

---

# 3. Authentication & Authorization

## 3.1 Supabase Native Auth
- Users obtain a JWT via Supabase Auth; token stored in `localStorage` and sent in the `Authorization` header.
- The `verifyAuth` middleware (`server/middleware/auth.js` lines 8‑58) validates the token and retrieves the user from the `users` table.

## 3.2 Custom Tenant Auth (`verify_user_password`)
**Definition (Supabase function):**
```sql
DECLARE
  stored_password TEXT;
BEGIN
  SELECT password INTO stored_password FROM users WHERE email = user_email;
  IF stored_password IS NULL THEN RETURN FALSE; END IF;
  IF stored_password LIKE '$2%' THEN
    RETURN stored_password = crypt(user_password, stored_password);
  ELSE
    RETURN stored_password = user_password; -- Plain‑text fallback
  END IF;
END;
```
*(Citation: Supabase function list – `proname: verify_user_password` and `prosrc` containing the above logic.)*
- The fallback reveals **plain‑text passwords** are stored for some tenant accounts.

## 3.3 Session Management Flow
1. Request includes `x-user-id`/`x-user-email` headers or query params.
2. `verifyAuth` queries `users`; on failure it checks `tenants` (lines 28‑35).
3. If tenant found and `status = 'Active'`, request proceeds; otherwise 401/403.

**Future Enhancements**
- Migrate all password verification to bcrypt‑only.
- Replace custom function with Supabase policies + JWT‑only flow.
- Implement refresh‑token strategy.

---

# 4. Tenants Module

**Key Files**
- `src/pages/tenant/MyAssetsPage.tsx` – Tenant dashboard UI.
- `src/pages/admin/TenantManagement.tsx` – Admin UI for managing tenants.
- `src/services/tenantExcelExportService.ts` – Excel export of tenant data.
- `src/utils/reports/generateFlexibleReport.ts` – Report generation logic.

**Database Schema** (excerpt from Supabase `information_schema.columns` query):
| Column | Type |
|--------|------|
| id | uuid |
| name | text |
| email | text |
| password | **text** *(plain‑text fallback)* |
| status | text |
| … | … |
*(Citation: Supabase `information_schema.columns` query result includes the `password` column of type `text`.)*

**Data Flow**
1. UI fetches tenant list via Supabase client (`supabase.from('tenants')`).
2. Admin actions (create/update) invoke stored procedures that may call `verify_user_password` for password checks.
3. Excel export pulls data directly from the `tenants` table (`tenantExcelExportService.ts`).

**Security**
- Access to tenant data guarded by `verifyAuth`; only users with role `Admin` can hit admin endpoints.
- Plain‑text passwords are stored for legacy accounts – a critical security gap.

**Future Enhancements**
- Migration script to hash existing passwords (see `encrypt_passwords.sql`).
- Enforce role‑based access control (RBAC) at the DB level via Supabase policies.
- Add audit logging for credential changes.

---

# 5. Assets Module

**Key Files**
- `src/pages/assets/AssetForm.tsx` – Asset create/edit UI.
- `src/pages/assets/AssetList.tsx` – Paginated asset list.
- `src/pages/assets/AssetMovement.tsx` – Asset movement UI.
- `src/pages/tenant/TenantAssetMovement.tsx` – Tenant‑specific movement.
- `server/index.js` – Upload endpoints (`/api/upload*`).

**File Storage**
- Uploads saved under `UPLOAD_PATH` (env var or `./uploads`).
- Category‑based subfolders created dynamically (lines 78‑108).
- Asset images stored in Supabase bucket `asset_images` and proxied via `/api/asset-images/...` (lines 402‑430).

**Security Controls**
- Path sanitization (`sanitizePath`, lines 71‑75).
- Rate limiting on upload routes (`uploadLimiter`, lines 56‑60).
- Auth middleware protects all `/api/*` routes.

**Known Issues**
- Asset Management routes are disabled (lines 306‑308); asset CRUD currently occurs via direct Supabase calls from the frontend.

**Future Enhancements**
- Re‑enable and secure `assetRoutes` with proper validation.
- Add virus‑scan step for uploaded files.
- Implement versioning for assets.

---

# 6. Billing Module

**Key Files**
- `src/pages/billing/InvoiceList.tsx` – Billing UI.
- `src/services/billingService.ts` – Interaction with Supabase `invoices` table.
- `src/utils/reports/generateFlexibleReport.ts` – Generates billing reports.

**Data Flow**
1. UI requests invoice data via Supabase RPC `get_invoices`.
2. Reports generated server‑side (Node) using `exceljs` and streamed to the client.

**Security**
- All billing endpoints protected by `verifyAuth`.
- Sensitive fields (e.g., payment tokens) never sent to the client; they remain in Supabase.

**Future Enhancements**
- Integrate Stripe for payment processing.
- Add webhook listeners for payment status updates.

---

# 7. Helpdesk / Ticketing

**Key Files**
- `src/pages/helpdesk/TicketList.tsx` – Ticket list UI.
- `src/pages/helpdesk/TicketDetail.tsx` – Ticket detail view.
- `src/services/ticketService.ts` – Supabase CRUD for `tickets`.

**File Attachments**
- Ticket files stored in Supabase bucket `Tenant_uploads` and proxied via `/api/ticket-files/:tenantFolder/:filename(*)` (lines 319‑356).

**Security**
- Auth middleware ensures only the owning tenant can download files.
- Access control checks on bucket download performed server‑side.

**Future Enhancements**
- Add priority escalation workflow.
- Implement SLA timers and automated reminders.

---

# 8. Maintenance Module

**Key Files**
- `src/pages/maintenance/WorkOrderList.tsx`
- `src/pages/maintenance/WorkOrderDetail.tsx`
- `src/services/maintenanceService.ts`

**Workflow**
1. Maintenance requests created by tenants via UI.
2. Admins assign technicians; status updates stored in `maintenance_requests`.
3. Email notifications sent using the SMTP service (`/api/admin/smtp/send`).

**Security**
- Only users with role `Technician` or `Admin` may update work order status.

**Future Enhancements**
- Real‑time status updates via Supabase Realtime.
- Mobile push notifications for technicians.

---

# 9. Email / SMTP Service

Implemented in `server/services/emailService.js` (imported in `server/index.js` line 436). Provides:
- Config endpoint `/api/admin/smtp/get` (lines 440‑447) – password masked.
- Save endpoint `/api/admin/smtp/save` (lines 454‑493) – validates fields.
- Send endpoint `/api/admin/smtp/send` (lines 502‑528) – rate‑limited.
- Batch send with 3‑second delay (lines 531‑571).
- Test email endpoint `/api/admin/smtp/test` (lines 580‑606).
- Log retrieval `/api/admin/smtp/logs` (lines 609‑615).
- Reset endpoint `/api/admin/smtp/reset` (lines 621‑639).

**Security**
- SMTP credentials stored in `config/smtpConfig.json` and never exposed in API responses.
- Password masked on retrieval; updates preserve existing password when sent as `******` (line 489).

**Future Enhancements**
- Move SMTP config to Supabase secret storage.
- Add OAuth2 email providers (e.g., Gmail API).

---

# 10. Common UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Layout` | `src/components/Layout.tsx` | Global page wrapper with navigation |
| `DataTable` | `src/components/DataTable.tsx` | Reusable table with pagination & filters |
| `Modal` | `src/components/Modal.tsx` | Confirmation & form dialogs |
| `Toast` | `src/components/Toast.tsx` | Success/error notifications |
| `FileUploader` | `src/components/FileUploader.tsx` | Handles drag‑and‑drop uploads |

---

# 11. Troubleshooting & Known Issues

- **Plain‑text passwords** – see `verify_user_password` fallback and `tenants.password` column. Immediate remediation required.
- **Asset routes disabled** – currently asset CRUD is performed client‑side; enable `assetRoutes` after adding validation.
- **CORS misconfiguration** may appear when deploying behind a reverse proxy; ensure the `origin` whitelist is set appropriately.
- **SMTP errors** – check `config/smtpConfig.json` permissions; server logs detailed errors (line 574).

---

# 12. Future Work (Per‑Module)

## 12.1 Auth
- Remove plain‑text fallback.
- Adopt password‑less magic‑link flow via Supabase.

## 12.2 Backend
- Introduce OpenAPI spec and Swagger UI.
- Containerize with Docker Compose (already present — enhance CI).

## 12.3 Tenants
- Migration script to hash existing passwords (`encrypt_passwords.sql`).
- Add multi‑factor authentication.
- Implement RBAC at the database level via Supabase policies.

## 12.4 Assets
- Implement virus scanning (ClamAV).
- Add asset versioning and soft‑delete.
- Enable bulk QR‑code generation improvements.

## 12.5 Billing
- Stripe integration.
- Automatic invoice PDF generation.

## 12.6 Helpdesk
- SLA tracking and escalation matrix.
- Chatbot assistant integration.

## 12.7 Maintenance
- Real‑time updates via Supabase Realtime.
- Mobile app push notifications.

---

*Document generated on 2026‑08‑05.
