import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auditService, type AuditLog } from '@/data/userData';
import { Search, Download, Filter, Activity, User, Calendar, Monitor } from 'lucide-react';

interface AuditLogsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      const loadLogs = async () => {
        const allLogs = await auditService.getAllLogs();
        setLogs(allLogs);
        setFilteredLogs(allLogs);
      };
      loadLogs();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Module filter
    if (moduleFilter !== 'all') {
      filtered = filtered.filter(log => log.module === moduleFilter);
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
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
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
      }
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, moduleFilter, actionFilter, dateFilter]);

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'Login': 'bg-green-100 text-green-800 border-green-200',
      'Logout': 'bg-gray-100 text-gray-800 border-gray-200',
      'Create': 'bg-blue-100 text-blue-800 border-blue-200',
      'Update': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Delete': 'bg-red-100 text-red-800 border-red-200',
      'View': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    for (const [key, color] of Object.entries(colors)) {
      if (action.includes(key)) return color;
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleExport = () => {
    // Simulate export functionality
    const csvContent = [
      'Timestamp,User,Action,Module,Details,IP Address,Device',
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.userName}","${log.action}","${log.module}","${log.details}","${log.ipAddress}","${log.device}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const modules = [...new Set(logs.map(log => log.module))];
  const actions = [...new Set(logs.map(log => log.action))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit Logs
          </DialogTitle>
          <DialogDescription>
            System activity tracking and user action logs
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Logs</p>
                  <p className="text-lg font-bold">{logs.length}</p>
                </div>
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Activity</p>
                  <p className="text-lg font-bold">
                    {logs.filter(log => 
                      new Date(log.timestamp).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-lg font-bold">
                    {new Set(logs.map(log => log.userId)).size}
                  </p>
                </div>
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Filtered Results</p>
                  <p className="text-lg font-bold">{filteredLogs.length}</p>
                </div>
                <Filter className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(module => (
                <SelectItem key={module} value={module}>{module}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{log.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.module}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm truncate" title={log.details}>
                      {log.details}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.ipAddress}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Monitor className="h-3 w-3" />
                      {log.device}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching the current filters
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};