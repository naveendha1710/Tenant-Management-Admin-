import { supabase } from '@/lib/supabase';

export type NotificationEvent =
  | 'TICKET_CREATED'
  | 'TICKET_ACTIONED'
  | 'ESTIMATION_READY'
  | 'ESTIMATION_APPROVED'
  | 'WORK_STARTED'
  | 'WORK_IN_PROGRESS'
  | 'WORK_COMPLETED'
  | 'TICKET_RESOLVED'
  | 'TICKET_REOPENED'
  | 'ESTIMATION_REJECTED_BY_MANAGER'
  | 'SLA_BREACH_WARNING'
  | 'NEW_TICKET_ASSIGNED'
  | 'TENANT_REJECTED_ESTIMATION'
  | 'TENANT_APPROVED_ESTIMATION'
  | 'TICKET_REOPENED_BY_TENANT'
  | 'HIGH_PRIORITY_ALERT'
  | 'SLA_BREACH_ALERT'
  | 'ESTIMATION_PENDING_APPROVAL'
  | 'HIGH_VALUE_ESTIMATION_APPROVAL'
  | 'TICKET_STATS'
  | 'RECURRING_ISSUE'
  | 'BUDGET_ALERT';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export interface NotificationPayload {
  ticket_id?: string;
  ticket_number?: string;
  tenant_id?: string;
  helpdesk_id?: string;
  admin_id?: string;
  manager_id?: string;
  cost?: number;
  materials?: string[];
  technician?: string;
  actioned_by?: string;
  open_count?: number;
  resolved_count?: number;
  amount?: number;
  [key: string]: any;
}

