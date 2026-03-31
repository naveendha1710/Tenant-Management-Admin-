-- Remove foreign key constraints that reference auth.users instead of public.users
-- These constraints are incorrect because the application uses public.users table

ALTER TABLE asset_movements
DROP CONSTRAINT IF EXISTS asset_movements_requested_by_fkey;

ALTER TABLE asset_movements
DROP CONSTRAINT IF EXISTS asset_movements_approved_by_fkey;

-- Add comments to clarify the columns reference public.users (not auth.users)
COMMENT ON COLUMN asset_movements.requested_by IS 'UUID of user who created the movement (references public.users table, not auth.users)';
COMMENT ON COLUMN asset_movements.approved_by IS 'UUID of user who approved the movement (references public.users table, not auth.users)';
