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
  Trash2,
  ArrowUpDown,
  Receipt,
  CheckCircle,
  Clock,
  CreditCard,
  Lock
} from 'lucide-react';

interface ExpenseRecord {
  id: string;
  expenseId: string;
  category: 'Maintenance' | 'Utilities' | 'Salaries' | 'Supplies' | 'Insurance' | 'Transportation' | 'Office' | 'Others';
  description: string;
  date: string;
  amount: number;
  paidTo: string;
  paymentMode: string;
  status: 'Paid' | 'Pending';
  receiptFile?: string;
  notes?: string;
}

const mockExpensesData: ExpenseRecord[] = [
  {
    id: '1',
    expenseId: 'EXP-2024-001',
    category: 'Maintenance',
    description: 'AC repair and servicing - Block A',
    date: '2024-01-15',
    amount: 25000,
    paidTo: 'Cool Air Services',
    paymentMode: 'Bank Transfer',
    status: 'Paid',
    notes: 'Annual maintenance contract'
  },
  {
    id: '2',
    expenseId: 'EXP-2024-002',
    category: 'Utilities',
    description: 'Electricity bill - January 2024',
    date: '2024-01-20',
    amount: 45000,
    paidTo: 'TNEB',
    paymentMode: 'Online Payment',
    status: 'Paid'
  },
  {
    id: '3',
    expenseId: 'EXP-2024-003',
    category: 'Salaries',
    description: 'Security staff salary - January',
    date: '2024-01-31',
    amount: 35000,
    paidTo: 'Security Team',
    paymentMode: 'Bank Transfer',
    status: 'Paid'
  },
  {
    id: '4',
    expenseId: 'EXP-2024-004',
    category: 'Supplies',
    description: 'Cleaning supplies and materials',
    date: '2024-01-25',
    amount: 8500,
    paidTo: 'Clean Pro Supplies',
    paymentMode: 'UPI',
    status: 'Pending'
  },
  {
    id: '5',
    expenseId: 'EXP-2024-005',
    category: 'Insurance',
    description: 'Property insurance premium',
    date: '2024-01-10',
    amount: 75000,
    paidTo: 'Reliable Insurance Co.',
    paymentMode: 'Cheque',
    status: 'Paid'
  }
];

interface ExpensesTableProps {
  onView: (record: ExpenseRecord) => void;
  onEdit: (record: ExpenseRecord) => void;
  onDelete: (record: ExpenseRecord) => void;
  onViewReceipt: (record: ExpenseRecord) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function ExpensesTable({ onView, onEdit, onDelete, onViewReceipt, canEdit, canDelete }: ExpensesTableProps) {
  const [expensesData, setExpensesData] = useState<ExpenseRecord[]>(mockExpensesData);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'amount' | 'date' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Maintenance': 'bg-orange-100 text-orange-800',
      'Utilities': 'bg-blue-100 text-blue-800',
      'Salaries': 'bg-purple-100 text-purple-800',
      'Supplies': 'bg-green-100 text-green-800',
      'Insurance': 'bg-red-100 text-red-800',
      'Transportation': 'bg-yellow-100 text-yellow-800',
      'Office': 'bg-indigo-100 text-indigo-800',
      'Others': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.Others;
  };

  const filteredAndSortedData = expensesData
    .filter(record => {
      const matchesSearch = 
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.expenseId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'amount' | 'date' | 'category') => {
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
          Expenses Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search expenses, vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Maintenance">🔧 Maintenance</SelectItem>
              <SelectItem value="Utilities">⚡ Utilities</SelectItem>
              <SelectItem value="Salaries">👥 Salaries</SelectItem>
              <SelectItem value="Supplies">📦 Supplies</SelectItem>
              <SelectItem value="Insurance">🛡️ Insurance</SelectItem>
              <SelectItem value="Transportation">🚗 Transportation</SelectItem>
              <SelectItem value="Office">🏢 Office</SelectItem>
              <SelectItem value="Others">📋 Others</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense ID</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('category')} className="h-auto p-0 font-medium">
                    Category
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('date')} className="h-auto p-0 font-medium">
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('amount')} className="h-auto p-0 font-medium">
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.expenseId}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(record.category)}>
                      {record.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{record.description}</p>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground truncate">{record.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">₹{record.amount.toLocaleString()}</TableCell>
                  <TableCell>{record.paidTo}</TableCell>
                  <TableCell>{record.paymentMode}</TableCell>
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
                      <Button size="sm" variant="outline" onClick={() => onView(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit ? (
                        <Button size="sm" variant="outline" onClick={() => onEdit(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="You don't have permission to edit expenses">
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                      {record.receiptFile && (
                        <Button size="sm" variant="outline" onClick={() => onViewReceipt(record)}>
                          <Receipt className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete ? (
                        <Button size="sm" variant="outline" onClick={() => onDelete(record)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="You don't have permission to delete expenses">
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
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>Showing {filteredAndSortedData.length} of {expensesData.length} expense records</span>
          <span>
            Total: ₹{filteredAndSortedData.reduce((sum, record) => sum + record.amount, 0).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}