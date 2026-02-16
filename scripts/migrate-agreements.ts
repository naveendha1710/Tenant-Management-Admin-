import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAgreements() {
  console.log('🚀 Starting agreement migration...\n');

  try {
    // Fetch all tenants
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*');

    if (error) {
      console.error('❌ Error fetching tenants:', error);
      return;
    }

    if (!tenants || tenants.length === 0) {
      console.log('ℹ️  No tenants found to migrate');
      return;
    }

    console.log(`📊 Found ${tenants.length} tenants to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const tenant of tenants) {
      // Check if already migrated
      if (tenant.agreements && Array.isArray(tenant.agreements) && tenant.agreements.length > 0) {
        console.log(`⏭️  Skipping ${tenant.company} - already migrated`);
        skippedCount++;
        continue;
      }

      // Create agreement object from existing data
      const agreement = {
        id: `agreement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: tenant.status || 'Active',
        createdAt: tenant.leaseagreementdate || tenant.created_at || new Date().toISOString(),
        spaceAssignments: tenant.spaceassignments || [],
        rentAmount: tenant.rentamount || 0,
        escalations: tenant.escalations || [],
        documents: tenant.documents || [],
        maintenanceCharges: tenant.maintenance_charges || [],
        generalCharges: tenant.general_charges || [],
        serviceCharge: tenant.service_charge || { serviceNames: [], amount: 0, isIncludedInRent: false },
        leaseAgreementDate: tenant.leaseagreementdate || null,
        operationDate: tenant.operationdate || null,
        rentCommencementDate: tenant.rentcommencementdate || null,
        lockInPeriod: tenant.lockinperiod || null,
        leaseEndDate: tenant.leaseenddate || null,
        securityDeposit: tenant.securitydeposit || 0,
        paymentCycle: tenant.paymentcycle || 'Monthly'
      };

      // Update tenant with agreements array
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ agreements: [agreement] })
        .eq('id', tenant.id);

      if (updateError) {
        console.error(`❌ Error migrating ${tenant.company}:`, updateError);
      } else {
        console.log(`✅ Migrated ${tenant.company} - Created agreement ${agreement.id}`);
        migratedCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📊 Total: ${tenants.length}`);
    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateAgreements();
