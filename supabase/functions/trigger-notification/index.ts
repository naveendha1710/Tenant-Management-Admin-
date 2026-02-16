import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  eventName: string;
  payload: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { eventName, payload }: NotificationPayload = await req.json();

    const { data: event, error: eventError } = await supabaseClient
      .from('event_registry')
      .select('*')
      .eq('event_name', eventName)
      .eq('is_active', true)
      .single();

    if (eventError || !event) {
      throw new Error(`Event ${eventName} not found or inactive`);
    }

    const { data: template, error: templateError } = await supabaseClient
      .from('notification_templates')
      .select('*')
      .eq('event_name', eventName)
      .single();

    if (templateError || !template) {
      throw new Error(`Template for ${eventName} not found`);
    }

    const title = resolveTemplate(template.title_template, payload);
    const message = resolveTemplate(template.message_template, payload);

    const targetUsers = await getTargetUsers(supabaseClient, event.target_roles, payload);

    if (eventName === 'ESTIMATION_READY' && payload.cost) {
      const { data: approvalRules } = await supabaseClient
        .from('notification_approval_rules')
        .select('*')
        .single();

      if (approvalRules && payload.cost > approvalRules.high_value_threshold) {
        await triggerHighValueApproval(supabaseClient, payload, approvalRules);
      }
    }

    const notifications = [];
    for (const userId of targetUsers) {
      const { data: userSettings } = await supabaseClient
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('event_name', eventName)
        .single();

      if (userSettings && !userSettings.enabled) {
        continue;
      }

      const isDND = await checkDNDRules(supabaseClient, userId, event.default_priority);
      if (isDND) {
        continue;
      }

      const priority = userSettings?.priority_override || event.default_priority;

      notifications.push({
        user_id: userId,
        event_name: eventName,
        title,
        message,
        priority,
        metadata: payload,
        ticket_id: payload.ticket_id || null,
      });

      const channels = userSettings?.channels || event.default_channels;
      await sendViaChannels(supabaseClient, userId, channels, title, message, payload);
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        throw insertError;
      }
    }

    if (event.default_priority === 'critical' || event.default_priority === 'high') {
      await checkEscalation(supabaseClient, eventName, payload);
    }

    return new Response(
      JSON.stringify({ success: true, notificationCount: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

function resolveTemplate(template: string, payload: Record<string, any>): string {
  let resolved = template;
  for (const [key, value] of Object.entries(payload)) {
    resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return resolved;
}

async function getTargetUsers(supabase: any, targetRoles: string[], payload: Record<string, any>): Promise<string[]> {
  const userIds = new Set<string>();

  if (payload.tenant_id) userIds.add(payload.tenant_id);
  if (payload.helpdesk_id) userIds.add(payload.helpdesk_id);
  if (payload.admin_id) userIds.add(payload.admin_id);
  if (payload.manager_id) userIds.add(payload.manager_id);

  const { data: roleUsers } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', targetRoles);

  if (roleUsers) {
    roleUsers.forEach((ru: any) => userIds.add(ru.user_id));
  }

  const { data: overrides } = await supabase
    .from('notification_role_overrides')
    .select('override_user_id')
    .in('role', targetRoles)
    .eq('is_active', true);

  if (overrides) {
    overrides.forEach((o: any) => {
      if (o.override_user_id) userIds.add(o.override_user_id);
    });
  }

  return Array.from(userIds);
}

async function checkDNDRules(supabase: any, userId: string, priority: string): Promise<boolean> {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentDay = now.getDay() || 7;

  const { data: dndRules } = await supabase
    .from('notification_dnd_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!dndRules || dndRules.length === 0) {
    return false;
  }

  for (const rule of dndRules) {
    if (!rule.days_of_week.includes(currentDay)) {
      continue;
    }

    if (currentTime >= rule.start_time && currentTime <= rule.end_time) {
      if (priority === 'critical' && rule.allow_critical_overrides) {
        return false;
      }
      return true;
    }
  }

  return false;
}

async function sendViaChannels(supabase: any, userId: string, channels: string[], title: string, message: string, payload: Record<string, any>): Promise<void> {
  const { data: channelSettings } = await supabase
    .from('notification_channel_settings')
    .select('*')
    .eq('user_id', userId)
    .in('channel', channels);

  const enabledChannels = channelSettings?.filter((cs: any) => cs.enabled) || [];

  for (const channelSetting of enabledChannels) {
    if (channelSetting.channel === 'email') {
      await supabase.functions.invoke('send-email', {
        body: { userId, title, message, payload },
      });
    }
  }
}

async function checkEscalation(supabase: any, eventName: string, payload: Record<string, any>): Promise<void> {
  const { data: escalationRules } = await supabase
    .from('notification_escalation_rules')
    .select('*')
    .eq('event_name', eventName)
    .eq('is_active', true);

  if (!escalationRules || escalationRules.length === 0) {
    return;
  }

  console.log('Escalation rules found:', escalationRules);
}

async function triggerHighValueApproval(supabase: any, payload: Record<string, any>, approvalRules: any): Promise<void> {
  await supabase.functions.invoke('trigger-notification', {
    body: {
      eventName: 'HIGH_VALUE_ESTIMATION_APPROVAL',
      payload: {
        ...payload,
        threshold: approvalRules.high_value_threshold,
      },
    },
  });
}
