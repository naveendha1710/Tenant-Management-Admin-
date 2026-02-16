import { supabase } from '@/lib/supabase';

export interface CompanyGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const companyGroupService = {
  // Get all company groups
  async getAllCompanyGroups(): Promise<CompanyGroup[]> {
    const { data, error } = await supabase
      .from('company_groups')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching company groups:', error);
      return [];
    }
    
    return data || [];
  },

  // Get company group by ID
  async getCompanyGroupById(id: string): Promise<CompanyGroup | null> {
    const { data, error } = await supabase
      .from('company_groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching company group:', error);
      return null;
    }
    
    return data;
  },

  // Add new company group
  async addCompanyGroup(group: Omit<CompanyGroup, 'id' | 'created_at' | 'updated_at'>): Promise<CompanyGroup | null> {
    const { data, error } = await supabase
      .from('company_groups')
      .insert([group])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding company group:', error);
      return null;
    }
    
    return data;
  },

  // Update company group
  async updateCompanyGroup(id: string, updates: Partial<Omit<CompanyGroup, 'id' | 'created_at'>>): Promise<CompanyGroup | null> {
    const { data, error } = await supabase
      .from('company_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating company group:', error);
      return null;
    }
    
    return data;
  },

  // Delete company group
  async deleteCompanyGroup(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('company_groups')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting company group:', error);
      return false;
    }
    
    return true;
  }
};