import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Activity, Search, Eye, Calendar, Users, Database, Filter, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchTerm, actionFilter, dateFilter]);

  const fetchAuditLogs = async () => {
    try {
      // Mock data for demonstration
      const mockLogs = [
        {
          id: '1',
          user_id: 'admin@rathinam.edu',
          action: 'CREATE',
          table_name: 'tenants',
          record_id: 'tenant-001',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date().toISOString(),
          old_values: null,
          new_values: { name: 'TechStart Solutions', email: 'contact@techstart.com' }
        },
        {
          id: '2',
          user_id: 'finance@rathinam.edu',
          action: 'UPDATE',
          table_name: 'invoices',
          record_id: 'inv-001',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          old_values: { status: 'pending' },
          new_values: { status: 'paid' }
        },
        {
          id: '3',
          user_id: 'admin@rathinam.edu',
          action: 'DELETE',
          table_name: 'maintenance_tickets',
          record_id: 'ticket-001',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          old_values: { title: 'AC Repair', status: 'resolved' },
          new_values: null
        },
        {
          id: '4',
          user_id: 'crm@rathinam.edu',
          action: 'LOGIN',
          table_name: 'auth',
          record_id: null,
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 10800000).toISOString(),
          old_values: null,
          new_values: null
        }
      ];
      setAuditLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = auditLogs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action?.toLowerCase() === actionFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.created_at) >= filterDate);
    }

    setFilteredLogs(filtered);
  };

  const getActionColor = (action: string) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800'
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_id || 'System',
        log.action,
        log.table_name,
        log.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Audit logs exported successfully",
    });
  };

  const stats = [
    {
      title: "Total Actions",
      value: auditLogs.length.toString(),
      icon: Activity,
      color: "text-blue-600"
    },
    {
      title: "Today's Actions",
      value: auditLogs.filter(log => {
        const today = new Date();
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === today.toDateString();
      }).length.toString(),
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Unique Users",
      value: new Set(auditLogs.map(log => log.user_id)).size.toString(),
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Tables Modified",
      value: new Set(auditLogs.map(log => log.table_name)).size.toString(),
      icon: Database,
      color: "text-orange-600"
    }
  ];

  return (
    <DashboardLayout 
      title="Audit Logs" 
      subtitle="Track system activities and user actions"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>System Audit Trail</CardTitle>
                <CardDescription>Comprehensive log of all system activities</CardDescription>
              </div>
              <Button onClick={exportLogs}>
                <Download className="mr-2 h-4 w-4" />
                Export Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audit Logs Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length > 0 ? filteredLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(log.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {log.user_id || 'System'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            {log.table_name}
                          </div>
                        </TableCell>
                        <TableCell>{log.ip_address || 'N/A'}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Audit Log Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information about this system action
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Timestamp</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(log.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">User</Label>
                                    <p className="text-sm text-muted-foreground">{log.user_id || 'System'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Action</Label>
                                    <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Resource</Label>
                                    <p className="text-sm text-muted-foreground">{log.table_name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">IP Address</Label>
                                    <p className="text-sm text-muted-foreground">{log.ip_address || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Record ID</Label>
                                    <p className="text-sm text-muted-foreground">{log.record_id || 'N/A'}</p>
                                  </div>
                                </div>
                                
                                {log.old_values && (
                                  <div>
                                    <Label className="text-sm font-medium">Previous Values</Label>
                                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                      {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {log.new_values && (
                                  <div>
                                    <Label className="text-sm font-medium">New Values</Label>
                                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {log.user_agent && (
                                  <div>
                                    <Label className="text-sm font-medium">User Agent</Label>
                                    <p className="text-xs text-muted-foreground break-all">{log.user_agent}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No audit logs found matching your criteria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}