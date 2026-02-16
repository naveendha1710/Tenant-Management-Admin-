import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { type Agreement } from '@/data/agreementData';

interface TenantPaymentsTabProps {
  agreements: Agreement[];
}

interface PaymentRow {
  type: string;
  description: string;
  amount: number;
  dueDate: string;
  remainingDays: number;
}

export function TenantPaymentsTab({ agreements }: TenantPaymentsTabProps) {
  const getNextMonthlyDueDate = (commencementDate: string): string => {
    const today = new Date();
    const commencement = new Date(commencementDate);
    const dayOfMonth = commencement.getDate();
    
    const nextDue = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (nextDue < today) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
    
    return nextDue.toISOString().split('T')[0];
  };

  const calculateRemainingDays = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isCurrentMonth = (date: string): boolean => {
    const today = new Date();
    const checkDate = new Date(date);
    return today.getMonth() === checkDate.getMonth() && today.getFullYear() === checkDate.getFullYear();
  };

  const generatePaymentRows = (): PaymentRow[] => {
    const rows: PaymentRow[] = [];

    agreements.forEach((agreement, index) => {
      if (agreement.status !== 'Active') return;

      const commencementDate = agreement.rentCommencementDate || agreement.rent_commencement_date || '';
      if (!commencementDate) return;

      const monthlyDueDate = getNextMonthlyDueDate(commencementDate);
      const spaceAssignments = agreement.spaceAssignments || agreement.space_assignments || [];
      const floorNames = spaceAssignments.map((sa: any) => 
        `${sa.buildingName || ''} ${sa.floorName || `Floor ${sa.floor || ''}`}`.trim()
      ).join(', ');

      // Calculate total rent with escalations and charges
      const today = new Date();
      const escalations = agreement.escalations || [];
      let floorRent = 0;
      
      for (let idx = 0; idx < spaceAssignments.length; idx++) {
        const assignment = spaceAssignments[idx];
        const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
        let assignmentRent = assignment.amount || 0;
        
        for (const escalation of escalations) {
          if (!escalation.date) continue;
          const escalationDate = new Date(escalation.date);
          if (escalationDate > today) continue;
          
          const floorEsc = escalation.floorWiseEscalations?.find((f: any) => 
            f.floorId === uniqueId || f.floorId === assignment.floorId || f.floorId === assignment.id
          );
          if (floorEsc && floorEsc.percentage) {
            assignmentRent = assignmentRent + (assignmentRent * floorEsc.percentage / 100);
          }
        }
        floorRent += assignmentRent;
      }
      
      const maintenanceCharges = agreement.maintenanceCharges || agreement.maintenance_charges || [];
      const maintenanceTotal = maintenanceCharges
        .filter((c: any) => !c.isIncludedInRent)
        .reduce((sum: number, c: any) => sum + ((c.sqft || 0) * (c.ratePerSqft || 0)), 0);
      
      const generalCharges = agreement.generalCharges || agreement.general_charges || [];
      const generalTotal = generalCharges
        .filter((c: any) => c.dueDate && isCurrentMonth(c.dueDate))
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      
      const serviceCharge = agreement.serviceCharge || agreement.service_charge;
      const serviceTotal = (serviceCharge && !serviceCharge.isIncludedInRent) ? (serviceCharge.amount || 0) : 0;
      
      const totalRent = Math.round(floorRent + maintenanceTotal + generalTotal + serviceTotal);

      // Lease Rent (monthly recurring)
      rows.push({
        type: 'Lease Rent',
        description: `Agreement ${index + 1}${floorNames ? ` - ${floorNames}` : ''}`,
        amount: totalRent,
        dueDate: monthlyDueDate,
        remainingDays: calculateRemainingDays(monthlyDueDate)
      });

    });

    return rows.sort((a, b) => a.remainingDays - b.remainingDays);
  };

  const paymentRows = generatePaymentRows();

  const getStatusBadge = (remainingDays: number) => {
    if (remainingDays < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (remainingDays <= 7) {
      return <Badge variant="default" className="bg-orange-500">Due Soon</Badge>;
    } else {
      return <Badge variant="secondary">Upcoming</Badge>;
    }
  };

  if (paymentRows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No payment information available</p>
        <p className="text-sm mt-2">Add active agreements to see payment details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Remaining Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentRows.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{row.type}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell className="text-right font-semibold text-green-700">
                  ₹{row.amount.toLocaleString()}
                </TableCell>
                <TableCell>{new Date(row.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <span className={row.remainingDays < 0 ? 'text-red-600 font-semibold' : ''}>
                    {row.remainingDays < 0 ? `${Math.abs(row.remainingDays)} days ago` : `${row.remainingDays} days`}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(row.remainingDays)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
