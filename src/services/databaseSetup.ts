import { supabase } from '@/lib/supabaseClient';

export const createCRMTables = async () => {
  try {
    // Create leads table
    const { error: leadsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_name TEXT NOT NULL,
          contact_person TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          source TEXT NOT NULL,
          space_type TEXT NOT NULL,
          space_requirement TEXT,
          budget_range TEXT,
          status TEXT DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'negotiation', 'quotation', 'tenant')),
          lead_score INTEGER DEFAULT 50,
          created_at TIMESTAMPTZ DEFAULT now(),
          follow_up_date DATE,
          notes TEXT,
          industry TEXT,
          company_size TEXT,
          urgency TEXT,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    if (leadsError) {
      console.error('Error creating leads table:', leadsError);
    }

    // Create communications table
    const { error: commError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.communications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'sms')),
          date DATE NOT NULL,
          time TEXT,
          subject TEXT NOT NULL,
          notes TEXT,
          attachments TEXT[],
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    if (commError) {
      console.error('Error creating communications table:', commError);
    }

    // Create tenant_applications table
    const { error: appError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.tenant_applications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id TEXT NOT NULL,
          company_name TEXT NOT NULL,
          contact_person TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          space_type TEXT NOT NULL,
          space_requirement TEXT,
          monthly_rent DECIMAL(12,2) DEFAULT 0,
          security_deposit DECIMAL(12,2) DEFAULT 0,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          applied_date TIMESTAMPTZ DEFAULT now(),
          approved_date TIMESTAMPTZ,
          approved_by TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    if (appError) {
      console.error('Error creating tenant_applications table:', appError);
    }

    // Insert sample data
    await insertSampleData();

    return { success: true };
  } catch (error) {
    console.error('Error setting up database:', error);
    return { success: false, error };
  }
};

const insertSampleData = async () => {
  try {
    // Insert sample leads
    const { error: leadsError } = await supabase.from('leads').upsert([
      {
        id: '1',
        company_name: 'TechStart Solutions',
        contact_person: 'John Doe',
        email: 'john@techstart.com',
        phone: '+91 9876543210',
        source: 'website',
        space_type: 'office',
        space_requirement: '10 seats',
        budget_range: '₹15,000 - ₹25,000',
        status: 'inquiry',
        lead_score: 85,
        industry: 'Technology',
        company_size: '10-50',
        urgency: 'high',
        notes: 'Interested in private office space'
      },
      {
        id: '2',
        company_name: 'Creative Agency',
        contact_person: 'Sarah Smith',
        email: 'sarah@creative.com',
        phone: '+91 9876543211',
        source: 'referral',
        space_type: 'coworking',
        space_requirement: '5 seats',
        budget_range: '₹8,000 - ₹12,000',
        status: 'negotiation',
        lead_score: 72,
        industry: 'Marketing',
        company_size: '5-10',
        urgency: 'medium',
        notes: 'Looking for flexible seating'
      },
      {
        id: '3',
        company_name: 'Innovate Labs',
        contact_person: 'Mike Johnson',
        email: 'mike@innovate.com',
        phone: '+91 9876543212',
        source: 'call',
        space_type: 'incubator',
        space_requirement: '3 seats',
        budget_range: '₹5,000 - ₹8,000',
        status: 'quotation',
        lead_score: 90,
        industry: 'Technology',
        company_size: '1-5',
        urgency: 'high',
        notes: 'Startup looking for incubator space'
      }
    ], { onConflict: 'id' });

    // Insert sample communications
    const { error: commError } = await supabase.from('communications').upsert([
      {
        id: '1',
        lead_id: '1',
        type: 'email',
        date: '2024-01-15',
        subject: 'Initial inquiry about office space',
        notes: 'Sent welcome email with brochure'
      },
      {
        id: '2',
        lead_id: '1',
        type: 'call',
        date: '2024-01-16',
        subject: 'Follow-up call',
        notes: 'Discussed requirements and pricing'
      }
    ], { onConflict: 'id' });

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};