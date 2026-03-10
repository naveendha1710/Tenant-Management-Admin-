-- Disable trigger
ALTER TABLE public.users DISABLE TRIGGER hash_password_trigger;

-- Reset passwords to plain text
UPDATE public.users SET password = 'admin123';

-- Enable trigger
ALTER TABLE public.users ENABLE TRIGGER hash_password_trigger;

-- Update passwords (trigger will hash them)
UPDATE public.users SET password = 'admin123';
