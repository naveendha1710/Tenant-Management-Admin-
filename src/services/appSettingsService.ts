import { supabase } from '@/lib/supabase';

export const AppSettingsService = {
  async getSettingsByKey(key: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) throw error;
    const value = data?.value;
    if (!value) return [];
    return typeof value === 'string' ? JSON.parse(value) : value;
  },

  async updateSettings(key: string, values: string[]): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value: JSON.stringify(values), updated_at: new Date().toISOString() });
    
    if (error) throw error;
  }
};
