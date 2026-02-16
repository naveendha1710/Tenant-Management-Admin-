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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, title, message, payload } = await req.json();

    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !user) {
      throw new Error('User not found');
    }

    const email = user.user.email;
    if (!email) {
      throw new Error('User email not found');
    }

    // Get backend server URL from environment or use default
    const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:3000';

    const emailBody = {
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          ${payload.ticket_number ? `<p style="color: #999;">Ticket: ${payload.ticket_number}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated notification from Rathinam TechPark.</p>
        </div>
      `,
      text: message
    };

    // Call backend SMTP service
    const response = await fetch(`${backendUrl}/api/admin/smtp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SMTP service error: ${error}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
