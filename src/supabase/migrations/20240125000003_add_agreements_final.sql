-- Add agreements column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS agreements JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tenants_agreements ON tenants USING GIN (agreements);

-- Migrate existing agreement data to agreements array
UPDATE tenants
SET agreements = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'agreementName', COALESCE(company, 'Main Agreement'),
    'status', CASE 
      WHEN status = 'Active' THEN 'Active'
      WHEN status = 'Vacated' THEN 'Terminated'
      ELSE 'Expired'
    END,
    'createdAt', COALESCE(created_at, NOW())::text,
    'spaceAssignments', COALESCE(spaceassignments, '[]'::jsonb),
    'rentAmount', COALESCE(rentamount, 0),
    'securityDeposit', COALESCE(securitydeposit, 0),
    'paymentCycle', COALESCE(paymentcycle, 'Monthly'),
    'leaseAgreementDate', COALESCE(leaseagreementdate::text, ''),
    'operationDate', COALESCE(operationdate::text, ''),
    'rentCommencementDate', COALESCE(rentcommencementdate::text, ''),
    'lockInPeriod', COALESCE(lockinperiod::text, ''),
    'leaseTenure', COALESCE(lease_tenure::text, ''),
    'leaseEndDate', COALESCE(leaseenddate::text, ''),
    'maintenanceCharges', COALESCE(maintenance_charges, '[]'::jsonb),
    'generalCharges', COALESCE(general_charges, '[]'::jsonb),
    'serviceCharge', COALESCE(service_charge, '{"serviceNames":[],"amount":0,"isIncludedInRent":false}'::jsonb),
    'documents', COALESCE(documents, '[]'::jsonb),
    'escalations', COALESCE(escalations, '[]'::jsonb)
  )
)
WHERE agreements = '[]'::jsonb OR agreements IS NULL;
