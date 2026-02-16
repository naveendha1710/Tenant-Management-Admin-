import { AssetSnapshot } from '../types/pm.types';

interface AssetSnapshotTabProps {
  asset: AssetSnapshot;
}

export function AssetSnapshotTab({ asset }: AssetSnapshotTabProps) {
  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Basic Information</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Asset ID</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.asset_id}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Asset Name</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.asset_name}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Category / Type</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.asset_category} / {asset.asset_type}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Serial Number</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.serial_number || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Tenant</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.tenant_name}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Location</label>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {asset.building} / {asset.floor} / {asset.room_rack}
            </p>
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Status Information</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Working Status</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.status}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Condition</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.condition || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Asset Status</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.asset_status}</p>
          </div>
        </div>
      </div>

      {/* PM & Audit Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">PM & Audit Information</h3>
        <div className="grid grid-cols-5 gap-6">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Next PM Date</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.pm_date ? new Date(asset.pm_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">PM Status</label>
            <div className="mt-2">
              {asset.pmStatus ? (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  asset.pmStatus === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                  asset.pmStatus === 'due' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {asset.pmStatus === 'upcoming' ? 'Upcoming' : asset.pmStatus === 'due' ? 'Due' : 'Overdue'}
                </span>
              ) : (
                <span className="text-sm text-gray-900">N/A</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Last PM Date</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.last_pm_date ? new Date(asset.last_pm_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Last Audit Date</label>
            <p className="text-sm font-medium text-gray-900 mt-2">{asset.last_audit_date ? new Date(asset.last_audit_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Audit Result</label>
            <div className="mt-2">
              {asset.audit_result ? (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  asset.audit_result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {asset.audit_result}
                </span>
              ) : (
                <span className="text-sm text-gray-900">N/A</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
