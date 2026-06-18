import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useOperationalData() {
  const [history, setHistory] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const hQuery = supabase
        .from('asset_history')
        .select(`
          id, asset_id, field_name, old_value, new_value, changed_by, changed_at,
          assets ( asset_name, building, floor_id, handover_to, asset_status )
        `)
        .order('changed_at', { ascending: false })
        .limit(1000);

      const tQuery = supabase
        .from('maintenance_tickets')
        .select(`
          id, title, status, priority, category, created_at,
          ticket_assets ( asset_id )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      const [hRes, tRes] = await Promise.all([hQuery, tQuery]);
      
      setHistory(hRes.data || []);
      setTickets(tRes.data || []);
      
    } catch (err) {
      console.error('Error fetching operational data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { history, tickets, loading, refetch: fetchData };
}
