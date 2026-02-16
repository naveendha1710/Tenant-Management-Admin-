import { PhysicalAuditRecord } from '../types/pm.types';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PhysicalAuditTabProps {
  audit: PhysicalAuditRecord | null;
  auditHistory?: PhysicalAuditRecord[];
}

export function PhysicalAuditTab({ audit, auditHistory = [] }: PhysicalAuditTabProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (!audit) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No physical audit record found</p>
          <p className="text-xs text-gray-400 mt-2">This asset has not been audited yet</p>
        </div>
      </div>
    );
  }

  const getBadge = (value: boolean) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {value ? 'Yes' : 'No'}
    </span>
  );

  const getResultBadge = (result: string) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {result}
    </span>
  );

  const renderAuditCard = (auditRecord: PhysicalAuditRecord, isLatest: boolean = false) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6" key={auditRecord.audit_date}>
      {isLatest && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Latest Audit</h3>
            <p className="text-xs text-gray-500 mt-1">Most recent physical verification</p>
          </div>
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">Current</span>
        </div>
      )}
      
      <div className="mb-4 pb-4 border-b">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Audit Date</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{new Date(auditRecord.audit_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Auditor</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{auditRecord.auditor_name}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Asset ID</label>
          <p className="text-sm font-medium text-gray-900 mt-2">{auditRecord.asset_id}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Barcode Scanned</label>
          <div className="mt-2">{getBadge(auditRecord.barcode_scanned)}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Asset Found</label>
          <div className="mt-2">{getBadge(auditRecord.asset_found)}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Location Match</label>
          <div className="mt-2">{getBadge(auditRecord.location_match)}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Tenant Match</label>
          <div className="mt-2">{getBadge(auditRecord.tenant_match)}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Condition</label>
          <div className="mt-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              auditRecord.condition === 'Good' ? 'bg-green-100 text-green-700' :
              auditRecord.condition === 'Damaged' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {auditRecord.condition}
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Serial Number Match</label>
          <div className="mt-2">{getBadge(auditRecord.serial_match)}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Audit Result</label>
          <div className="mt-2">{getResultBadge(auditRecord.audit_result)}</div>
        </div>
        <div className="col-span-3">
          <label className="text-xs font-medium text-gray-500 uppercase">Remarks</label>
          <p className="text-sm text-gray-900 mt-2">{auditRecord.remarks || 'N/A'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderAuditCard(audit, true)}
      
      {auditHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Audit History</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {auditHistory.length} previous {auditHistory.length === 1 ? 'audit' : 'audits'}
              </span>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>
          
          {showHistory && (
            <div className="border-t p-4 space-y-4">
              {auditHistory.map((record) => (
                <div key={record.audit_date} className="border rounded-lg p-4 bg-gray-50">
                  {renderAuditCard(record, false)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
