import { tenantDataService } from './src/data/tenantData';

async function test(){
  try {
    const tenant = await tenantDataService.addTenant({
      name: 'Test Tenant',
      company: 'Test Co',
      email: 'test@example.com',
      phone: '1234567890',
      status: 'Active',
      companyGroup: 'TestGroup',
      branchName: 'TestBranch',
      isMainBranch: false
    });
    console.log('Created tenant', tenant);
  } catch(e){
    console.error('Error', e);
  }
}

test();
