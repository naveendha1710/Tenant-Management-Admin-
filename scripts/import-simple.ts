import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const TARGET_URL = 'https://indgchiacxhwicqtifvq.supabase.co';
const TARGET_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZGdjaGlhY3hod2ljcXRpZnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjAzNDMsImV4cCI6MjA3ODUzNjM0M30.yHoZd_Iy_kBz2Nxj9rHeDB-krE4WaOQhtdTosoy4nkQ';

const targetSupabase = createClient(TARGET_URL, TARGET_KEY);

async function importDatabase(filename: string) {
  console.log('🚀 Starting database import...\n');
  
  const filepath = path.join(process.cwd(), 'database-exports', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return;
  }

  const exportData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  console.log(`📅 Export date: ${exportData.exportDate}\n`);

  // Only import tables that exist
  const tablesToImport = ['company_groups'];

  for (const table of tablesToImport) {
    const tableData = exportData.tables[table];
    if (!tableData || !tableData.data || tableData.data.length === 0) {
      console.log(`⏭️  ${table}: No data`);
      continue;
    }

    try {
      console.log(`📦 Importing ${table} (${tableData.data.length} rows)...`);
      
      const { error } = await targetSupabase
        .from(table)
        .insert(tableData.data);
      
      if (error) {
        console.log(`⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Success`);
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`\nℹ️  For full import, you need to:`);
  console.log(`1. Run ALL migrations from src/supabase/migrations/ in SQL Editor`);
  console.log(`2. Then run this script again`);
}

const filename = process.argv[2] || `supabase-export-${new Date().toISOString().split('T')[0]}.json`;
importDatabase(filename).catch(console.error);
