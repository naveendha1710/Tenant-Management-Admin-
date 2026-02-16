import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  priority: 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read';
  link_to?: string;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Mock data for demo mode
  const mockNotifications: Notification[] = [
    {
      id: '1',
      user_id: user?.id || '6',
      message: 'New invoice (INV-2025-10) for ₹29,500 has been generated for your account.',
      priority: 'medium',
      status: 'unread',
      link_to: '/tenant/invoices',
      created_at: '2024-01-25T10:00:00Z'
    },
    {
      id: '2',
      user_id: '6',
      message: 'Your payment for invoice INV-2025-09 is due in 3 days.',
      priority: 'high',
      status: 'unread',
      link_to: '/tenant/invoices',
      created_at: '2024-01-24T09:00:00Z'
    },
    {
      id: '3',
      user_id: '6',
      message: 'Your ticket #TKT-123 (AC Not Cooling) has been updated to In Progress.',
      priority: 'medium',
      status: 'unread',
      link_to: '/tenant/maintenance',
      created_at: '2024-01-22T11:15:00Z'
    },
    {
      id: '4',
      user_id: '6',
      message: 'Your Business Insurance document is expiring in 15 days. Please upload a new one.',
      priority: 'urgent',
      status: 'unread',
      link_to: '/tenant/documents',
      created_at: '2024-01-20T08:00:00Z'
    }
  ];

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id.toString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (error) {
        console.warn('Database update failed, updating local state:', error);
      }
    } catch (error) {
      console.warn('Database connection failed, updating local state:', error);
    }

    // Update local state regardless of database success
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('user_id', user.id)
        .eq('status', 'unread');

      if (error) {
        console.warn('Database update failed, updating local state:', error);
      }
    } catch (error) {
      console.warn('Database connection failed, updating local state:', error);
    }

    // Update local state regardless of database success
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription
    if (user?.id) {
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}