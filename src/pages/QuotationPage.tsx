import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QuotationGenerator } from '@/components/crm/QuotationGenerator';
import { useSearchParams } from 'react-router-dom';

export default function QuotationPage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  
  // In a real app, you would fetch lead data based on leadId
  const mockLeadData = leadId ? {
    id: leadId,
    company_name: 'TechStart Solutions',
    contact_person: 'John Doe',
    email: 'john@techstart.com',
    phone: '+91 9876543210',
    space_type: 'office',
    space_requirement: '10 seats'
  } : null;

  const handleSaveQuotation = (quotationData: any) => {
    console.log('Saving quotation:', quotationData);
    // In a real app, save to database
    alert('Quotation saved successfully!');
  };

  return (
    <DashboardLayout title="Quotation Generator" subtitle="Create branded quotations for leads">
      <QuotationGenerator 
        leadData={mockLeadData}
        onSave={handleSaveQuotation}
      />
    </DashboardLayout>
  );
}