@echo off
echo Deploying Edge Functions to Supabase...

supabase functions deploy trigger-notification
supabase functions deploy fetch-notifications
supabase functions deploy mark-read
supabase functions deploy archive-notification
supabase functions deploy send-email
supabase functions deploy update-notification-settings
supabase functions deploy get-notification-settings

echo.
echo All Edge Functions deployed successfully!
pause
