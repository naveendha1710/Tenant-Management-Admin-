import { supabase } from '@/lib/supabase';

export interface HelpdeskResource {
  id: string;
  resource_type: 'technician' | 'material';
  name: string;
  contact?: string;
  specialization?: string;
  category?: string;
  rate?: number;
  uom?: string;
  stock_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  created_at: string;
  updated_at: string;
}

export interface TicketEstimation {
  id: string;
  ticket_id: string;
  technician_id?: string;
  root_cause?: string;
  findings?: string;
  selected_materials: any[];
  material_cost: number;
  labor_hours: number;
  labor_cost: number;
  total_cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const HelpdeskService = {
  // Technicians
  async getTechnicians() {
    const { data, error } = await supabase
      .from('helpdesk_resources')
      .select('*')
      .eq('resource_type', 'technician')
      .order('name');
    if (error) throw error;
    return data as HelpdeskResource[];
  },

  async addTechnician(technician: { name: string; contact: string; specialization: string }) {
    const { data, error } = await supabase
      .from('helpdesk_resources')
      .insert({
        resource_type: 'technician',
        ...technician
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Materials
  async getMaterials() {
    const { data, error } = await supabase
      .from('inventory_resources')
      .select('*')
      .eq('resource_type', 'material')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data as HelpdeskResource[];
  },

  async addMaterial(material: { category: string; name: string; rate: number; uom: string; stock_quantity?: number; min_stock_level?: number; max_stock_level?: number }) {
    const { data, error } = await supabase
      .from('inventory_resources')
      .insert({
        resource_type: 'material',
        stock_quantity: material.stock_quantity || 0,
        min_stock_level: material.min_stock_level || 10,
        max_stock_level: material.max_stock_level || 100,
        ...material
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateMaterial(id: string, material: { category?: string; name?: string; rate?: number; uom?: string; stock_quantity?: number; min_stock_level?: number; max_stock_level?: number }) {
    const { data, error } = await supabase
      .from('inventory_resources')
      .update(material)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Estimations
  async createEstimation(estimation: {
    ticket_id: string;
    technician_id?: string;
    root_cause?: string;
    findings?: string;
    selected_materials: any[];
    material_cost: number;
    labor_hours: number;
    labor_cost: number;
    total_cost: number;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('ticket_estimations')
      .insert(estimation)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getEstimationByTicketId(ticketId: string) {
    const { data, error } = await supabase
      .from('ticket_estimations')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Completion Images
  async addCompletionImage(ticketId: string, imageUrl: string) {
    const { data, error } = await supabase
      .from('ticket_completion_images')
      .insert({ ticket_id: ticketId, image_url: imageUrl })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getCompletionImages(ticketId: string) {
    const { data, error } = await supabase
      .from('ticket_completion_images')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};
