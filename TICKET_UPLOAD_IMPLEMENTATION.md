# Ticket Upload - Supabase & Local Storage Implementation

## Summary
Implemented dual upload system for maintenance ticket attachments with toggle between Supabase Storage and Local Storage.

## Files Created

### 1. `/src/services/ticketUploadService.ts`
- **Purpose**: Central service for handling file uploads
- **Features**:
  - `getSettings()` - Retrieve upload preferences from localStorage
  - `saveSettings()` - Save upload preferences
  - `uploadToSupabase()` - Upload to Supabase Storage bucket
  - `uploadToLocal()` - Upload to local server via API
  - `uploadFile()` - Main upload function that routes based on settings
  - `uploadFiles()` - Batch upload multiple files

## Files Modified

### 1. `/src/pages/admin/SettingsPage.tsx`
- **Added**: New "File Uploads" tab in settings
- **Features**:
  - Toggle switch between Supabase and Local storage
  - Visual indicators showing active storage method
  - Real-time settings update with toast notification
  - Settings persist in localStorage

### 2. `/src/components/tenant/MaintenanceTicketForm.tsx`
- **Updated**: Photo upload logic to use `TicketUploadService`
- **Changes**:
  - Replaced manual upload loop with `uploadFiles()` method
  - Automatic routing based on user settings
  - Better error handling with user feedback

### 3. `/src/pages/tenant/MaintenanceRequestsPage.tsx`
- **Updated**: File upload UI in Files tab
- **Changes**:
  - Replaced drag-and-drop UI with simple file input fields
  - Separate inputs for photos and videos
  - Cleaner, more minimal interface

### 4. `/src/pages/admin/ManageTicketsPage.tsx`
- **Updated**: File upload UI in Files tab
- **Changes**:
  - Replaced drag-and-drop UI with simple file input fields
  - Separate inputs for photos and videos
  - Cleaner, more minimal interface

## Configuration

### Supabase Storage
- **Bucket Name**: `ticket_upload`
- **Bucket Status**: Already created (as confirmed)
- **File Path Structure**: `{folderName}/{timestamp}_{filename}`
- **Folder Naming**: 
  - Tenant tickets: `{company_name_sanitized}`
  - Helpdesk tickets: `helpdesk`

### Local Storage
- **API Endpoint**: `/api/upload?category=tenant-ticketing/{folderName}`
- **Maintains existing structure**

### Settings Storage
- **Location**: Browser localStorage
- **Key**: `ticket_upload_settings`
- **Default**: Supabase enabled (as requested)

## How It Works

1. **User uploads file** in MaintenanceTicketForm
2. **Service checks settings** from localStorage
3. **Routes to appropriate storage**:
   - If Supabase enabled → Upload to `ticket_upload` bucket
   - If Local enabled → Upload via `/api/upload` endpoint
4. **Returns public URL** for database storage
5. **Settings can be changed** in Admin Settings → File Uploads tab

## Usage

### For Users
1. Go to **Settings** → **File Uploads** tab
2. Toggle between Supabase Storage and Local Storage
3. All future uploads will use selected method

### For Developers
```typescript
import { TicketUploadService } from '@/services/ticketUploadService';

// Upload single file
const url = await TicketUploadService.uploadFile(file, 'company_name');

// Upload multiple files
const urls = await TicketUploadService.uploadFiles(files, 'company_name');

// Get current settings
const settings = TicketUploadService.getSettings();

// Change settings
TicketUploadService.saveSettings({ useSupabase: true });
```

## Benefits

1. **Flexibility**: Easy switch between storage methods
2. **No Code Changes**: Toggle without redeployment
3. **Backward Compatible**: Existing local uploads continue working
4. **Scalable**: Supabase provides cloud storage benefits
5. **User Control**: Admins can change settings anytime

## Testing Checklist

- [ ] Toggle between Supabase and Local in Settings
- [ ] Upload photos with Supabase enabled
- [ ] Upload photos with Local enabled
- [ ] Verify files appear in correct storage
- [ ] Check URLs are saved correctly in database
- [ ] Test with tenant and helpdesk tickets
- [ ] Verify settings persist after page reload
- [ ] Test error handling for failed uploads

## Notes

- Settings are stored per browser (localStorage)
- Existing tickets with local files remain unchanged
- Migration of existing files can be implemented later
- Supabase bucket must have public access enabled for URLs to work
