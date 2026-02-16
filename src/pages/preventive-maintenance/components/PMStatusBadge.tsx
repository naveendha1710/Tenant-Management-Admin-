import { PMStatus } from '../types/pm.types';

interface PMStatusBadgeProps {
  status: PMStatus;
}

export function PMStatusBadge({ status }: PMStatusBadgeProps) {
  const config = {
    upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
    due: { label: 'Due', className: 'bg-yellow-100 text-yellow-700' },
    overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' }
  };

  const { label, className } = config[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
