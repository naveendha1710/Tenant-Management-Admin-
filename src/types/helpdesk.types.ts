// Complete Data Models for Helpdesk System

export interface HelpdeskTicket {
  id: string;
  ticket_number: string;
  tenant_id: string;
  tenant?: {
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
  };
  
  title: string;
  description: string;
  category: string;
  sub_category?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | 'Urgent';
  
  building: string;
  floor: string;
  room: string;
  spot_description?: string;
  
  images?: string[];
  videos?: string[];
  
  status: TicketStatus;
  sla_deadline?: string;
  is_overdue: boolean;
  
  assigned_technician?: TechnicianInfo;
  rca?: RCAData;
  estimation?: EstimationData;
  work_logs?: WorkLog[];
  completion?: CompletionData;
  
  approval_status?: 'pending' | 'approved' | 'rejected';
  tenant_satisfaction?: 'satisfied' | 'not_satisfied' | 'pending';
  
  created_at: string;
  updated_at: string;
}

export type TicketStatus = 
  | 'open' | 'assigned' | 'rca_added' | 'estimation_pending' | 'pending_approval'
  | 'approved' | 'rejected' | 'in_progress' | 'on_hold' | 'delayed'
  | 'completed' | 'awaiting_satisfaction' | 'closed' | 'cancelled';

export interface TechnicianInfo {
  name: string;
  contact: string;
  email?: string;
  specialization?: string;
}

export interface RCAData {
  root_cause: string;
  findings: string;
  recommendations?: string;
  added_by: string;
  added_at: string;
}

export interface EstimationData {
  materials: MaterialItem[];
  material_cost: number;
  labor_hours: number;
  labor_cost: number;
  total_cost: number;
  notes: string;
  prepared_by: string;
  prepared_at: string;
}

export interface MaterialItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface WorkLog {
  id: string;
  timestamp: string;
  status: 'in_progress' | 'on_hold' | 'delayed';
  update: string;
  delay_reason?: string;
  images?: string[];
}

export interface CompletionData {
  completion_notes: string;
  completion_images: string[];
  completed_by: string;
  completed_at: string;
}

export interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  resolved: number;
  on_hold: number;
  cancelled: number;
  pending_estimations: number;
  pending_approvals: number;
  approved: number;
  critical_priority: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  overdue: number;
  assigned_awaiting: number;
  rejected: number;
  today_tickets: number;
  safety_risk: number;
}
