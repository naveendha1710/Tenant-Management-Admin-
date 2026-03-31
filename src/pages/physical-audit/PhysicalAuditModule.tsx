import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle2, XCircle, Eye, ArrowRight, Camera, X, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { Pagination } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGPSCapture } from '@/hooks/useGPSCapture';

type Condition = 'Good' | 'Damaged' | 'Scrap';
type AuditResult = 'Pass' | 'Issues';

// Convert decimal degrees to DMS format
const convertToDMS = (lat: number, lng: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  const latAbs = Math.abs(lat);
  const lngAbs = Math.abs(lng);
  
  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(1);
  
  const lngDeg = Math.floor(lngAbs);
  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
  const lngSec = ((lngAbs - lngDeg - lngMin / 60) * 3600).toFixed(1);
  
  return `${latDeg}°${latMin}'${latSec}"${latDir} ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
};

interface Asset {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_category: string;
  asset_type: string;
  serial_number: string;
  asset_pictures: string;
  building: string;
  floor: string;
  room_rack: string;
}

interface AuditHistory {
  id: string;
  asset_id: string;
  audit_date: string;
  auditor_name: string;
  condition: string;
  audit_result: string;
  barcode_scanned: boolean;
  remarks: string;
  asset_found: boolean;
  location_match: boolean;
  tenant_match: boolean;
  serial_match: boolean;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;
}

export default function PhysicalAuditModule() {
  const { user } = useAuth();
  const [assetId, setAssetId] = useState('');
  const [scanned, setScanned] = useState(false);
  const [assetFound, setAssetFound] = useState(true);
  const [locationMatch, setLocationMatch] = useState(true);
  const [tenantMatch, setTenantMatch] = useState(true);
  const [serialMatch, setSerialMatch] = useState(true);
  const [condition, setCondition] = useState<Condition>('Good');
  const [auditResult, setAuditResult] = useState<AuditResult>('Pass');
  const [remarks, setRemarks] = useState('');
  const [auditHistory, setAuditHistory] = useState<AuditHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showScanModal, setShowScanModal] = useState(false);
  const [viewingAudit, setViewingAudit] = useState<AuditHistory | null>(null);
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [todayAssets, setTodayAssets] = useState<any[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [completedAssets, setCompletedAssets] = useState<any[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const today = new Date().toISOString().split('T')[0];
  const isUpcomingDate = selectedDate > today;
  const { coordinates, error: gpsError, loading: gpsLoading, captureLocation, reset: resetGPS } = useGPSCapture();
  const [isAssetAssignedToUser, setIsAssetAssignedToUser] = useState(false);

  useEffect(() => {
    fetchAuditHistory();
    loadTodayAuditAssets();
    loadCompletedAudits();
  }, []);

  useEffect(() => {
    loadTodayAuditAssets();
  }, [selectedDate]);

  const loadCompletedAudits = async () => {
    try {
      setLoadingCompleted(true);
      const today = new Date().toISOString().split('T')[0];
      const { data: taskInstances } = await supabase
        .from('pm_task_instances')
        .select('asset_id, completed_at')
        .eq('task_date', today)
        .eq('assigned_to', user?.id)
        .eq('status', 'COMPLETED');

      if (!taskInstances || taskInstances.length === 0) {
        setCompletedAssets([]);
        setLoadingCompleted(false);
        return;
      }

      const assetIds = taskInstances.map(t => t.asset_id);
      const { data: assets } = await supabase
        .from('assets')
        .select('id, asset_id, asset_name, asset_category, building, floor_id, handover_to')
        .in('id', assetIds);

      if (!assets) {
        setCompletedAssets([]);
        setLoadingCompleted(false);
        return;
      }

      const buildingIds = [...new Set(assets.map(a => a.building).filter(Boolean))];
      const floorIds = [...new Set(assets.map(a => a.floor_id).filter(Boolean))];
      const tenantIds = [...new Set(assets.map(a => a.handover_to).filter(Boolean))];

      const [{ data: buildings }, { data: floors }, { data: tenants }] = await Promise.all([
        supabase.from('buildings').select('id, name').in('id', buildingIds),
        supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds),
        supabase.from('tenants').select('id, company, name').in('id', tenantIds)
      ]);

      const buildingMap = new Map(buildings?.map(b => [b.id, b.name]) || []);
      const floorMap = new Map(floors?.map(f => [f.id, f.floor_name || f.floor_number]) || []);
      const tenantMap = new Map(tenants?.map(t => [t.id, t.company || t.name]) || []);
      const taskMap = new Map(taskInstances.map(t => [t.asset_id, t]));

      const formattedAssets = assets.map(asset => {
        const task = taskMap.get(asset.id);
        return {
          ...asset,
          building_name: buildingMap.get(asset.building) || 'N/A',
          floor_name: floorMap.get(asset.floor_id) || 'N/A',
          tenant_name: tenantMap.get(asset.handover_to) || 'Unassigned',
          completed_at: task?.completed_at
        };
      });

      setCompletedAssets(formattedAssets);
    } catch (error) {
      console.error('Failed to load completed audits:', error);
    } finally {
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    if (showScanModal) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [showScanModal]);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: 250,
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [0],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        (decodedText) => {
          setAssetId(decodedText);
          setScanned(true);
          stopScanner();
          validateAndShowAsset(decodedText);
        },
        (errorMessage) => {
          // Scanning in progress, ignore errors
        }
      );
    } catch (error) {
      console.error('Scanner error:', error);
      alert('Camera access denied or not available. Please enter Asset ID manually.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const fetchAuditHistory = async () => {
    const { data } = await supabase
      .from('physical_audits')
      .select('*')
      .order('audit_date', { ascending: false })
      .limit(20);
    
    if (data) setAuditHistory(data);
  };

  const loadTodayAuditAssets = async (filterDate?: string) => {
    try {
      const dateToFilter = filterDate || selectedDate;
      
      // Get PM task instances for the selected date assigned to current user that are NOT completed
      const { data: taskInstances } = await supabase
        .from('pm_task_instances')
        .select('asset_id, assigned_to')
        .eq('task_date', dateToFilter)
        .eq('assigned_to', user?.id)
        .neq('status', 'COMPLETED');

      if (!taskInstances || taskInstances.length === 0) {
        setTodayAssets([]);
        setLoadingToday(false);
        return;
      }

      const assetIds = taskInstances.map(t => t.asset_id);
      
      const { data: assets } = await supabase
        .from('assets')
        .select(`
          id,
          asset_id,
          asset_name,
          asset_category,
          serial_number,
          status,
          building,
          floor_id,
          room_rack,
          handover_to
        `)
        .in('id', assetIds);

      if (!assets) {
        setTodayAssets([]);
        setLoadingToday(false);
        return;
      }

      const buildingIds = [...new Set(assets.map(a => a.building).filter(Boolean))];
      const floorIds = [...new Set(assets.map(a => a.floor_id).filter(Boolean))];
      const tenantIds = [...new Set(assets.map(a => a.handover_to).filter(Boolean))];

      const [{ data: buildings }, { data: floors }, { data: tenants }] = await Promise.all([
        supabase.from('buildings').select('id, name').in('id', buildingIds),
        supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds),
        supabase.from('tenants').select('id, company, name').in('id', tenantIds)
      ]);

      const buildingMap = new Map(buildings?.map(b => [b.id, b.name]) || []);
      const floorMap = new Map(floors?.map(f => [f.id, f.floor_name || f.floor_number]) || []);
      const tenantMap = new Map(tenants?.map(t => [t.id, t.company || t.name]) || []);

      const formattedAssets = assets.map(asset => ({
        ...asset,
        building_name: buildingMap.get(asset.building) || 'N/A',
        floor_name: floorMap.get(asset.floor_id) || 'N/A',
        tenant_name: tenantMap.get(asset.handover_to) || 'Unassigned'
      }));

      setTodayAssets(formattedAssets);
    } catch (error) {
      console.error('Failed to load assigned audit assets:', error);
    } finally {
      setLoadingToday(false);
    }
  };

  const validateAndShowAsset = async (scannedId: string) => {
    setLoading(true);
    
    console.log('Scanning asset ID:', scannedId);
    
    // Capture GPS immediately
    captureLocation();
    
    const { data: asset, error } = await supabase
      .from('assets')
      .select('id, asset_id, asset_name, asset_category, asset_type, serial_number, asset_pictures, building, floor_id, room_rack')
      .eq('asset_id', scannedId.trim())
      .single();

    console.log('Asset query result:', { asset, error });

    if (error || !asset) {
      console.error('Asset fetch error:', error);
      alert('Asset not found in Asset Master!');
      setAssetId('');
      setLoading(false);
      resetGPS();
      return;
    }

    // Check if this asset is assigned to the current user for today
    const today = new Date().toISOString().split('T')[0];
    const { data: taskInstance } = await supabase
      .from('pm_task_instances')
      .select('assigned_to, status')
      .eq('asset_id', asset.id)
      .eq('task_date', today)
      .eq('assigned_to', user?.id)
      .neq('status', 'COMPLETED')
      .maybeSingle();

    const isAssigned = !!taskInstance;
    setIsAssetAssignedToUser(isAssigned);

    // Fetch building and floor names
    const buildingIds = asset.building ? [asset.building] : [];
    const floorIds = asset.floor_id ? [asset.floor_id] : [];

    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name')
      .in('id', buildingIds);

    const { data: floors } = await supabase
      .from('floors')
      .select('id, floor_name, floor_number')
      .in('id', floorIds);

    const buildingName = buildings?.[0]?.name || 'N/A';
    const floorName = floors?.[0]?.floor_name || floors?.[0]?.floor_number || 'N/A';

    setAssetDetails({
      ...asset,
      building: buildingName,
      floor: floorName
    });
    setShowScanModal(false);
    setLoading(false);
  };

  const handleScan = async () => {
    if (!assetId.trim()) return;
    await validateAndShowAsset(assetId);
  };

  const openScanner = () => {
    setShowScanModal(true);
    setAssetId('');
    setAssetDetails(null);
    setShowAuditForm(false);
    setShowCamera(false);
  };

  const handleRecordAudit = async () => {
    if (!assetId.trim()) return;
    
    if (!coordinates) {
      alert('GPS location is required for physical audit. Please wait for location to be captured.');
      return;
    }
    
    setLoading(true);
    
    // Insert physical audit record
    const { data: auditData, error: auditError } = await supabase.from('physical_audits').insert({
      asset_id: assetId,
      barcode_scanned: scanned,
      asset_found: assetFound,
      location_match: locationMatch,
      tenant_match: tenantMatch,
      serial_match: serialMatch,
      condition,
      audit_result: auditResult,
      remarks,
      audit_date: new Date().toISOString(),
      auditor_name: user?.email || 'Unknown',
      gps_latitude: coordinates?.latitude,
      gps_longitude: coordinates?.longitude,
      gps_accuracy: coordinates?.accuracy
    }).select().single();

    if (!auditError && auditData) {
      // Update PM task instance status to COMPLETED and link audit
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('pm_task_instances')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          audit_id: auditData.id,
          notes: remarks || null,
          updated_by: user?.email
        })
        .eq('asset_id', assetDetails?.id)
        .eq('task_date', today)
        .eq('assigned_to', user?.id);
      
      // Update PM schedule: set last completed date and calculate next date
      const { data: pmData } = await supabase
        .from('preventive_maintenance')
        .select('pm_frequency_days, pm_next_date')
        .eq('asset_id', assetDetails?.id)
        .single();

      if (pmData) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + pmData.pm_frequency_days);
        
        await supabase
          .from('preventive_maintenance')
          .update({
            pm_last_completed_date: new Date().toISOString().split('T')[0],
            pm_next_date: nextDate.toISOString().split('T')[0],
            updated_by: user?.email
          })
          .eq('asset_id', assetDetails?.id);
      }

      setAssetId('');
      setScanned(false);
      setAssetDetails(null);
      setShowAuditForm(false);
      setAssetFound(true);
      setLocationMatch(true);
      setTenantMatch(true);
      setSerialMatch(true);
      setCondition('Good');
      setAuditResult('Pass');
      setRemarks('');
      resetGPS();
      fetchAuditHistory();
      loadTodayAuditAssets();
      loadCompletedAudits();
      alert('Audit recorded successfully!');
    } else {
      alert('Failed to record audit. Please try again.');
    }
    setLoading(false);
  };

  const getConditionBadge = (cond: string) => {
    const styles = {
      Good: 'bg-green-100 text-green-800',
      Damaged: 'bg-red-100 text-red-800',
      Scrap: 'bg-orange-100 text-orange-800'
    };
    return styles[cond as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getResultBadge = (result: string) => {
    return result === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getBooleanBadge = (value: boolean) => {
    return value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const totalPages = Math.ceil(auditHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = auditHistory.slice(startIndex, endIndex);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Physical Audit</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">Scan and verify asset condition</p>
          </div>
          <button
            onClick={openScanner}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow transition-all"
          >
            <QrCode className="h-5 w-5" />
            Scan Asset
          </button>
        </div>

        {/* Scan Modal */}
        {showScanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <QrCode className="h-16 w-16 text-blue-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900">SCAN ASSET</h3>
                <p className="text-sm text-gray-500 mt-1">Scan QR code or enter Asset ID manually</p>
              </div>
              
              <div className="space-y-4">
                {/* Camera Viewport - Always Visible */}
                <div id="qr-reader" className="relative rounded-lg overflow-hidden" style={{ width: '100%', height: '300px' }}></div>
                <p className="text-center text-sm text-gray-600 mt-2 animate-pulse">Searching for QR code...</p>

                <style>{`
                  @keyframes scan {
                    0%, 100% { top: 0; }
                    50% { top: calc(100% - 2px); }
                  }
                  .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                  }
                `}</style>

                {/* Divider with Text */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-500">OR ENTER MANUALLY</span>
                  </div>
                </div>

                {/* Manual Input Field */}
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter Asset ID"
                  disabled={loading}
                />
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowScanModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScan}
                    disabled={!assetId.trim() || loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Validating...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Asset Details Card */}
        {assetDetails && !showAuditForm && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Success Header */}
            <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Asset Identified</span>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                {/* Asset Image */}
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  {assetDetails.asset_pictures ? (
                    <img
                      src={assetDetails.asset_pictures}
                      alt={assetDetails.asset_name}
                      className="w-full sm:w-48 h-48 object-cover rounded-lg border border-gray-100 shadow-sm"
                    />
                  ) : (
                    <div className="w-full sm:w-48 h-48 bg-gray-50 rounded-lg border border-gray-100 shadow-sm flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No Image</span>
                    </div>
                  )}
                </div>

                {/* Asset Info */}
                <div className="flex-1">
                  {/* Title & ID */}
                  <div className="mb-4">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">{assetDetails.asset_name}</h3>
                    <p className="text-xs md:text-sm font-mono text-gray-500 mt-1">Asset ID: {assetDetails.asset_id}</p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
                      <p className="text-sm text-gray-900 mt-1">{assetDetails.asset_category}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                      <p className="text-sm text-gray-900 mt-1">{assetDetails.asset_type}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Serial Number</label>
                      <p className="text-sm text-gray-900 mt-1">{assetDetails.serial_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</label>
                      <div className="flex flex-wrap items-center gap-1 mt-1 text-sm text-gray-900">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{assetDetails.building || 'N/A'}</span>
                        <span className="text-gray-400">›</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{assetDetails.floor || 'N/A'}</span>
                        <span className="text-gray-400">›</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{assetDetails.room_rack || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="border-t border-gray-100 px-4 md:px-6 py-4 bg-gray-50">
              {isAssetAssignedToUser ? (
                <button
                  onClick={() => setShowAuditForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-sm md:text-base"
                >
                  Start Verification
                  <ArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      This asset is not assigned to you for audit today. You can only view the details.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAssetDetails(null);
                      setAssetId('');
                      resetGPS();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm md:text-base"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Checklist */}
        {showAuditForm && assetDetails && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-6">VERIFICATION SHEET</h2>
              
              {/* Asset Header Banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                <div>
                  <label className="text-xs font-medium text-blue-600 uppercase">Asset ID</label>
                  <p className="text-base md:text-lg font-bold text-gray-900 mt-1">{assetId}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Scan Status: {scanned ? 'QR Code' : 'Manual'}
                </span>
              </div>

              {/* Checklist - Vertical List */}
              <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                {[
                  { label: 'Asset Found?', value: assetFound, setter: setAssetFound },
                  { label: 'Location Match?', value: locationMatch, setter: setLocationMatch },
                  { label: 'Assigned Tenant Match?', value: tenantMatch, setter: setTenantMatch },
                  { label: 'Serial No Match?', value: serialMatch, setter: setSerialMatch }
                ].map((check, index) => (
                  <div key={check.label} className={`flex justify-between items-center p-4 ${index !== 3 ? 'border-b border-gray-100' : ''}`}>
                    <label className="text-sm font-medium text-gray-700">{check.label}</label>
                    <div className="flex bg-gray-100 rounded-full p-1">
                      <button
                        onClick={() => check.setter(true)}
                        className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                          check.value
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => check.setter(false)}
                        className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                          !check.value
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* GPS Capture - Auto captured */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">GPS Location <span className="text-red-500">*</span></label>
                {gpsLoading ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-blue-700">Capturing GPS location...</span>
                    </div>
                  </div>
                ) : coordinates ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-700 uppercase">Location Captured</span>
                    </div>
                    <p className="text-sm text-gray-700 font-mono">{convertToDMS(coordinates.latitude, coordinates.longitude)}</p>
                    <p className="text-xs text-gray-500 mt-1">Accuracy: ±{coordinates.accuracy.toFixed(1)}m</p>
                  </div>
                ) : gpsError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium mb-2">⚠️ Location Required</p>
                    <p className="text-xs text-red-600">{gpsError.message}</p>
                    <button
                      onClick={captureLocation}
                      className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                    >
                      Retry GPS Capture
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Remarks */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any observations or notes..."
                />
              </div>
            </div>

            {/* Footer Section */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Condition */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Condition</label>
                  <div className="flex gap-2">
                    {(['Good', 'Damaged', 'Scrap'] as Condition[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCondition(c)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          condition === c
                            ? c === 'Good'
                              ? 'bg-emerald-600 text-white'
                              : c === 'Damaged'
                              ? 'bg-rose-600 text-white'
                              : 'bg-orange-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audit Result */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Audit Result</label>
                  <div className="flex gap-2">
                    {(['Pass', 'Issues'] as AuditResult[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAuditResult(r)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                          auditResult === r
                            ? r === 'Pass'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {r === 'Pass' ? '✓ PASS' : '✗ ISSUES'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleRecordAudit}
                disabled={loading || gpsLoading || !coordinates}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? 'Submitting...' : gpsLoading ? 'Waiting for GPS...' : 'Submit Audit & Update Maintenance'}
              </button>
              {!coordinates && !gpsLoading && (
                <p className="text-xs text-center text-red-600 mt-2 font-medium">
                  ⚠️ GPS location is required to submit audit
                </p>
              )}
            </div>
          </div>
        )}

        {/* Audit History Card - Only show when no asset is being audited */}
        {!assetDetails && !showAuditForm && (
          <Tabs defaultValue="history" className="w-full mt-6">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="history" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Audit History
              </TabsTrigger>
              <TabsTrigger value="day-audit" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Day Audit
              </TabsTrigger>
              <TabsTrigger value="completed" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
          <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Audit History</h2>
            </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 hover:bg-transparent">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Scan Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Audit Result</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Condition</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remarks</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                      No audit records found
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((audit) => (
                    <tr key={audit.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(audit.audit_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{audit.asset_id}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          audit.barcode_scanned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {audit.barcode_scanned ? 'QR Code' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getResultBadge(audit.audit_result)}`}>
                          {audit.audit_result}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getConditionBadge(audit.condition)}`}>
                          {audit.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{audit.remarks || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setViewingAudit(audit)}
                          title="View"
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, auditHistory.length)} of {auditHistory.length} audits
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  showControls
                />
              </div>
            )}
          </div>
        </div>
            </TabsContent>

            <TabsContent value="day-audit" className="mt-4">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b bg-blue-50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Physical Audits (Due & Overdue)</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">Filter by Date:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {loadingToday ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : todayAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No assets scheduled for physical audit today</p>
                    <p className="text-xs text-gray-400 mt-1">Check the Preventive Maintenance schedule</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayAssets.map((asset) => (
                          <tr key={asset.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-sm text-gray-900">{asset.asset_id}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{asset.asset_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{asset.asset_category}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {asset.building_name} / {asset.floor_name}
                              {asset.room_rack && ` / ${asset.room_rack}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{asset.tenant_name}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setShowScanModal(true);
                                }}
                                disabled={isUpcomingDate}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                <QrCode className="h-4 w-4" />
                                {isUpcomingDate ? 'Upcoming' : 'Audit'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b bg-green-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Completed Audits</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">All completed audits for today</p>
                </div>

                {loadingCompleted ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : completedAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No completed audits for this date</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Completed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedAssets.map((asset) => (
                          <tr key={asset.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-sm text-gray-900">{asset.asset_id}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{asset.asset_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{asset.asset_category}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {asset.building_name} / {asset.floor_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{asset.tenant_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {asset.completed_at ? new Date(asset.completed_at).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* View Audit Modal */}
        {viewingAudit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">AUDIT DETAILS</h3>
                <button onClick={() => setViewingAudit(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Asset ID</label>
                    <p className="text-sm text-gray-900 font-semibold">{viewingAudit.asset_id}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Audit Date</label>
                    <p className="text-sm text-gray-900">{new Date(viewingAudit.audit_date).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Scan Type</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      viewingAudit.barcode_scanned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingAudit.barcode_scanned ? 'QR Code' : 'Manual'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Auditor</label>
                    <p className="text-sm text-gray-900">{viewingAudit.auditor_name}</p>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Asset Found</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getBooleanBadge(viewingAudit.asset_found)}`}>
                      {viewingAudit.asset_found ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Location Match</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getBooleanBadge(viewingAudit.location_match)}`}>
                      {viewingAudit.location_match ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tenant Match</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getBooleanBadge(viewingAudit.tenant_match)}`}>
                      {viewingAudit.tenant_match ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Serial Match</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getBooleanBadge(viewingAudit.serial_match)}`}>
                      {viewingAudit.serial_match ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Condition</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getConditionBadge(viewingAudit.condition)}`}>
                      {viewingAudit.condition}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Audit Result</label>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getResultBadge(viewingAudit.audit_result)}`}>
                      {viewingAudit.audit_result}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Remarks</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{viewingAudit.remarks || 'No remarks'}</p>
                </div>

                {viewingAudit.gps_latitude && viewingAudit.gps_longitude && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">GPS Location</label>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">Audit Location</span>
                      </div>
                      <p className="text-sm text-gray-700"><span className="font-medium">Latitude:</span> {viewingAudit.gps_latitude.toFixed(6)}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">Longitude:</span> {viewingAudit.gps_longitude.toFixed(6)}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">Accuracy:</span> ±{viewingAudit.gps_accuracy?.toFixed(1)}m</p>
                      <a
                        href={`https://www.google.com/maps?q=${viewingAudit.gps_latitude},${viewingAudit.gps_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <MapPin className="h-3 w-3" />
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setViewingAudit(null)}
                  className="w-full mt-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
