import { supabase } from '@/lib/supabaseClient';

export interface EmailTemplate {
  subject: string;
  body: string;
}

// Email templates
export const EMAIL_TEMPLATES = {
  TENANT_APPROVED: (data: { contactPerson: string; companyName: string; email: string; password: string }): EmailTemplate => ({
    subject: 'Your Tenant Account is Approved - Rathinam Nexus Suite',
    body: `Dear ${data.contactPerson},

Congratulations! Your tenant application for ${data.companyName} has been approved.

Your login credentials:
Email: ${data.email}
Password: ${data.password}

Please login to your tenant portal at [PORTAL_URL] and change your password on first login for security.

Welcome to Rathinam Nexus Suite!

Best regards,
Rathinam Nexus Suite Team`
  }),

  TENANT_REJECTED: (data: { contactPerson: string; companyName: string; reason?: string }): EmailTemplate => ({
    subject: 'Tenant Application Update - Rathinam Nexus Suite',
    body: `Dear ${data.contactPerson},

Thank you for your interest in ${data.companyName} joining Rathinam Nexus Suite.

Unfortunately, we are unable to approve your application at this time.

${data.reason ? `Reason: ${data.reason}` : ''}

Please feel free to contact us if you have any questions or would like to discuss alternative options.

Best regards,
Rathinam Nexus Suite Team`
  })
};

// Mock email service - replace with actual email provider
export const sendEmail = async (to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string }> => {
  try {
    // In production, integrate with:
    // - Supabase Edge Functions with Resend/SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    console.log('📧 Email sent:', { to, subject, body });
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log email to database for audit trail
    await supabase
      .from('email_logs')
      .insert({
        recipient: to,
        subject,
        body,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()
      .catch(err => console.log('Email logging failed:', err));
    
    return { success: true, messageId: `mock-${Date.now()}` };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false };
  }
};

// Send tenant approval email
export const sendTenantApprovalEmail = async (
  email: string,
  contactPerson: string,
  companyName: string,
  password: string
): Promise<{ success: boolean }> => {
  const template = EMAIL_TEMPLATES.TENANT_APPROVED({
    contactPerson,
    companyName,
    email,
    password
  });
  
  const result = await sendEmail(email, template.subject, template.body);
  return { success: result.success };
};

// Send tenant rejection email
export const sendTenantRejectionEmail = async (
  email: string,
  contactPerson: string,
  companyName: string,
  reason?: string
): Promise<{ success: boolean }> => {
  const template = EMAIL_TEMPLATES.TENANT_REJECTED({
    contactPerson,
    companyName,
    reason
  });
  
  const result = await sendEmail(email, template.subject, template.body);
  return { success: result.success };
};