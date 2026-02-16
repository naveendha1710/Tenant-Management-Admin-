import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Ticket, AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationItemProps {
  notification: {
    id: string;
    event_name: string;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    metadata: any;
    ticket_id?: string;
    read_at: string | null;
    created_at: string;
  };
  onMarkAsRead: (id: string) => void;
  compact?: boolean;
}

const priorityColors = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const eventIcons = {
  TICKET_CREATED: Ticket,
  TICKET_ASSIGNED: Wrench,
  ESTIMATION_READY: AlertCircle,
  ESTIMATION_APPROVED: CheckCircle,
  WORK_STARTED: Clock,
  WORK_COMPLETED: CheckCircle,
  TICKET_RESOLVED: CheckCircle,
  CUSTOM_NOTIFICATION: AlertCircle,
};

export function NotificationItem({ notification, onMarkAsRead, compact = false }: NotificationItemProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const Icon = eventIcons[notification.event_name as keyof typeof eventIcons] || AlertCircle;

  const handleClick = () => {
    if (!notification.read_at) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDoubleClick = () => {
    if (!notification.ticket_id) return;

    // Determine redirect path based on user role
    let path = '';
    if (role === 'Tenant') {
      path = '/tenant/maintenance-requests';
    } else if (role === 'Maintenance Manager' || role === 'Helpdesk') {
      path = '/maintenance/tickets';
    } else if (role === 'Super Admin' || role === 'Admin') {
      path = '/admin/manage-tickets';
    }

    if (path) {
      navigate(path);
    }
  };

  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer
        ${notification.read_at ? 'bg-white' : 'bg-blue-50/50 border-blue-200'}
        hover:bg-gray-50
        ${compact ? 'text-sm' : ''}
      `}
      onClick={handleClick}
    >
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
        ${priorityColors[notification.priority]}
      `}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`font-medium ${compact ? 'text-sm' : ''}`}>
            {notification.title}
          </h4>
          {!notification.read_at && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
          )}
        </div>
        
        <p className={`text-muted-foreground mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {notification.message}
        </p>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
          
          {notification.metadata?.ticket_number && (
            <Badge variant="outline" className="text-xs">
              {notification.metadata.ticket_number}
            </Badge>
          )}

          {!compact && !notification.read_at && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
