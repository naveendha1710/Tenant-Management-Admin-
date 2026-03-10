-- Force trigger to hash passwords by updating them
UPDATE public.users 
SET password = 'admin123'
WHERE password = 'admin123';

-- Verify passwords are now hashed (should see $2a$ or $2b$ prefix)
-- SELECT email, LEFT(password, 10) as pwd_preview, LENGTH(password) as pwd_len FROM public.users;
