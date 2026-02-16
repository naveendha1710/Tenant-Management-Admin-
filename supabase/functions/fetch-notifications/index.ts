import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const priority = url.searchParams.get('priority');
    const eventName = url.searchParams.get('eventName');

    const offset = (page - 1) * limit;

    let query = supabaseClient
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (eventName) {
      query = query.eq('event_name', eventName);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      throw error;
    }

    const { count: unreadCount } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
      .is('archived_at', null);

    return new Response(
      JSON.stringify({
        success: true,
        notifications,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
        unreadCount: unreadCount || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
