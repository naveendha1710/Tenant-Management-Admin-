-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO anon, authenticated;

-- Test the function manually (replace with actual email from your users table)
-- SELECT verify_user_password('admin@rathinam.tec', 'admin123');

-- Check if passwords are properly hashed (should start with $2a$ or $2b$ and be ~60 chars)
-- SELECT email, LEFT(password, 10) as pwd_start, LENGTH(password) as pwd_len FROM public.users LIMIT 5;
