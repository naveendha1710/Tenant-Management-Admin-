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

    const {
      preferences,
      channels,
      priorities,
      escalationRules,
      approvalRules,
      dndRules,
      retentionSettings,
      roleOverrides,
    } = await req.json();

    if (preferences) {
      for (const pref of preferences) {
        await supabaseClient
          .from('admin_notification_preferences')
          .upsert({
            user_id: user.id,
            role: pref.role,
            in_app_enabled: pref.in_app_enabled,
            email_enabled: pref.email_enabled,
            sms_enabled: pref.sms_enabled,
            whatsapp_enabled: pref.whatsapp_enabled,
          });
      }
    }

    if (channels) {
      for (const channel of channels) {
        await supabaseClient
          .from('notification_channel_settings')
          .upsert({
            user_id: user.id,
            channel: channel.channel,
            enabled: channel.enabled,
            config: channel.config || {},
          });
      }
    }

    if (priorities) {
      for (const priority of priorities) {
        await supabaseClient
          .from('notification_settings')
          .upsert({
            user_id: user.id,
            event_name: priority.event_name,
            enabled: priority.enabled,
            channels: priority.channels,
            priority_override: priority.priority_override,
          });
      }
    }

    if (escalationRules) {
      const { data: userRoles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some((r: any) => r.role === 'admin' || r.role === 'manager');

      if (isAdmin) {
        for (const rule of escalationRules) {
          if (rule.id) {
            await supabaseClient
              .from('notification_escalation_rules')
              .update({
                sla_threshold_minutes: rule.sla_threshold_minutes,
                escalation_timer_minutes: rule.escalation_timer_minutes,
                escalate_to_role: rule.escalate_to_role,
                is_active: rule.is_active,
              })
              .eq('id', rule.id);
          } else {
            await supabaseClient
              .from('notification_escalation_rules')
              .insert({
                event_name: rule.event_name,
                sla_threshold_minutes: rule.sla_threshold_minutes,
                escalation_timer_minutes: rule.escalation_timer_minutes,
                escalate_to_role: rule.escalate_to_role,
                is_active: rule.is_active,
              });
          }
        }
      }
    }

    if (approvalRules) {
      const { data: userRoles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some((r: any) => r.role === 'admin' || r.role === 'manager');

      if (isAdmin) {
        await supabaseClient
          .from('notification_approval_rules')
          .update({
            auto_approve_limit: approvalRules.auto_approve_limit,
            high_value_threshold: approvalRules.high_value_threshold,
            require_manager_approval: approvalRules.require_manager_approval,
          })
          .eq('id', approvalRules.id);
      }
    }

    if (dndRules) {
      for (const rule of dndRules) {
        if (rule.id) {
          await supabaseClient
            .from('notification_dnd_rules')
            .update({
              start_time: rule.start_time,
              end_time: rule.end_time,
              allow_critical_overrides: rule.allow_critical_overrides,
              days_of_week: rule.days_of_week,
              is_active: rule.is_active,
            })
            .eq('id', rule.id)
            .eq('user_id', user.id);
        } else {
          await supabaseClient
            .from('notification_dnd_rules')
            .insert({
              user_id: user.id,
              start_time: rule.start_time,
              end_time: rule.end_time,
              allow_critical_overrides: rule.allow_critical_overrides,
              days_of_week: rule.days_of_week,
              is_active: rule.is_active,
            });
        }
      }
    }

    if (retentionSettings) {
      await supabaseClient
        .from('notification_retention_settings')
        .upsert({
          user_id: user.id,
          auto_delete_days: retentionSettings.auto_delete_days,
          auto_archive_days: retentionSettings.auto_archive_days,
        });
    }

    if (roleOverrides) {
      const { data: userRoles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = userRoles?.some((r: any) => r.role === 'admin' || r.role === 'manager');

      if (isAdmin) {
        for (const override of roleOverrides) {
          await supabaseClient
            .from('notification_role_overrides')
            .upsert({
              event_name: override.event_name,
              role: override.role,
              override_user_id: override.override_user_id,
              is_active: override.is_active,
            });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Settings updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
