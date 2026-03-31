import type {
  PMReportType,
  PMScheduleReportSummary,
  PMTaskReportSummary,
  PMAuditReportSummary,
} from '@/types/pmReports';

interface PMReportSummaryProps {
  reportType: PMReportType;
  summary: PMScheduleReportSummary | PMTaskReportSummary | PMAuditReportSummary;
}

export default function PMReportSummary({ reportType, summary }: PMReportSummaryProps) {
  if (reportType === 'schedule') {
    const s = summary as PMScheduleReportSummary;
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="Total Schedules" value={s.total_schedules} />
        <MetricCard label="Active" value={s.active_schedules} color="green" />
        <MetricCard label="Inactive" value={s.inactive_schedules} color="gray" />
        <MetricCard label="Tasks Generated" value={s.total_tasks_generated} />
        <MetricCard label="Completion Rate" value={`${s.overall_completion_rate}%`} color="blue" />
        <MetricCard label="Overdue Tasks" value={s.total_overdue} color="red" />
      </div>
    );
  }

  if (reportType === 'task') {
    const s = summary as PMTaskReportSummary;
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Tasks" value={s.total_tasks} />
        <MetricCard label="Completed" value={s.completed} color="green" />
        <MetricCard label="Pending" value={s.pending} color="yellow" />
        <MetricCard label="Overdue" value={s.overdue} color="red" />
        <MetricCard label="Upcoming" value={s.upcoming} color="blue" />
        <MetricCard label="Completion %" value={`${s.completion_percentage}%`} color="blue" />
        <MetricCard label="Avg Delay (Days)" value={s.average_delay_days} />
        <MetricCard label="On Time" value={s.on_time_count} color="green" />
      </div>
    );
  }

  if (reportType === 'audit') {
    const s = summary as PMAuditReportSummary;
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Audits" value={s.total_audits} />
        <MetricCard label="Passed" value={s.passed} color="green" />
        <MetricCard label="Failed" value={s.failed} color="red" />
        <MetricCard label="Pass Rate" value={`${s.pass_rate}%`} color="blue" />
        <MetricCard label="High Risk" value={s.high_risk_count} color="red" />
        <MetricCard label="Medium Risk" value={s.medium_risk_count} color="yellow" />
        <MetricCard label="Low Risk" value={s.low_risk_count} color="green" />
        <MetricCard label="Not Found" value={s.assets_not_found} color="red" />
      </div>
    );
  }

  return null;
}

function MetricCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`p-4 border rounded-lg ${colorClasses[color]}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
