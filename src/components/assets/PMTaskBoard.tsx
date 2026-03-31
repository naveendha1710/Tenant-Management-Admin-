import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { pmTaskService, type PMTask, type PMTaskFilters } from '@/services/pmTaskService';
import { Calendar, Download, UserPlus, Filter, RefreshCw, AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '@/components/ui/pagination';

export const PMTaskBoard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [auditors, setAuditors] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    due_today: 0,
    upcoming: 0,
    unassigned: 0,
    assigned: 0
  });

  // Filters
  const [filters, setFilters] = useState<PMTaskFilters>({
    date: new Date().toISOString().split('T')[0],
    show_only_unassigned: false
  });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Bulk assignment dialog
  const [bulkAssignDialog, setBulkAssignDialog] = useState(false);
  const [bulkAssignUser, setBulkAssignUser] = useState('');
  const [bulkAssignNotes, setBulkAssignNotes] = useState('');
  const [viewTaskDialog, setViewTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PMTask | null>(null);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load initial data
  useEffect(() => {
    loadAuditors();
    loadTenants();
    loadBuildings();
    loadFloors();
    loadCategories();
  }, []);

  // Load tasks when filters change
  useEffect(() => {
    loadTasks();
    loadStats();
  }, [filters, categoryFilter, subCategoryFilter, typeFilter]);

  // Update sub-categories when category changes
  useEffect(() => {
    if (categoryFilter !== 'all') {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === categoryFilter);
      const subTypes = category?.subTypes?.map((st: any) => st.name) || [];
      setSubCategories(subTypes);
    } else {
      setSubCategories([]);
      setSubCategoryFilter('all');
      setTypes([]);
      setTypeFilter('all');
    }
  }, [categoryFilter]);

  // Update types when sub-category changes
  useEffect(() => {
    if (subCategoryFilter !== 'all') {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === categoryFilter);
      const subCategory = category?.subTypes?.find((st: any) => st.name === subCategoryFilter);
      const subSubTypes = subCategory?.subTypes?.map((sst: any) => sst.name) || [];
      setTypes(subSubTypes);
    } else {
      setTypes([]);
      setTypeFilter('all');
    }
  }, [subCategoryFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await pmTaskService.getPMTasks(filters);
      
      // Apply client-side filters for category, sub-category, and type
      let filteredData = data;
      
      if (categoryFilter !== 'all' || subCategoryFilter !== 'all' || typeFilter !== 'all') {
        const assetIds = data.map(t => t.asset_id);
        const { data: assets } = await supabase
          .from('assets')
          .select('id, asset_category, asset_sub_category, asset_type')
          .in('id', assetIds);
        
        const assetMap = new Map(assets?.map(a => [a.id, a]) || []);
        
        filteredData = data.filter(task => {
          const asset = assetMap.get(task.asset_id);
          if (!asset) return false;
          
          if (categoryFilter !== 'all' && asset.asset_category !== categoryFilter) return false;
          if (subCategoryFilter !== 'all' && asset.asset_sub_category !== subCategoryFilter) return false;
          if (typeFilter !== 'all' && asset.asset_type !== typeFilter) return false;
          
          return true;
        });
      }
      
      setTasks(filteredData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load PM tasks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await pmTaskService.getPMTaskStats(filters.date);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadAuditors = async () => {
    try {
      const data = await pmTaskService.getAvailableAuditors();
      setAuditors(data);
    } catch (error) {
      console.error('Failed to load auditors:', error);
    }
  };

  const loadTenants = async () => {
    try {
      const { data } = await supabase.from('tenants').select('id, company').order('company');
      setTenants(data || []);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  };

  const loadBuildings = async () => {
    try {
      const { data } = await supabase.from('buildings').select('id, name').order('name');
      setBuildings(data || []);
    } catch (error) {
      console.error('Failed to load buildings:', error);
    }
  };

  const loadFloors = async () => {
    try {
      const { data } = await supabase
        .from('floors')
        .select('id, floor_name, floor_number, building_id')
        .order('floor_number');
      setFloors(data || []);
    } catch (error) {
      console.error('Failed to load floors:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data: cats } = await supabase
        .from('form_dropdowns')
        .select('*')
        .eq('form_type', 'asset')
        .order('name');

      const { data: subs } = await supabase
        .from('form_subcategories')
        .select('*')
        .eq('form_type', 'asset');

      const { data: subSubs } = await supabase
        .from('form_sub_subcategories')
        .select('*')
        .eq('form_type', 'asset');

      const configData = cats?.map(cat => ({
        name: cat.name,
        subTypes: subs?.filter(s => s.category_id === cat.id).map(s => ({
          name: s.name,
          id: s.id,
          subTypes: subSubs?.filter(ss => ss.subcategory_id === s.id).map(ss => ({
            name: ss.name
          })) || []
        })) || []
      })) || [];

      setCategories(configData.map(c => c.name));
      (window as any).assetDropdownConfig = configData;
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map(t => t.asset_id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleSelectTask = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedTasks(newSelected);
  };

  const handleAssignTask = async (assetId: string, userId: string) => {
    try {
      await pmTaskService.assignTask(assetId, userId, undefined, filters.date);
      toast({
        title: 'Success',
        description: 'Task assigned successfully'
      });
      loadTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign task',
        variant: 'destructive'
      });
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignUser || selectedTasks.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select tasks and an auditor',
        variant: 'destructive'
      });
      return;
    }

    try {
      await pmTaskService.bulkAssignTasks({
        asset_ids: Array.from(selectedTasks),
        assigned_to: bulkAssignUser,
        assignment_notes: bulkAssignNotes,
        task_date: filters.date
      });
      
      toast({
        title: 'Success',
        description: `${selectedTasks.size} tasks assigned successfully`
      });
      
      setBulkAssignDialog(false);
      setBulkAssignUser('');
      setBulkAssignNotes('');
      setSelectedTasks(new Set());
      loadTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign tasks',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async () => {
    try {
      const csv = await pmTaskService.exportPMTasks(filters);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pm-tasks-${filters.date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Tasks exported successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export tasks',
        variant: 'destructive'
      });
    }
  };

  const handleStartAudit = (task: PMTask) => {
    navigate(`/assets/physical-audit?asset_id=${task.asset_id}&barcode=${task.barcode}`);
  };

  const handleViewTask = async (task: PMTask) => {
    setSelectedTask(task);
    setEditScheduledDate(task.pm_next_date);
    setEditAssignedTo(task.assigned_to || 'unassigned');
    setViewTaskDialog(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    // Prevent updates if task is completed
    if (selectedTask.task_instance_status === 'COMPLETED') {
      toast({
        title: 'Error',
        description: 'Cannot update a completed task',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Update scheduled date if changed
      if (editScheduledDate !== selectedTask.pm_next_date) {
        await supabase
          .from('preventive_maintenance')
          .update({ pm_next_date: editScheduledDate })
          .eq('asset_id', selectedTask.asset_id);
      }

      // Update assignment if changed
      if (editAssignedTo !== (selectedTask.assigned_to || 'unassigned')) {
        if (editAssignedTo === 'unassigned') {
          await pmTaskService.unassignTask(selectedTask.asset_id, filters.date);
        } else {
          await pmTaskService.assignTask(selectedTask.asset_id, editAssignedTo, undefined, filters.date);
        }
      }

      toast({
        title: 'Success',
        description: 'Task updated successfully'
      });

      setViewTaskDialog(false);
      setSelectedTask(null);
      loadTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (task: PMTask) => {
    // If task is completed, show completed badge
    if (task.task_instance_status === 'COMPLETED') {
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    }
    
    switch (task.status) {
      case 'OVERDUE':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue {task.days_overdue ? `(${task.days_overdue}d)` : ''}
          </Badge>
        );
      case 'DUE_TODAY':
        return (
          <Badge variant="default" className="gap-1 bg-yellow-500">
            <Clock className="h-3 w-3" />
            Due Today
          </Badge>
        );
      case 'UPCOMING':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Upcoming
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.due_today}</div>
            <p className="text-xs text-muted-foreground">Due Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{stats.unassigned}</div>
            <p className="text-xs text-muted-foreground">Unassigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="DUE_TODAY">Due Today</SelectItem>
                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sub-Category</Label>
              <Select
                value={subCategoryFilter}
                onValueChange={setSubCategoryFilter}
                disabled={categoryFilter === 'all'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Categories</SelectItem>
                  {subCategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
                disabled={subCategoryFilter === 'all'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tenant</Label>
              <Select
                value={filters.tenant_id || 'all'}
                onValueChange={(value) => setFilters({ ...filters, tenant_id: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Building</Label>
              <Select
                value={filters.building_id || 'all'}
                onValueChange={(value) => setFilters({ ...filters, building_id: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Floor</Label>
              <Select
                value={filters.floor || 'all'}
                onValueChange={(value) => setFilters({ ...filters, floor: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors
                    .filter(f => !filters.building_id || f.building_id === filters.building_id)
                    .map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.floor_name || f.floor_number}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unassigned"
                  checked={filters.show_only_unassigned}
                  onCheckedChange={(checked) => setFilters({ ...filters, show_only_unassigned: checked as boolean })}
                />
                <Label htmlFor="unassigned" className="text-sm cursor-pointer">
                  Only Unassigned
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={loadTasks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {selectedTasks.size} task(s) selected
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setBulkAssignDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Bulk Assign
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedTasks(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>PM Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No PM tasks found for the selected filters
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <Checkbox
                          checked={selectedTasks.size === tasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length && tasks.length > 0}
                          onCheckedChange={(checked) => {
                            const paginatedTasks = tasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                            if (checked) {
                              const newSelected = new Set(selectedTasks);
                              paginatedTasks.forEach(t => newSelected.add(t.asset_id));
                              setSelectedTasks(newSelected);
                            } else {
                              const newSelected = new Set(selectedTasks);
                              paginatedTasks.forEach(t => newSelected.delete(t.asset_id));
                              setSelectedTasks(newSelected);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-2">Asset ID</th>
                      <th className="text-left p-2">Asset Name</th>
                      <th className="text-left p-2">Location</th>
                      <th className="text-left p-2">Building</th>
                      <th className="text-left p-2">PM Date</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Assigned To</th>
                      <th className="text-left p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((task) => (
                      <tr key={task.asset_id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedTasks.has(task.asset_id)}
                            onCheckedChange={(checked) => handleSelectTask(task.asset_id, checked as boolean)}
                          />
                        </td>
                        <td className="p-2 font-mono text-sm">{task.asset_code}</td>
                        <td className="p-2">{task.asset_name}</td>
                        <td className="p-2 text-sm">{task.location}</td>
                        <td className="p-2 text-sm">{task.building_name}</td>
                        <td className="p-2 text-sm">{task.pm_next_date}</td>
                        <td className="p-2">{getStatusBadge(task)}</td>
                        <td className="p-2">
                          {task.task_instance_status === 'COMPLETED' ? (
                            <span className="text-sm text-gray-500">{task.assigned_to_name || 'Unassigned'}</span>
                          ) : (
                            <Select
                              value={task.assigned_to || 'unassigned'}
                              onValueChange={(value) => {
                                if (value !== 'unassigned') {
                                  handleAssignTask(task.asset_id, value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {auditors.map(auditor => (
                                  <SelectItem key={auditor.id} value={auditor.id}>
                                    {auditor.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTask(task)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {Math.ceil(tasks.length / itemsPerPage) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, tasks.length)} of {tasks.length} tasks
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(tasks.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    showControls
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Assignment Dialog */}
      <Dialog open={bulkAssignDialog} onOpenChange={setBulkAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Tasks</DialogTitle>
            <DialogDescription>
              Assign {selectedTasks.size} selected task(s) to an auditor
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Auditor</Label>
              <Select value={bulkAssignUser} onValueChange={setBulkAssignUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose auditor" />
                </SelectTrigger>
                <SelectContent>
                  {auditors.map(auditor => (
                    <SelectItem key={auditor.id} value={auditor.id}>
                      {auditor.name} ({auditor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assignment Notes (Optional)</Label>
              <Textarea
                placeholder="Add any special instructions..."
                value={bulkAssignNotes}
                onChange={(e) => setBulkAssignNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssign}>
              Assign Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Task Dialog */}
      <Dialog open={viewTaskDialog} onOpenChange={setViewTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View and edit PM task information
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              {/* Asset Information - Read Only */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">Asset ID</Label>
                  <p className="text-sm font-mono font-semibold">{selectedTask.asset_code}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Asset Name</Label>
                  <p className="text-sm font-semibold">{selectedTask.asset_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Category</Label>
                  <p className="text-sm">{selectedTask.asset_category || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Sub-Category</Label>
                  <p className="text-sm">{selectedTask.asset_sub_category || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Type</Label>
                  <p className="text-sm">{selectedTask.asset_type || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Location</Label>
                  <p className="text-sm">{selectedTask.location}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Building</Label>
                  <p className="text-sm">{selectedTask.building_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Tenant</Label>
                  <p className="text-sm">{selectedTask.tenant_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTask)}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Frequency</Label>
                  <p className="text-sm">{selectedTask.pm_frequency_days} days</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 pt-4 border-t">
                {selectedTask.task_instance_status === 'COMPLETED' ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">
                      This task is completed and cannot be edited
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Scheduled Date</Label>
                      <Input
                        type="date"
                        value={editScheduledDate}
                        onChange={(e) => setEditScheduledDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Assigned To</Label>
                      <Select value={editAssignedTo} onValueChange={setEditAssignedTo}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {auditors.map(auditor => (
                            <SelectItem key={auditor.id} value={auditor.id}>
                              {auditor.name} ({auditor.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTaskDialog(false)}>
              {selectedTask?.task_instance_status === 'COMPLETED' ? 'Close' : 'Cancel'}
            </Button>
            {selectedTask?.task_instance_status !== 'COMPLETED' && (
              <Button onClick={handleUpdateTask}>
                Update Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
