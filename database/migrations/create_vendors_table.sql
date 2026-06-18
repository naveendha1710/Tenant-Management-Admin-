-- ============================================================
-- Vendors Table Migration
-- Rathinam Nexus Suite
-- Created: 2026-04-24
-- ============================================================

-- ── 1. CREATE TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name      VARCHAR(255)  NOT NULL,
  email            VARCHAR(255),
  phone            VARCHAR(20),
  address          TEXT,

  -- JSONB: [{ name, phone, email }]
  contact_persons  JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- Tax
  gst_enabled      BOOLEAN       NOT NULL DEFAULT false,
  gst_number       VARCHAR(20),
  pan_number       VARCHAR(20),

  -- JSONB: [{ id, bank_name, account_number, branch, ifsc_code, is_primary, is_active }]
  bank_accounts    JSONB         NOT NULL DEFAULT '[]'::jsonb,

  status           VARCHAR(20)   NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by       VARCHAR(255),
  updated_by       VARCHAR(255)
);

-- ── 2. COMMENTS ───────────────────────────────────────────────
COMMENT ON TABLE  public.vendors IS 'Vendor / supplier master records';
COMMENT ON COLUMN public.vendors.contact_persons IS 'JSONB array of contact persons: [{name, phone, email}]';
COMMENT ON COLUMN public.vendors.bank_accounts   IS 'JSONB array of bank accounts: [{id, bank_name, account_number, branch, ifsc_code, is_primary, is_active}]';
COMMENT ON COLUMN public.vendors.gst_number      IS 'GST registration number (required when gst_enabled = true)';

-- ── 3. INDEXES ────────────────────────────────────────────────
-- Primary lookup by name
CREATE INDEX IF NOT EXISTS idx_vendors_name
  ON public.vendors (vendor_name);

-- Status filter (most common list filter)
CREATE INDEX IF NOT EXISTS idx_vendors_status
  ON public.vendors (status);

-- GST filter
CREATE INDEX IF NOT EXISTS idx_vendors_gst_enabled
  ON public.vendors (gst_enabled)
  WHERE gst_enabled = true;

-- Full-text search helper on GST number
CREATE INDEX IF NOT EXISTS idx_vendors_gst_number
  ON public.vendors (gst_number)
  WHERE gst_number IS NOT NULL;

-- GIN index for searching inside contact_persons JSONB
CREATE INDEX IF NOT EXISTS idx_vendors_contact_persons
  ON public.vendors USING GIN (contact_persons);

-- GIN index for searching inside bank_accounts JSONB
CREATE INDEX IF NOT EXISTS idx_vendors_bank_accounts
  ON public.vendors USING GIN (bank_accounts);

-- Audit columns
CREATE INDEX IF NOT EXISTS idx_vendors_created_at
  ON public.vendors (created_at DESC);

-- ── 4. UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_vendors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendors_timestamp ON public.vendors;
CREATE TRIGGER trigger_update_vendors_timestamp
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_vendors_timestamp();

-- ── 5. UPDATED_BY TRIGGER ─────────────────────────────────────
-- NOTE: created_by / updated_by are passed explicitly from the application
-- (the frontend sets these fields before calling supabase.insert/update).
-- No DB-level trigger needed — the app writes these values directly.

-- ── 7. ROW LEVEL SECURITY ─────────────────────────────────────
-- NOTE: This app uses localStorage-based authentication (NOT Supabase Auth).
-- auth.uid() is always NULL in this setup, so role-based RLS policies
-- using auth.uid() will never pass. All other tables in this project
-- (preventive_maintenance, physical_audits, etc.) use DISABLED RLS
-- and rely on the anon key + application-layer access control.
-- We follow the same pattern here.

-- Drop any previously created policies (safe to re-run)
DROP POLICY IF EXISTS vendors_super_admin_all    ON public.vendors;
DROP POLICY IF EXISTS vendors_maintenance_read   ON public.vendors;
DROP POLICY IF EXISTS vendors_accountant_read    ON public.vendors;

-- Disable RLS — access control is handled in the application layer
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;

-- ── 8. GRANT PERMISSIONS ──────────────────────────────────────
-- Allow the anon key (used by the frontend) full DML access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;

-- ── 9. HELPER FUNCTION: validate primary bank constraint ──────
-- Ensures only one bank account has is_primary = true.
-- Call this as a CHECK via application logic or as a DB function.
CREATE OR REPLACE FUNCTION vendors_validate_primary_bank()
RETURNS TRIGGER AS $$
DECLARE
  primary_count INT;
BEGIN
  SELECT COUNT(*)
  INTO   primary_count
  FROM   jsonb_array_elements(NEW.bank_accounts) AS b
  WHERE  (b->>'is_primary')::boolean = true;

  IF primary_count > 1 THEN
    RAISE EXCEPTION 'Only one bank account can be marked as primary (found %).',
      primary_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vendors_validate_primary_bank ON public.vendors;
CREATE TRIGGER trigger_vendors_validate_primary_bank
  BEFORE INSERT OR UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION vendors_validate_primary_bank();

-- ── 10. HELPER FUNCTION: validate GST number present when enabled ─
CREATE OR REPLACE FUNCTION vendors_validate_gst()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gst_enabled = true AND (NEW.gst_number IS NULL OR TRIM(NEW.gst_number) = '') THEN
    RAISE EXCEPTION 'gst_number is required when gst_enabled is true.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vendors_validate_gst ON public.vendors;
CREATE TRIGGER trigger_vendors_validate_gst
  BEFORE INSERT OR UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION vendors_validate_gst();

-- ── 11. SEED DATA (optional / remove before prod) ────────────
/*
INSERT INTO public.vendors
  (vendor_name, email, phone, address, gst_enabled, gst_number, pan_number, status,
   contact_persons, bank_accounts)
VALUES
  (
    'ABC Office Supplies',
    'accounts@abcsupplies.in',
    '+91 98765 43210',
    '12, Anna Salai, Chennai - 600002, Tamil Nadu',
    true,
    '33AABCA1234A1Z5',
    'AABCA1234A',
    'active',
    '[{"name":"Ramesh Kumar","phone":"+91 98765 43210","email":"ramesh@abcsupplies.in"}]',
    '[{"id":"a1b2c3d4-0000-0000-0000-000000000001","bank_name":"State Bank of India","account_number":"12345678901","branch":"Anna Salai","ifsc_code":"SBIN0001234","is_primary":true,"is_active":true}]'
  ),
  (
    'TechParts India Pvt. Ltd.',
    'info@techparts.in',
    '+91 44 2345 6789',
    '7th Floor, Tidel Park, Rajiv Gandhi Salai, Chennai - 600113',
    false,
    NULL,
    'AABCT9876B',
    'active',
    '[{"name":"Priya Nair","phone":"+91 98400 12345","email":"priya@techparts.in"},{"name":"Suresh Menon","phone":"+91 98400 67890","email":"suresh@techparts.in"}]',
    '[{"id":"a1b2c3d4-0000-0000-0000-000000000002","bank_name":"HDFC Bank","account_number":"50100123456789","branch":"Sholinganallur","ifsc_code":"HDFC0001234","is_primary":true,"is_active":true},{"id":"a1b2c3d4-0000-0000-0000-000000000003","bank_name":"ICICI Bank","account_number":"012345678901","branch":"OMR","ifsc_code":"ICIC0001234","is_primary":false,"is_active":false}]'
  );
*/