export interface Notification {
  id: string;
  user_id: string;
  event_name: NotificationEvent;
  title: string;
  message: string;
  priority: NotificationPriority;
  metadata: NotificationPayload;
  ticket_id?: string;
  read_at?: string;
  archived_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface NotificationSettings {
  preferences: Array<{
    role: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
    sms_enabled: boolean;
    whatsapp_enabled: boolean;
  }>;
  channels: Array<{
    channel: NotificationChannel;
    enabled: boolean;
    config: Record<string, any>;
  }>;
  priorities: Array<{
    event_name: NotificationEvent;
    enabled: boolean;
    channels: NotificationChannel[];
    priority_override?: NotificationPriority;
  }>;
  escalationRules: Array<{
    id?: string;
    event_name: NotificationEvent;
    sla_threshold_minutes: number;
    escalation_timer_minutes: number;
    escalate_to_role: string;
    is_active: boolean;
  }>;
  approvalRules?: {
    id?: string;
    auto_approve_limit: number;
    high_value_threshold: number;
    require_manager_approval: boolean;
  };
  dndRules: Array<{
    id?: string;
    start_time: string;
    end_time: string;
    allow_critical_overrides: boolean;
    days_of_week: number[];
    is_active: boolean;
  }>;
  retentionSettings: {
    auto_delete_days: number;
    auto_archive_days: number;
  };
  roleOverrides: Array<{
    event_name: NotificationEvent;
    role: string;
    override_user_id: string;
    is_active: boolean;
  }>;
  eventRegistry: Array<{
    event_name: NotificationEvent;
    display_name: string;
    description: string;
    default_priority: NotificationPriority;
    target_roles: string[];
    default_channels: NotificationChannel[];
    is_active: boolean;
  }>;
}

class NotificationService {
  async trigger(eventName: NotificationEvent, payload: NotificationPayload): Promise<void> {
    try {
      // Get target roles for this event
      const roleMap: Record<string, string[]> = {
        'TICKET_CREATED': ['helpdesk', 'admin', 'manage tickets'],
        'NEW_TICKET_ASSIGNED': ['helpdesk', 'manage tickets'],
        'ESTIMATION_READY': ['tenant'],
        'ESTIMATION_PENDING_APPROVAL': ['admin', 'manage tickets'],
        'TENANT_APPROVED_ESTIMATION': ['helpdesk', 'admin', 'manage tickets'],
        'TENANT_REJECTED_ESTIMATION': ['helpdesk', 'admin', 'manage tickets'],
        'WORK_STARTED': ['tenant'],
        'WORK_COMPLETED': ['tenant'],
        'TICKET_RESOLVED': ['helpdesk', 'admin', 'manage tickets'],
        'TICKET_REOPENED_BY_TENANT': ['helpdesk', 'admin', 'manage tickets'],
        'HIGH_PRIORITY_ALERT': ['helpdesk', 'admin', 'manage tickets'],
      };

      const targetRoles = roleMap[eventName] || [];
      if (targetRoles.length === 0) return;

      let users = [];

      // For tenant-specific events, only notify the specific tenant
      if (targetRoles.includes('tenant') && payload.tenant_id) {
        const { data: tenantUsers } = await supabase
          .from('users')
          .select('id')
          .eq('id', payload.tenant_id)
          .eq('is_active', true);
        
        users = tenantUsers || [];
      }

      // For helpdesk/admin events, notify all users with those roles
      const nonTenantRoles = targetRoles.filter(r => r !== 'tenant');
      if (nonTenantRoles.length > 0) {
        const roleNames = nonTenantRoles.map(r => {
          if (r === 'manage tickets') return 'Manage Tickets';
          if (r === 'helpdesk') return 'Helpdesk';
          if (r === 'admin') return 'Admin';
          return r.charAt(0).toUpperCase() + r.slice(1);
        });
        const { data: staffUsers } = await supabase
          .from('users')
          .select('id')
          .or(roleNames.map(role => `role.eq.${role}`).join(','))
          .eq('is_active', true);
        
        users = [...users, ...(staffUsers || [])];
      }

      if (users.length === 0) return;

      // Create notifications
      const notifications = users.map(user => ({
        user_id: user.id,
        event_name: eventName,
        title: this.getEventTitle(eventName, payload),
        message: this.getEventMessage(eventName, payload),
        priority: 'medium' as NotificationPriority,
        metadata: payload,
        ticket_id: payload.ticket_id || null,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) {
        console.error('Failed to insert notifications:', error);
        throw error;
      }
    } catch (error) {
      console.error('Notification trigger error:', error);
      throw error;
    }
  }

  private getEventTitle(eventName: NotificationEvent, payload: NotificationPayload): string {
    const titles: Record<string, string> = {
      'TICKET_CREATED': 'New Ticket Created',
      'NEW_TICKET_ASSIGNED': 'New Ticket Assigned',
      'ESTIMATION_READY': 'Estimation Ready',
      'ESTIMATION_PENDING_APPROVAL': 'Estimation Pending Approval',
      'TENANT_APPROVED_ESTIMATION': 'Tenant Approved Estimation',
      'TENANT_REJECTED_ESTIMATION': 'Tenant Rejected Estimation',
      'WORK_STARTED': 'Work Started',
      'WORK_COMPLETED': 'Work Completed',
      'TICKET_RESOLVED': 'Ticket Resolved',
      'TICKET_REOPENED_BY_TENANT': 'Ticket Reopened',
      'HIGH_PRIORITY_ALERT': 'High Priority Alert',
    };
    return titles[eventName] || 'Notification';
  }

  private getEventMessage(eventName: NotificationEvent, payload: NotificationPayload): string {
    const ticketNum = payload.ticket_number || payload.ticket_id;
    const messages: Record<string, string> = {
      'TICKET_CREATED': `Ticket ${ticketNum} has been created`,
      'NEW_TICKET_ASSIGNED': `Ticket ${ticketNum} has been assigned to you`,
      'ESTIMATION_READY': `Estimation for ticket ${ticketNum} is ready. Cost: ₹${payload.cost}`,
      'ESTIMATION_PENDING_APPROVAL': `Ticket ${ticketNum} estimation pending your approval. Cost: ₹${payload.cost}`,
      'TENANT_APPROVED_ESTIMATION': `Tenant approved estimation for ticket ${ticketNum}`,
      'TENANT_REJECTED_ESTIMATION': `Tenant rejected estimation for ticket ${ticketNum}`,
      'WORK_STARTED': `Work has started on ticket ${ticketNum}`,
      'WORK_COMPLETED': `Work completed for ticket ${ticketNum}`,
      'TICKET_RESOLVED': `Ticket ${ticketNum} has been resolved`,
      'TICKET_REOPENED_BY_TENANT': `Ticket ${ticketNum} has been reopened by tenant`,
      'HIGH_PRIORITY_ALERT': `High priority ticket ${ticketNum} requires attention`,
    };
    return messages[eventName] || 'You have a new notification';
  }

  async sendInApp(
    userId: string,
    title: string,
    message: string,
    metadata: NotificationPayload = {},
    priority: NotificationPriority = 'medium'
  ): Promise<void> {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        event_name: 'TICKET_ACTIONED',
        title,
        message,
        priority,
        metadata,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to send in-app notification:', error);
      throw error;
    }
  }

  async sendEmail(
    userId: string,
    title: string,
    message: string,
    payload: NotificationPayload = {}
  ): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { userId, title, message, payload },
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async fetchNotifications(params: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    priority?: NotificationPriority;
    eventName?: NotificationEvent;
  } = {}): Promise<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    unreadCount: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.unreadOnly) queryParams.append('unreadOnly', 'true');
      if (params.priority) queryParams.append('priority', params.priority);
      if (params.eventName) queryParams.append('eventName', params.eventName);

      const { data, error } = await supabase.functions.invoke(
        `fetch-notifications?${queryParams.toString()}`
      );

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('mark-read', {
        body: { notificationIds },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('mark-read', {
        body: { markAll: true },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async archiveNotifications(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('archive-notification', {
        body: { notificationIds },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to archive notifications:', error);
      throw error;
    }
  }

  async getSettings(): Promise<NotificationSettings> {
    try {
      const { data, error } = await supabase.functions.invoke('get-notification-settings');

      if (error) {
        throw error;
      }

      return data.settings;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('update-notification-settings', {
        body: settings,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  resolveTemplate(template: string, payload: NotificationPayload): string {
    let resolved = template;
    for (const [key, value] of Object.entries(payload)) {
      resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return resolved;
  }

  async sendCustomNotification(params: {
    recipientIds: string[];
    title: string;
    message: string;
    priority?: NotificationPriority;
    ticketId?: string;
  }): Promise<void> {
    try {
      const notifications = params.recipientIds.map(userId => ({
        user_id: userId,
        event_name: 'CUSTOM_NOTIFICATION',
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        metadata: {
          ticket_id: params.ticketId || null,
          sent_by: 'admin',
        },
        ticket_id: params.ticketId || null,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to send custom notification:', error);
      throw error;
    }
  }
}

export default new NotificationService();
