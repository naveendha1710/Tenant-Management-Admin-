import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateAssetExcelReport } from '@/utils/assetExport';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      toast({ title: 'Generating Report', description: 'Fetching all assets...' });

      const pageSize = 1000;
      let lastAssetId: string | null = null;
      const allAssets: any[] = [];

      while (true) {
        let query = supabase
          .from('assets')
          .select('*')
          .order('asset_id', { ascending: true })
          .limit(pageSize);

        if (lastAssetId) {
          query = query.gt('asset_id', lastAssetId);
        }

        const { data: pageData, error } = await query;

        if (error) throw error;
        if (!pageData || pageData.length === 0) break;

        allAssets.push(...pageData);

        const newLastAssetId = pageData[pageData.length - 1]?.asset_id;
        if (!newLastAssetId || newLastAssetId === lastAssetId || pageData.length < pageSize) {
          break;
        }

        lastAssetId = newLastAssetId;
      }
      
      if (!allAssets || allAssets.length === 0) {
        toast({ title: 'No assets', description: 'No assets found in the system', variant: 'destructive' });
        return;
      }

      // Fetch related data for mapping
      const { data: buildings } = await supabase.from('buildings').select('id, name');
      const { data: floors } = await supabase.from('floors').select('id, floor_name, floor_number');
      const { data: rooms } = await supabase.from('rooms').select('id, room_number');
      const { data: users } = await supabase.from('users').select('id, name');
      const { data: tenants } = await supabase.from('tenants').select('id, name, company');

      const buildingMap = buildings?.reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {}) || {};
      const floorMap = floors?.reduce((acc, f) => ({ ...acc, [f.id]: f.floor_name || `Floor ${f.floor_number}` }), {}) || {};
      const roomMap = rooms?.reduce((acc, r) => ({ ...acc, [r.id]: r.room_number }), {}) || {};
      const userMap = users?.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {}) || {};
      const tenantMap = tenants?.reduce((acc, t) => ({ ...acc, [t.id]: t.company || t.name }), {}) || {};

      const exportData = allAssets.map(a => ({
        id: a.id,
        asset_id: a.asset_id,
        manual_asset_id: a.manual_asset_id,
        asset_name: a.asset_name,
        asset_category: a.asset_category,
        asset_sub_category: a.asset_sub_category,
        asset_type: a.asset_type,
        make_model: a.make_model,
        serial_number: a.serial_number,
        asset_status: a.asset_status,
        status: a.status,
        condition: a.condition,
        sez_status: a.sez_status,
        sez_classification: a.sez_classification,
        customs_category: a.customs_category,
        customs_location: a.customs_location,
        sez_zone: a.sez_zone,
        unit: a.unit,
        vendor_name: a.vendor_name,
        manufacturer: a.manufacturer,
        asset_description: a.asset_description,
        asset_spec: a.asset_spec,
        purchase_date: a.purchase_date,
        warranty_date: a.warranty_date,
        pm_date: a.pm_date,
        last_pm_date: a.last_pm_date,
        asset_value: a.asset_value,
        depreciation_date: a.depreciation_date,
        last_depreciation_date: a.last_depreciation_date,
        depreciation_percentage: a.depreciation_percentage,
        decommission_date: a.decommission_date,
        contract: a.contract,
        po_number: a.po_number,
        invoice_number: a.invoice_number,
        invoice_date: a.invoice_date,
        boe_number: a.boe_number,
        boe_date: a.boe_date,
        cif_value: a.cif_value,
        import_date: a.import_date,
        asset_incharge: a.asset_incharge ? (userMap[a.asset_incharge] || a.asset_incharge) : undefined,
        building: a.building ? (buildingMap[a.building] || a.building) : undefined,
        floor: a.floor_id ? (floorMap[a.floor_id] || a.floor_id) : undefined,
        room_rack: a.room_id ? (roomMap[a.room_id] || a.room_id) : undefined,
        tenant_company: a.handover_to ? (tenantMap[a.handover_to] || undefined) : undefined,
        handover_other_name: a.handover_other_name,
        handover_other_email: a.handover_other_email,
        handover_other_contact: a.handover_other_contact,
        created_by: a.created_by,
        created_at: a.created_at,
        updated_by: a.updated_by,
        updated_at: a.updated_at,
        comments: a.comments,
      }));
      
      await generateAssetExcelReport(exportData);
      toast({ title: 'Success', description: `Report generated with ${allAssets.length} asset(s)` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Asset Reports" subtitle="Generate comprehensive asset reports">
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Comprehensive Asset Report</CardTitle>
                  <CardDescription>Multi-sheet Excel report</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a detailed Excel report with 9 sheets including:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>• Summary Report</li>
                <li>• Detailed Assets</li>
                <li>• Cost & Valuation</li>
                <li>• Status & Maintenance</li>
                <li>• Location Analysis</li>
                <li>• Tickets</li>
                <li>• Movement History</li>
                <li>• Audits</li>
                <li>• Services</li>
              </ul>
              <Button 
                onClick={handleGenerateReport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
