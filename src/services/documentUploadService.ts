import { supabase } from '@/lib/supabaseClient';

export interface DocumentUploadSettings {
  useSupabase: boolean;
}

const SETTINGS_KEY = 'document_upload_settings';
const DEFAULT_SETTINGS: DocumentUploadSettings = {
  useSupabase: true // Default to Supabase
};

// Get upload settings from database (with localStorage fallback)
export const DocumentUploadService = {
  async getSettings(): Promise<DocumentUploadSettings> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'document_upload_storage')
        .maybeSingle();

      if (!error && data?.value) {
        return { useSupabase: data.value.useSupabase ?? true };
      }

      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: DocumentUploadSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'document_upload_storage',
          value: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Failed to save to database:', error);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  },

  async uploadToSupabase(file: File, tenantName: string): Promise<string> {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    // Path: tenant_name/document_upload/filename
    const filePath = `${tenantName}/document_upload/${fileName}`;

    const { data, error } = await supabase.storage
      .from('Tenant_uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Return path only (not full URL) for security
    return `/supabase/${filePath}`;
  },

  // Upload file to local storage (existing API)
  async uploadToLocal(file: File, tenantName: string): Promise<string> {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const category = `tenant-documents/${tenantName}`;
    const response = await fetch(`/api/upload?category=${category}`, {
      method: 'POST',
      body: uploadFormData
    });

    if (!response.ok) {
      throw new Error('Failed to upload to local storage');
    }

    const result = await response.json();
    return result.file.url;
  },

  async uploadFile(file: File, tenantName: string): Promise<string> {
    const settings = await this.getSettings();

    if (settings.useSupabase) {
      return await this.uploadToSupabase(file, tenantName);
    } else {
      return await this.uploadToLocal(file, tenantName);
    }
  },

  async uploadFiles(files: File[], tenantName: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, tenantName));
    return await Promise.all(uploadPromises);
  },

  async resolveUrl(path: string): Promise<string> {
    if (!path) return '';
    
    // Already a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // Convert Supabase public URLs to proxy URLs
      if (path.includes('supabase.co/storage/v1/object/public/Tenant_uploads/')) {
        const pathPart = path.split('Tenant_uploads/')[1];
        return this.getProxyUrl(pathPart);
      }
      return path;
    }
    
    // Supabase path format: /supabase/{tenant_name}/document_upload/{filename}
    if (path.startsWith('/supabase/')) {
      const pathPart = path.replace('/supabase/', '');
      return this.getProxyUrl(pathPart);
    }
    
    // Local storage path
    if (path.startsWith('/uploads/')) {
      return path;
    }
    
    return path;
  },

  getProxyUrl(filePath: string): string {
    // Extract tenant folder and remaining path
    // filePath format: tenant_name/document_upload/filename
    const parts = filePath.split('/');
    if (parts.length >= 2) {
      const tenantFolder = parts[0];
      const remainingPath = parts.slice(1).join('/');
      
      // Get user credentials from localStorage
      const userStr = localStorage.getItem('demo_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userId = user.id || user.appUser?.id;
        const userEmail = user.email || user.appUser?.email;
        
        // Return proxy URL with auth headers embedded as query params
        return `/api/document-files/${tenantFolder}/${remainingPath}?uid=${userId}&email=${encodeURIComponent(userEmail)}`;
      }
    }
    return filePath;
  },

  async resolveUrls(paths: string[]): Promise<string[]> {
    return await Promise.all(paths.map(path => this.resolveUrl(path)));
  }
};
