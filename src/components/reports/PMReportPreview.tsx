import { useState } from 'react';
import type {
  PMReportType,
  PMScheduleReportRow,
  PMTaskReportRow,
  PMAuditReportRow,
} from '@/types/pmReports';

interface PMReportPreviewProps {
  reportType: PMReportType;
  data: PMScheduleReportRow[] | PMTaskReportRow[] | PMAuditReportRow[];
}

export default function PMReportPreview({ reportType, data }: PMReportPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div>
      <div className="overflow-x-auto max-h-[500px] border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            {reportType === 'schedule' && <ScheduleTableHeader />}
            {reportType === 'task' && <TaskTableHeader />}
            {reportType === 'audit' && <AuditTableHeader />}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportType === 'schedule' &&
              (currentData as PMScheduleReportRow[]).map((row, idx) => (
                <ScheduleTableRow key={idx} row={row} />
              ))}
            {reportType === 'task' &&
              (currentData as PMTaskReportRow[]).map((row, idx) => (
                <TaskTableRow key={idx} row={row} />
              ))}
            {reportType === 'audit' &&
              (currentData as PMAuditReportRow[]).map((row, idx) => (
                <AuditTableRow key={idx} row={row} />
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} records
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Schedule Table
function ScheduleTableHeader() {
  return (
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Code</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Name</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Tasks</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion %</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
    </tr>
  );
}

function ScheduleTableRow({ row }: { row: PMScheduleReportRow }) {
  return (
    <tr>
      <td className="px-4 py-3 text-sm">{row.asset_code}</td>
      <td className="px-4 py-3 text-sm">{row.asset_name}</td>
      <td className="px-4 py-3 text-sm">{row.category}</td>
      <td className="px-4 py-3 text-sm">{row.location}</td>
      <td className="px-4 py-3 text-sm">{row.frequency_days} days</td>
      <td className="px-4 py-3 text-sm">{row.assigned_to}</td>
      <td className="px-4 py-3 text-sm">{row.total_tasks}</td>
      <td className="px-4 py-3 text-sm">{row.completed_tasks}</td>
      <td className="px-4 py-3 text-sm">{row.completion_rate}%</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.schedule_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.schedule_status}
        </span>
      </td>
    </tr>
  );
}

// Task Table
function TaskTableHeader() {
  return (
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Code</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Name</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Date</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA Status</th>
    </tr>
  );
}

function TaskTableRow({ row }: { row: PMTaskReportRow }) {
  const statusColors = {
    COMPLETED: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    OVERDUE: 'bg-red-100 text-red-800',
    UPCOMING: 'bg-blue-100 text-blue-800',
  };

  return (
    <tr>
      <td className="px-4 py-3 text-sm">{row.asset_code}</td>
      <td className="px-4 py-3 text-sm">{row.asset_name}</td>
      <td className="px-4 py-3 text-sm">{row.scheduled_date}</td>
      <td className="px-4 py-3 text-sm">{row.assigned_to}</td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs ${statusColors[row.status as keyof typeof statusColors]}`}>
          {row.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">{row.completed_date || 'N/A'}</td>
      <td className="px-4 py-3 text-sm">{row.days_overdue || '-'}</td>
      <td className="px-4 py-3 text-sm">{row.sla_status}</td>
    </tr>
  );
}

// Audit Table
function AuditTableHeader() {
  return (
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audit Date</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Code</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Name</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auditor</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Found</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location Match</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
    </tr>
  );
}

function AuditTableRow({ row }: { row: PMAuditReportRow }) {
  return (
    <tr>
      <td className="px-4 py-3 text-sm">{new Date(row.audit_date).toLocaleDateString()}</td>
      <td className="px-4 py-3 text-sm">{row.asset_code}</td>
      <td className="px-4 py-3 text-sm">{row.asset_name}</td>
      <td className="px-4 py-3 text-sm">{row.auditor_name}</td>
      <td className="px-4 py-3 text-sm">{row.asset_found ? 'Yes' : 'No'}</td>
      <td className="px-4 py-3 text-sm">{row.location_match ? 'Yes' : 'No'}</td>
      <td className="px-4 py-3 text-sm">{row.condition}</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.audit_result === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {row.audit_result}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.risk_level === 'High'
              ? 'bg-red-100 text-red-800'
              : row.risk_level === 'Medium'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {row.risk_level}
        </span>
      </td>
    </tr>
  );
}
