import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE_URL = 'https://jsejlncgwnddevsdbmot.supabase.co';
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZWpsbmNnd25kZGV2c2RibW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MjI4OTUsImV4cCI6MjA3Nzk5ODg5NX0.44p3FcuGM2WKTdqo68cXzjy4nQgPIuehJR2-2EPC0h8';

const supabase = createClient(SOURCE_URL, SOURCE_KEY);

async function exportSchema() {
  console.log('🔍 Exporting schema from source database...\n');

  // Get all columns from information_schema
  const { data: columns, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        table_name,
        column_name,
        data_type,
        column_default,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `
  });

  if (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Using direct query instead...');
    
    // Fallback: query each table structure
    const tables = ['tenants', 'buildings', 'floors', 'users', 'app_settings', 
                   'company_groups', 'maintenance_tickets', 'audit_logs', 'notifications'];
    
    let sql = '-- Generated Schema Export\n\n';
    
    for (const table of tables) {
      const { data: sample } = await supabase.from(table).select('*').limit(1);
      if (sample && sample.length > 0) {
        const cols = Object.keys(sample[0]);
        sql += `-- Table: ${table}\n`;
        sql += `-- Columns: ${cols.join(', ')}\n\n`;
      }
    }
    
    const filepath = path.join(process.cwd(), 'database-exports', 'schema-info.sql');
    fs.writeFileSync(filepath, sql);
    console.log(`📁 Schema info saved: ${filepath}`);
    return;
  }

  console.log('✅ Schema exported successfully!');
  const filepath = path.join(process.cwd(), 'database-exports', 'schema-columns.json');
  fs.writeFileSync(filepath, JSON.stringify(columns, null, 2));
  console.log(`📁 File saved: ${filepath}`);
}

exportSchema().catch(console.error);
