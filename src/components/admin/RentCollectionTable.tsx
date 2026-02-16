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
  CreditCard, 
  Mail, 
  ArrowUpDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Lock
} from 'lucide-react';

interface RentRecord {
  id: string;
  tenantName: string;
  tenantId: string;
  propertySpace: string;
  rentAmount: number;
  maintenance: number;
  totalAmount: number;
  dueDate: string;
  paidDate?: string;
  paymentMode?: string;
  transactionId?: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  partialAmount?: number;
  notes?: string;
}

const mockRentData: RentRecord[] = [
  {
    id: '1',
    tenantName: 'TechStart Solutions',
    tenantId: 'TNT-001',
    propertySpace: 'Block A - Floor 2',
    rentAmount: 50000,
    maintenance: 5000,
    totalAmount: 64900,
    dueDate: '2024-01-10',
    paidDate: '2024-01-08',
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN123456789',
    status: 'Paid'
  },
  {
    id: '2',
    tenantName: 'Innovate Labs',
    tenantId: 'TNT-002',
    propertySpace: 'Block B - Floor 1',
    rentAmount: 60000,
    maintenance: 6000,
    totalAmount: 77880,
    dueDate: '2024-01-10',
    status: 'Pending'
  },
  {
    id: '3',
    tenantName: 'Digital Dynamics',
    tenantId: 'TNT-003',
    propertySpace: 'Block A - Floor 3',
    rentAmount: 45000,
    maintenance: 4500,
    totalAmount: 58410,
    dueDate: '2023-12-10',
    status: 'Overdue'
  },
  {
    id: '4',
    tenantName: 'SPAN Edutech Ventures',
    tenantId: 'TNT-004',
    propertySpace: 'Block C - Floor 2',
    rentAmount: 70000,
    maintenance: 7000,
    totalAmount: 90860,
    dueDate: '2024-01-10',
    paidDate: '2024-01-09',
    paymentMode: 'UPI',
    transactionId: 'UPI987654321',
    status: 'Paid'
  },
  {
    id: '5',
    tenantName: 'Alpha Technologies',
    tenantId: 'TNT-005',
    propertySpace: 'Block A - Floor 1',
    rentAmount: 55000,
    maintenance: 5500,
    totalAmount: 71390,
    dueDate: '2024-01-10',
    partialAmount: 40000,
    paidDate: '2024-01-12',
    paymentMode: 'Cheque',
    transactionId: 'CHQ001234',
    status: 'Partial'
  }
];

interface RentCollectionTableProps {
  onMarkPaid: (record: RentRecord) => void;
  onViewReceipt: (record: RentRecord) => void;
  onSendReminder: (record: RentRecord) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function RentCollectionTable({ onMarkPaid, onViewReceipt, onSendReminder, canEdit, canDelete }: RentCollectionTableProps) {
  const [rentData, setRentData] = useState<RentRecord[]>(mockRentData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'amount' | 'dueDate' | 'tenant'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Partial': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'Overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'Partial': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredAndSortedData = rentData
    .filter(record => {
      const matchesSearch = 
        record.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.tenantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.propertySpace.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesBuilding = buildingFilter === 'all' || record.propertySpace.includes(buildingFilter);
      const matchesPaymentMode = paymentModeFilter === 'all' || record.paymentMode === paymentModeFilter;
      
      return matchesSearch && matchesStatus && matchesBuilding && matchesPaymentMode;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'tenant':
          comparison = a.tenantName.localeCompare(b.tenantName);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'amount' | 'dueDate' | 'tenant') => {
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
          <CreditCard className="h-5 w-5" />
          Rent Collection Details
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
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              <SelectItem value="Block A">Block A</SelectItem>
              <SelectItem value="Block B">Block B</SelectItem>
              <SelectItem value="Block C">Block C</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Payment mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
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
                <TableHead>Rent Amount</TableHead>
                <TableHead>Maintenance</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('amount')} className="h-auto p-0 font-medium">
                    Total Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('dueDate')} className="h-auto p-0 font-medium">
                    Due Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>₹{record.rentAmount.toLocaleString()}</TableCell>
                  <TableCell>₹{record.maintenance.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">
                    ₹{record.totalAmount.toLocaleString()}
                    {record.status === 'Partial' && record.partialAmount && (
                      <div className="text-xs text-blue-600">
                        Paid: ₹{record.partialAmount.toLocaleString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={new Date(record.dueDate) < new Date() && record.status !== 'Paid' ? 'text-red-600 font-medium' : ''}>
                      {new Date(record.dueDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.paidDate ? new Date(record.paidDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>{record.paymentMode || '-'}</TableCell>
                  <TableCell>
                    {record.transactionId ? (
                      <span className="font-mono text-xs">{record.transactionId}</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(record.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(record.status)}
                        {record.status}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {record.status === 'Paid' ? (
                        <Button size="sm" variant="outline" onClick={() => onViewReceipt(record)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        canEdit ? (
                          <Button size="sm" variant="outline" onClick={() => onMarkPaid(record)}>
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled title="You don't have permission to mark payments">
                            <Lock className="h-4 w-4" />
                          </Button>
                        )
                      )}
                      {canEdit ? (
                        <Button size="sm" variant="outline" onClick={() => onSendReminder(record)}>
                          <Mail className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="You don't have permission to send reminders">
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
          Showing {filteredAndSortedData.length} of {rentData.length} rent records
        </div>
      </CardContent>
    </Card>
  );
}