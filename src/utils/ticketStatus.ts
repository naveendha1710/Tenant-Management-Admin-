// Ticket Status Management Utility

export type TicketStatus = 
  | 'pending'
  | 'assigned'
  | 'rca_added'
  | 'pending_approval'
  | 'rejected'
  | 'pending_tenant_approval'
  | 'tenant_rejected'
  | 'approved'
  | 'work_started'
  | 'in_progress'
  | 'work_completed'
  | 'resolved'
  | 'reopened'
  | 'closed';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  visibleTo: ('tenant' | 'admin' | 'helpdesk')[];
}

export const TICKET_STATUSES: Record<TicketStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    description: 'Ticket submitted, awaiting assignment',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  assigned: {
    label: 'Assigned',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    description: 'Ticket assigned to technician',
    visibleTo: ['admin', 'helpdesk']
  },
  rca_added: {
    label: 'RCA Added',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    description: 'Root cause analysis completed',
    visibleTo: ['admin', 'helpdesk']
  },
  pending_approval: {
    label: 'Pending Manager Approval',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    description: 'Awaiting manager approval',
    visibleTo: ['admin', 'helpdesk']
  },
  rejected: {
    label: 'Rejected by Manager',
    color: 'bg-red-50 text-red-700 border-red-200',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    description: 'Manager rejected, needs re-submission',
    visibleTo: ['admin', 'helpdesk']
  },
  pending_tenant_approval: {
    label: 'Pending Tenant Approval',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    description: 'Awaiting tenant approval',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  tenant_rejected: {
    label: 'Rejected by Tenant',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    description: 'Tenant rejected, needs re-estimation',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    description: 'Approved by tenant, ready to start',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  work_started: {
    label: 'Work Started',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Work has been started',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    description: 'Work in progress',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  work_completed: {
    label: 'Work Completed',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    description: 'Work completed, awaiting tenant feedback',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-50 text-green-700 border-green-200',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    description: 'Issue resolved successfully',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  reopened: {
    label: 'Reopened',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    description: 'Ticket reopened by tenant',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    description: 'Ticket closed',
    visibleTo: ['tenant', 'admin', 'helpdesk']
  }
};

export const getStatusConfig = (status: string): StatusConfig => {
  return TICKET_STATUSES[status as TicketStatus] || TICKET_STATUSES.pending;
};

export const getStatusLabel = (status: string): string => {
  return getStatusConfig(status).label;
};

export const getStatusColor = (status: string): string => {
  return getStatusConfig(status).color;
};

export const getStatusDescription = (status: string): string => {
  return getStatusConfig(status).description;
};

export const getVisibleStatuses = (role: 'tenant' | 'admin' | 'helpdesk'): TicketStatus[] => {
  return Object.entries(TICKET_STATUSES)
    .filter(([_, config]) => config.visibleTo.includes(role))
    .map(([status]) => status as TicketStatus);
};
