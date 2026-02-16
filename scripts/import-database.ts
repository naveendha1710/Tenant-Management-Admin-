import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Target Supabase (your new testing database)
// REPLACE THESE WITH YOUR NEW SUPABASE CREDENTIALS:
const TARGET_URL = 'https://your-new-project.supabase.co';
const TARGET_KEY = 'your-new-anon-key-here';

const targetSupabase = createClient(TARGET_URL, TARGET_KEY);

async function importDatabase(filename: string) {
  console.log('🚀 Starting database import...\n');
  
  const filepath = path.join(process.cwd(), 'database-exports', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return;
  }

  const exportData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  console.log(`📅 Export date: ${exportData.exportDate}`);
  console.log(`📊 Tables to import: ${Object.keys(exportData.tables).length}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const [table, info] of Object.entries(exportData.tables) as [string, any][]) {
    if (!info.data || info.data.length === 0) {
      console.log(`⏭️  ${table}: No data to import`);
      continue;
    }

    try {
      console.log(`📦 Importing ${table} (${info.data.length} rows)...`);
      
      // Insert in batches of 100 to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < info.data.length; i += batchSize) {
        const batch = info.data.slice(i, i + batchSize);
        
        const { error } = await targetSupabase
          .from(table)
          .insert(batch);
        
        if (error) {
          console.log(`⚠️  ${table} batch ${i / batchSize + 1}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ ${table} batch ${i / batchSize + 1}: ${batch.length} rows`);
        }
      }
      
      successCount++;
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`✅ Success: ${successCount} tables`);
  console.log(`❌ Errors: ${errorCount} tables`);
}

// Get filename from command line argument
const filename = process.argv[2] || `supabase-export-${new Date().toISOString().split('T')[0]}.json`;
importDatabase(filename).catch(console.error);
