import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

const SOURCE_URL = process.env.VITE_SUPABASE_URL!;
const SOURCE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

console.log('Using URL:', SOURCE_URL);

const sourceSupabase = createClient(SOURCE_URL, SOURCE_KEY);

const TABLES = [
  'tenants',
  'buildings',
  'floors',
  'units',
  'users',
  'app_settings',
  'company_groups',
  'invoices',
  'payments',
  'maintenance_tickets',
  'deposits',
  'expenses',
  'audit_logs',
  'notifications',
  'leads',
  'applications'
];

async function exportDatabase() {
  console.log('🚀 Starting database export...\n');
  
  const exportData: any = {
    exportDate: new Date().toISOString(),
    tables: {}
  };

  for (const table of TABLES) {
    try {
      console.log(`📦 Exporting ${table}...`);
      
      const { data, error } = await sourceSupabase
        .from(table)
        .select('*');
      
      if (error) {
        console.log(`⚠️  ${table}: ${error.message}`);
        exportData.tables[table] = { error: error.message, data: [] };
      } else {
        console.log(`✅ ${table}: ${data?.length || 0} rows`);
        exportData.tables[table] = { data: data || [] };
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
      exportData.tables[table] = { error: err.message, data: [] };
    }
  }

  const exportDir = path.join(process.cwd(), 'database-exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filename = `supabase-export-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(exportDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
  
  console.log(`\n✅ Export complete!`);
  console.log(`📁 File saved: ${filepath}`);
  
  let totalRows = 0;
  Object.entries(exportData.tables).forEach(([table, info]: [string, any]) => {
    if (info.data) {
      totalRows += info.data.length;
    }
  });
  console.log(`📈 Total rows: ${totalRows}`);
}

exportDatabase().catch(console.error);
