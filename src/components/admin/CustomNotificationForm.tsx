import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Send, Loader2 } from 'lucide-react';

export function CustomNotificationForm() {
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'user' | 'all_tenants' | 'role'>('user');
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    recipientId: '',
    role: '',
    title: '',
    message: '',
    priority: 'medium',
    ticketId: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchTickets();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true);

      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data } = await supabase
        .from('maintenance_tickets')
        .select('id, ticket_number, title')
        .order('created_at', { ascending: false })
        .limit(50);

      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast({
        title: 'Error',
        description: 'Please fill in title and message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let recipientIds: string[] = [];

      if (recipientType === 'user') {
        if (!formData.recipientId) {
          throw new Error('Please select a user');
        }
        recipientIds = [formData.recipientId];
      } else if (recipientType === 'all_tenants') {
        const { data: tenants } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'Tenant')
          .eq('is_active', true);
        recipientIds = tenants?.map(t => t.id) || [];
      } else if (recipientType === 'role') {
        if (!formData.role) {
          throw new Error('Please select a role');
        }
        const { data: roleUsers } = await supabase
          .from('users')
          .select('id')
          .eq('role', formData.role)
          .eq('is_active', true);
        recipientIds = roleUsers?.map(u => u.id) || [];
      }

      if (recipientIds.length === 0) {
        throw new Error('No recipients found');
      }

      const ticketId = formData.ticketId && formData.ticketId !== 'none' ? formData.ticketId : null;

      const notifications = recipientIds.map(userId => ({
        user_id: userId,
        event_name: 'TICKET_CREATED',
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        metadata: {
          ticket_id: ticketId,
          sent_by: 'admin',
          custom: true,
        },
        ticket_id: ticketId,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Notification sent to ${recipientIds.length} recipient(s)`,
      });

      setFormData({
        recipientId: '',
        role: '',
        title: '',
        message: '',
        priority: 'medium',
        ticketId: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Custom Notification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Send To</Label>
            <RadioGroup value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="cursor-pointer">Specific User</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_tenants" id="all_tenants" />
                <Label htmlFor="all_tenants" className="cursor-pointer">All Tenants</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="role" id="role" />
                <Label htmlFor="role" className="cursor-pointer">By Role</Label>
              </div>
            </RadioGroup>
          </div>

          {recipientType === 'user' && (
            <div className="space-y-2">
              <Label>Select User *</Label>
              <Select value={formData.recipientId} onValueChange={(v) => setFormData({ ...formData, recipientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role}) - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recipientType === 'role' && (
            <div className="space-y-2">
              <Label>Select Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="helpdesk">Helpdesk</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="Notification title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea
              placeholder="Notification message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Link to Ticket (Optional)</Label>
            <Select value={formData.ticketId} onValueChange={(v) => setFormData({ ...formData, ticketId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select ticket..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {tickets.map((ticket) => (
                  <SelectItem key={ticket.id} value={ticket.id}>
                    {ticket.ticket_number || ticket.id} - {ticket.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('demo_user') || '{}');
                toast({
                  title: 'Your User ID',
                  description: user.id || 'Not found',
                });
              }}
            >
              Show My User ID
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
