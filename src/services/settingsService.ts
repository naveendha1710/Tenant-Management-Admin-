import { supabase } from '@/lib/supabaseClient';
import type { SystemSettings } from '@/data/settingsData';

export const settingsService = {
  getSettings: async (): Promise<SystemSettings | null> => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*');
    
    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
    
    const settings: any = {};
    data?.forEach(item => {
      settings[item.key] = item.value;
    });
    
    return {
      organization: settings.organization || {},
      paymentCycle: settings.paymentCycle || {},
      emailSMS: settings.emailSMS || {},
      invoiceTemplate: settings.invoiceTemplate || {},
      taxGST: settings.taxGST || {},
      backup: settings.backup || {}
    };
  },
  
  updateSettings: async (key: string, value: any): Promise<boolean> => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) {
      console.error('Error updating settings:', error);
      return false;
    }
    return true;
  }
};
