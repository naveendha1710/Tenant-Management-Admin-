import React from 'react';
import { Table } from '@/components/ui/table';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className="w-full overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">
          <Table className={className}>
            {children}
          </Table>
        </div>
      </div>
    </div>
  );
}
