import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, CheckCircle, Clock } from 'lucide-react';
import { AssetSnapshot, PhysicalAuditRecord } from './types/pm.types';
import { AssetSnapshotTab } from './components/AssetSnapshotTab';
import { PhysicalAuditTab } from './components/PhysicalAuditTab';
import { supabase } from '@/lib/supabaseClient';

interface PMSchedule {
  id: string;
  scheduled_date: string;
  status: 'Pending' | 'Completed';
  completed_date?: string;
}

interface PMAssetDetailProps {
  assetId: string;
  onClose: () => void;
}

export function PMAssetDetail({ assetId, onClose }: PMAssetDetailProps) {
  const [activeTab, setActiveTab] = useState('snapshot');
  const [assetSnapshot, setAssetSnapshot] = useState<AssetSnapshot | null>(null);
  const [auditRecord, setAuditRecord] = useState<PhysicalAuditRecord | null>(null);
  const [auditHistory, setAuditHistory] = useState<PhysicalAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pmSchedules, setPmSchedules] = useState<PMSchedule[]>([]);
  const [isTodayAuditDone, setIsTodayAuditDone] = useState(false);

  useEffect(() => {
    loadAssetData();
  }, [assetId]);

  const loadAssetData = async () => {
    try {
      // Fetch asset snapshot from assets table
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select(`
          asset_id,
          asset_name,
          asset_category,
          asset_type,
          serial_number,
          status,
          asset_status,
          room_rack,
          handover_to,
          building,
          floor
        `)
        .eq('id', assetId)
        .single();

      if (assetError) {
        console.error('Asset fetch error:', assetError);
      }

      // Fetch PM schedule from preventive_maintenance table
      const { data: pmData } = await supabase
        .from('preventive_maintenance')
        .select('*')
        .eq('asset_id', assetId)
        .single();

      // Fetch all physical audits for this asset to check completion
      const { data: allAudits } = await supabase
        .from('physical_audits')
        .select('audit_date')
        .eq('asset_id', asset?.asset_id);

      const auditDates = new Set(allAudits?.map(a => a.audit_date.split('T')[0]) || []);
      const today = new Date().toISOString().split('T')[0];
      const isTodayAuditDone = auditDates.has(today);
      setIsTodayAuditDone(isTodayAuditDone);

      // Generate PM schedules based on frequency
      if (pmData?.pm_start_date && pmData?.pm_frequency_days) {
        const schedules: PMSchedule[] = [];
        const startDate = new Date(pmData.pm_start_date);
        
        for (let i = 0; i < 10; i++) {
          const scheduleDate = new Date(startDate);
          scheduleDate.setDate(scheduleDate.getDate() + (pmData.pm_frequency_days * i));
          const scheduleDateStr = scheduleDate.toISOString().split('T')[0];
          
          schedules.push({
            id: `pm-${i}`,
            scheduled_date: scheduleDateStr,
            status: auditDates.has(scheduleDateStr) ? 'Completed' : 'Pending'
          });
        }
        setPmSchedules(schedules);
      }

      // Fetch latest physical audit record (table may not exist)
      const { data: latestAudit } = await supabase
        .from('physical_audits')
        .select('*')
        .eq('asset_id', asset?.asset_id)
        .order('audit_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch audit history (excluding latest)
      const { data: auditHistory } = await supabase
        .from('physical_audits')
        .select('*')
        .eq('asset_id', asset?.asset_id)
        .order('audit_date', { ascending: false })
        .limit(10)
        .then(result => {
          if (result.data && latestAudit) {
            return { ...result, data: result.data.filter(a => a.audit_date !== latestAudit.audit_date) };
          }
          return result;
        });

      const calculatePMStatus = (pmDate: string): 'upcoming' | 'due' | 'overdue' => {
        const today = new Date();
        const pm = new Date(pmDate);
        const diffDays = Math.ceil((pm.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 7) return 'due';
        return 'upcoming';
      };

      if (asset) {
        // Fetch tenant name
        const { data: tenant } = await supabase
          .from('tenants')
          .select('company, name')
          .eq('id', asset.handover_to)
          .single();

        // Fetch building name
        const { data: building } = await supabase
          .from('buildings')
          .select('name')
          .eq('id', asset.building)
          .single();

        // Fetch floor name
        const { data: floor } = await supabase
          .from('floors')
          .select('floor_name, floor_number')
          .eq('id', asset.floor)
          .single();

        setAssetSnapshot({
          asset_id: asset.asset_id,
          asset_name: asset.asset_name,
          asset_category: asset.asset_category,
          asset_type: asset.asset_type,
          serial_number: asset.serial_number,
          tenant_name: tenant?.company || tenant?.name || 'N/A',
          building: building?.name || 'N/A',
          floor: floor?.floor_name || `Floor ${floor?.floor_number}` || 'N/A',
          room_rack: asset.room_rack || 'N/A',
          status: asset.status,
          asset_status: asset.asset_status,
          condition: latestAudit?.condition,
          pm_date: pmData?.pm_next_date,
          pmStatus: pmData?.pm_next_date ? calculatePMStatus(pmData.pm_next_date) : undefined,
          last_audit_date: latestAudit?.audit_date,
          audit_result: latestAudit?.audit_result
        });
      }

      if (latestAudit) {
        setAuditRecord({
          asset_id: latestAudit.asset_id,
          barcode_scanned: latestAudit.barcode_scanned,
          asset_found: latestAudit.asset_found,
          location_match: latestAudit.location_match,
          tenant_match: latestAudit.tenant_match,
          condition: latestAudit.condition,
          serial_match: latestAudit.serial_match,
          audit_result: latestAudit.audit_result,
          remarks: latestAudit.remarks,
          audit_date: latestAudit.audit_date,
          auditor_name: latestAudit.auditor_name || 'N/A'
        });
      }

      if (auditHistory && auditHistory.length > 0) {
        setAuditHistory(auditHistory.map(a => ({
          asset_id: a.asset_id,
          barcode_scanned: a.barcode_scanned,
          asset_found: a.asset_found,
          location_match: a.location_match,
          tenant_match: a.tenant_match,
          condition: a.condition,
          serial_match: a.serial_match,
          audit_result: a.audit_result,
          remarks: a.remarks,
          audit_date: a.audit_date,
          auditor_name: a.auditor_name || 'N/A'
        })));
      }
    } catch (error) {
      console.error('Failed to load asset data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset PM Details</h1>
          <p className="text-sm text-gray-500 mt-1">{assetSnapshot?.asset_id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="snapshot">Asset Snapshot</TabsTrigger>
          <TabsTrigger value="audit">Physical Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshot" className="mt-4">
          <div className="flex gap-4">
            {/* Left side - 70% */}
            <div className="flex-[7]">
              {assetSnapshot && <AssetSnapshotTab asset={assetSnapshot} />}
            </div>

            {/* Right side - 30% */}
            <div className="flex-[3]">
              {/* Today's Audit Status Banner */}
              {pmSchedules.some(s => s.scheduled_date === new Date().toISOString().split('T')[0]) && (
                <div className={`mb-4 p-4 rounded-lg border-2 ${
                  isTodayAuditDone 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-orange-50 border-orange-500'
                }`}>
                  <div className="flex items-center gap-2">
                    {isTodayAuditDone ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className={`text-sm font-bold ${
                        isTodayAuditDone ? 'text-green-700' : 'text-orange-700'
                      }`}>
                        {isTodayAuditDone ? 'Today\'s Audit Completed' : 'Audit Pending Today'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">PM Schedule</h3>
                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {pmSchedules.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No PM schedule configured</p>
                  ) : (
                    pmSchedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-2">
                          {schedule.status === 'Completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-600" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              {new Date(schedule.scheduled_date).toLocaleDateString()}
                            </p>
                            <span className={`text-xs font-medium ${
                              schedule.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {schedule.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <PhysicalAuditTab audit={auditRecord} auditHistory={auditHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
