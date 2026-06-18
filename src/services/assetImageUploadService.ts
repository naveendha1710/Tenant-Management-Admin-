import { supabase } from '../lib/supabaseClient';

interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
}

class AssetImageUploadService {
  private static instance: AssetImageUploadService;

  private constructor() {}

  static getInstance(): AssetImageUploadService {
    if (!AssetImageUploadService.instance) {
      AssetImageUploadService.instance = new AssetImageUploadService();
    }
    return AssetImageUploadService.instance;
  }

  async uploadFiles(
    files: File[],
    category: string,
    subCategory: string,
    assetId: string,
    useSupabase: boolean = true
  ): Promise<UploadResult[]> {
    if (useSupabase) {
      return this.uploadToSupabase(files, category, subCategory, assetId);
    } else {
      return this.uploadToLocal(files, category, subCategory, assetId);
    }
  }

  private async uploadToSupabase(
    files: File[],
    category: string,
    subCategory: string,
    assetId: string
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    // Sanitize path components
    const sanitizePathComponent = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedCategory = sanitizePathComponent(category);
    const sanitizedSubCategory = sanitizePathComponent(subCategory);
    const sanitizedAssetId = sanitizePathComponent(assetId);

    for (const file of files) {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${timestamp}_${sanitizedName}`;
      const path = `${sanitizedCategory}/${sanitizedSubCategory}/${sanitizedAssetId}/${filename}`;

      const { error } = await supabase.storage
        .from('asset_images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      results.push({
        url: `/supabase/${path}`,
        path: `/supabase/${path}`,
        name: file.name,
        size: file.size
      });
    }

    return results;
  }

  private async uploadToLocal(
    files: File[],
    category: string,
    subCategory: string,
    assetId: string
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('subCategory', subCategory);
      formData.append('assetId', assetId);

      const response = await fetch('/api/upload-asset-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      results.push({
        url: data.url,
        path: data.url,
        name: file.name,
        size: file.size
      });
    }

    return results;
  }

  async deleteFile(path: string, useSupabase: boolean = true): Promise<void> {
    if (useSupabase) {
      const supabasePath = path.replace('/supabase/', '');
      
      const { data, error } = await supabase.storage
        .from('asset_images')
        .remove([supabasePath]);
      
      if (error) {
        throw error;
      }
    } else {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      });

      if (!response.ok) throw new Error('Delete failed');
    }
  }

  resolveUrl(path: string, userId: string, userEmail: string): string {
    if (path.startsWith('/supabase/')) {
      const supabasePath = path.replace('/supabase/', '');
      const parts = supabasePath.split('/');
      if (parts.length >= 4) {
        const [category, subCategory, assetId, ...filenameParts] = parts;
        const filename = filenameParts.join('/');
        return `/api/asset-images/${category}/${subCategory}/${assetId}/${filename}?uid=${userId}&email=${encodeURIComponent(userEmail)}`;
      }
    }
    return path;
  }

  getProxyUrl(category: string, subCategory: string, assetId: string, filename: string, userId: string, userEmail: string): string {
    return `/api/asset-images/${category}/${subCategory}/${assetId}/${filename}?uid=${userId}&email=${encodeURIComponent(userEmail)}`;
  }

  async getSettings(): Promise<{ useSupabase: boolean }> {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'asset_image_upload_storage')
        .single();

      return { useSupabase: data?.value?.useSupabase ?? true };
    } catch {
      return { useSupabase: true };
    }
  }

  async saveSettings(settings: { useSupabase: boolean }): Promise<void> {
    await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'asset_image_upload_storage',
          value: { useSupabase: settings.useSupabase }
        },
        { onConflict: 'key' }
      );
  }
}

export default AssetImageUploadService.getInstance();
