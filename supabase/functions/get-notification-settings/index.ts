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

    const { data: preferences } = await supabaseClient
      .from('admin_notification_preferences')
      .select('*')
      .eq('user_id', user.id);

    const { data: channels } = await supabaseClient
      .from('notification_channel_settings')
      .select('*')
      .eq('user_id', user.id);

    const { data: priorities } = await supabaseClient
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id);

    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((r: any) => r.role === 'admin' || r.role === 'manager');

    let escalationRules = null;
    let approvalRules = null;
    let roleOverrides = null;

    if (isAdmin) {
      const { data: escalation } = await supabaseClient
        .from('notification_escalation_rules')
        .select('*');
      escalationRules = escalation;

      const { data: approval } = await supabaseClient
        .from('notification_approval_rules')
        .select('*')
        .single();
      approvalRules = approval;

      const { data: overrides } = await supabaseClient
        .from('notification_role_overrides')
        .select('*');
      roleOverrides = overrides;
    }

    const { data: dndRules } = await supabaseClient
      .from('notification_dnd_rules')
      .select('*')
      .eq('user_id', user.id);

    const { data: retentionSettings } = await supabaseClient
      .from('notification_retention_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: eventRegistry } = await supabaseClient
      .from('event_registry')
      .select('*')
      .eq('is_active', true);

    return new Response(
      JSON.stringify({
        success: true,
        settings: {
          preferences: preferences || [],
          channels: channels || [],
          priorities: priorities || [],
          escalationRules: escalationRules || [],
          approvalRules: approvalRules || null,
          dndRules: dndRules || [],
          retentionSettings: retentionSettings || { auto_delete_days: 90, auto_archive_days: 30 },
          roleOverrides: roleOverrides || [],
          eventRegistry: eventRegistry || [],
        },
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
