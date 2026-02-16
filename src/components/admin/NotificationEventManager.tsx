import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, TrendingUp, Users, CheckCircle, Eye, Send } from 'lucide-react';

const NOTIFICATION_EVENTS = [
  { name: 'TICKET_CREATED', label: 'Ticket Created', description: 'When a new ticket is created', roles: ['helpdesk', 'admin'] },
  { name: 'TICKET_ASSIGNED', label: 'Ticket Assigned', description: 'When a ticket is assigned to someone', roles: ['helpdesk'] },
  { name: 'ESTIMATION_READY', label: 'Estimation Ready', description: 'When estimation is ready for tenant', roles: ['tenant'] },
  { name: 'ESTIMATION_APPROVED', label: 'Estimation Approved', description: 'When tenant approves estimation', roles: ['helpdesk', 'admin'] },
  { name: 'ESTIMATION_REJECTED', label: 'Estimation Rejected', description: 'When tenant rejects estimation', roles: ['helpdesk', 'admin'] },
  { name: 'WORK_STARTED', label: 'Work Started', description: 'When work begins on a ticket', roles: ['tenant'] },
  { name: 'WORK_COMPLETED', label: 'Work Completed', description: 'When work is completed', roles: ['tenant'] },
  { name: 'TICKET_RESOLVED', label: 'Ticket Resolved', description: 'When ticket is resolved', roles: ['helpdesk', 'admin'] },
  { name: 'TICKET_REOPENED', label: 'Ticket Reopened', description: 'When ticket is reopened', roles: ['helpdesk', 'admin'] },
];

export function NotificationEventManager() {
  const [events, setEvents] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({ total: 0, unread: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [usersByRole, setUsersByRole] = useState<Record<string, any[]>>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadEvents();
    loadStats();
    loadUsers();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await supabase
        .from('event_registry')
        .select('event_name, is_active');

      const eventMap: Record<string, boolean> = {};
      NOTIFICATION_EVENTS.forEach(e => {
        const dbEvent = data?.find(d => d.event_name === e.name);
        eventMap[e.name] = dbEvent?.is_active ?? true;
      });

      setEvents(eventMap);
    } catch (error) {
      console.error('Error loading events:', error);
      const defaultEvents: Record<string, boolean> = {};
      NOTIFICATION_EVENTS.forEach(e => defaultEvents[e.name] = true);
      setEvents(defaultEvents);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true);

      if (users) {
        const grouped: Record<string, any[]> = {};
        users.forEach(u => {
          const role = u.role?.toLowerCase() || 'other';
          if (!grouped[role]) grouped[role] = [];
          grouped[role].push(u);
        });
        setUsersByRole(grouped);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        total: total || 0,
        unread: unread || 0,
        today: todayCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleEvent = async (eventName: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('event_registry')
        .update({ is_active: enabled })
        .eq('event_name', eventName);

      if (error) throw error;

      setEvents(prev => ({ ...prev, [eventName]: enabled }));

      toast({
        title: 'Success',
        description: `${eventName} ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    }
  };

  const sendTestForEvent = async (eventName: string, eventLabel: string, roles: string[]) => {
    try {
      if (!user?.id) throw new Error('Not authenticated');

      const recipientIds: string[] = [];
      for (const role of roles) {
        const users = usersByRole[role] || [];
        recipientIds.push(...users.map(u => u.id));
      }

      if (recipientIds.length === 0) {
        throw new Error('No recipients found for this event');
      }

      const notifications = recipientIds.map(userId => ({
        user_id: userId,
        event_name: eventName,
        title: `Test: ${eventLabel}`,
        message: `This is a test notification for ${eventLabel} event`,
        priority: 'medium',
        metadata: { test: true },
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: `Test notification sent to ${recipientIds.length} recipient(s)`,
      });

      loadStats();
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  const sendTestNotification = async () => {
    try {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          event_name: 'TICKET_CREATED',
          title: 'Test Notification',
          message: 'This is a test notification sent to yourself',
          priority: 'medium',
          metadata: { test: true },
        });
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test notification sent to yourself!',
      });

      loadStats();
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Management</CardTitle>
            <Button onClick={sendTestNotification} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {NOTIFICATION_EVENTS.map((event) => (
                <div
                  key={event.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{event.label}</h4>
                      <Badge variant={events[event.name] ? 'default' : 'secondary'}>
                        {events[event.name] ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Popover open={openPopover === event.name} onOpenChange={(open) => setOpenPopover(open ? event.name : null)}>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <Eye className="h-4 w-4" />
                            <span>View Recipients</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Recipients</h4>
                            <div className="flex flex-wrap gap-1">
                              {event.roles.map((role) => {
                                const users = usersByRole[role] || [];
                                return users.map(u => (
                                  <Badge key={u.id} variant="outline" className="text-xs">
                                    {u.name}
                                  </Badge>
                                ));
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs ml-auto"
                        onClick={() => sendTestForEvent(event.name, event.label, event.roles)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  </div>
                  <Switch
                    checked={events[event.name] ?? true}
                    onCheckedChange={(checked) => toggleEvent(event.name, checked)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
