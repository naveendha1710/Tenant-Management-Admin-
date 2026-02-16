import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  RefreshCw, 
  Trash2,
  ArrowUpDown,
  Vault,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lock
} from 'lucide-react';

interface DepositRecord {
  id: string;
  tenantName: string;
  tenantId: string;
  propertySpace: string;
  depositType: 'Security' | 'Advance Rent' | 'Maintenance';
  depositAmount: number;
  dateReceived: string;
  paymentMode: string;
  transactionId: string;
  currentStatus: 'Held' | 'Adjusted' | 'Refunded' | 'Partial Refund' | 'Pending Refund';
  refundAmount?: number;
  refundDate?: string;
  notes?: string;
  adjustedAmount?: number;
}

const mockDepositsData: DepositRecord[] = [
  {
    id: '1',
    tenantName: 'TechStart Solutions',
    tenantId: 'TNT-001',
    propertySpace: 'Block A - Floor 2',
    depositType: 'Security',
    depositAmount: 150000,
    dateReceived: '2023-06-15',
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN123456789',
    currentStatus: 'Held',
    notes: 'Initial security deposit for 2-year lease'
  },
  {
    id: '2',
    tenantName: 'Innovate Labs',
    tenantId: 'TNT-002',
    propertySpace: 'Block B - Floor 1',
    depositType: 'Security',
    depositAmount: 180000,
    dateReceived: '2023-08-20',
    paymentMode: 'UPI',
    transactionId: 'UPI987654321',
    currentStatus: 'Held',
    notes: 'Security deposit for AI lab setup'
  },
  {
    id: '3',
    tenantName: 'Digital Dynamics',
    tenantId: 'TNT-003',
    propertySpace: 'Block A - Floor 3',
    depositType: 'Security',
    depositAmount: 120000,
    dateReceived: '2023-05-10',
    paymentMode: 'Cheque',
    transactionId: 'CHQ001234',
    currentStatus: 'Refunded',
    refundAmount: 120000,
    refundDate: '2024-01-15',
    notes: 'Refunded after lease completion - no damages'
  },
  {
    id: '4',
    tenantName: 'SPAN Edutech Ventures',
    tenantId: 'TNT-004',
    propertySpace: 'Block C - Floor 2',
    depositType: 'Security',
    depositAmount: 200000,
    dateReceived: '2023-09-01',
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN555666777',
    currentStatus: 'Adjusted',
    adjustedAmount: 25000,
    notes: 'Adjusted ₹25,000 for minor repairs'
  },
  {
    id: '5',
    tenantName: 'Alpha Technologies',
    tenantId: 'TNT-005',
    propertySpace: 'Block A - Floor 1',
    depositType: 'Advance Rent',
    depositAmount: 75000,
    dateReceived: '2023-07-12',
    paymentMode: 'UPI',
    transactionId: 'UPI111222333',
    currentStatus: 'Pending Refund',
    notes: 'Advance rent - tenant moving out next month'
  }
];

interface DepositsTableProps {
  onView: (record: DepositRecord) => void;
  onEdit: (record: DepositRecord) => void;
  onRefund: (record: DepositRecord) => void;
  onDelete: (record: DepositRecord) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function DepositsTable({ onView, onEdit, onRefund, onDelete, canEdit, canDelete }: DepositsTableProps) {
  const [depositsData, setDepositsData] = useState<DepositRecord[]>(mockDepositsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'amount' | 'date' | 'tenant'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Held': return 'bg-blue-100 text-blue-800';
      case 'Adjusted': return 'bg-yellow-100 text-yellow-800';
      case 'Refunded': return 'bg-green-100 text-green-800';
      case 'Partial Refund': return 'bg-orange-100 text-orange-800';
      case 'Pending Refund': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Held': return <Vault className="h-4 w-4" />;
      case 'Adjusted': return <Edit className="h-4 w-4" />;
      case 'Refunded': return <CheckCircle className="h-4 w-4" />;
      case 'Partial Refund': return <RefreshCw className="h-4 w-4" />;
      case 'Pending Refund': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredAndSortedData = depositsData
    .filter(record => {
      const matchesSearch = 
        record.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.tenantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.propertySpace.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.currentStatus === statusFilter;
      const matchesType = typeFilter === 'all' || record.depositType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'amount':
          comparison = a.depositAmount - b.depositAmount;
          break;
        case 'date':
          comparison = new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime();
          break;
        case 'tenant':
          comparison = a.tenantName.localeCompare(b.tenantName);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'amount' | 'date' | 'tenant') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vault className="h-5 w-5" />
          Deposits Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tenants, property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Held">Held</SelectItem>
              <SelectItem value="Adjusted">Adjusted</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
              <SelectItem value="Partial Refund">Partial Refund</SelectItem>
              <SelectItem value="Pending Refund">Pending Refund</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Security">Security</SelectItem>
              <SelectItem value="Advance Rent">Advance Rent</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('tenant')} className="h-auto p-0 font-medium">
                    Tenant Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Property / Space</TableHead>
                <TableHead>Deposit Type</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('amount')} className="h-auto p-0 font-medium">
                    Deposit Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('date')} className="h-auto p-0 font-medium">
                    Date Received
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Refund Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{record.tenantName}</div>
                      <div className="text-sm text-muted-foreground">{record.tenantId}</div>
                    </div>
                  </TableCell>
                  <TableCell>{record.propertySpace}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.depositType}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">₹{record.depositAmount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(record.dateReceived).toLocaleDateString()}</TableCell>
                  <TableCell>{record.paymentMode}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{record.transactionId}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(record.currentStatus)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(record.currentStatus)}
                        {record.currentStatus}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.refundAmount ? `₹${record.refundAmount.toLocaleString()}` : '-'}
                    {record.adjustedAmount && (
                      <div className="text-xs text-yellow-600">
                        Adjusted: ₹{record.adjustedAmount.toLocaleString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.refundDate ? new Date(record.refundDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => onView(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit ? (
                        <Button size="sm" variant="outline" onClick={() => onEdit(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="You don't have permission to edit deposits">
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                      {(record.currentStatus === 'Held' || record.currentStatus === 'Pending Refund') && (
                        canEdit ? (
                          <Button size="sm" variant="outline" onClick={() => onRefund(record)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled title="You don't have permission to process refunds">
                            <Lock className="h-4 w-4" />
                          </Button>
                        )
                      )}
                      {canDelete ? (
                        <Button size="sm" variant="outline" onClick={() => onDelete(record)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="You don't have permission to delete deposits">
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredAndSortedData.length} of {depositsData.length} deposit records
        </div>
      </CardContent>
    </Card>
  );
}