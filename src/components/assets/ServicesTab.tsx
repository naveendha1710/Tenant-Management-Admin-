import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { DollarSign, Calendar, AlertCircle, Plus, Search, Pencil, Trash2, FileText, ChevronRight, Eye, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

interface ServiceRecord {
  id: string;
  asset_id: string;
  service_date: string;
  service_type: string | null;
  service_provider: string | null;
  service_description: string | null;
  service_cost: number | null;
  next_service_date: string | null;
  performed_by: string | null;
  remarks: string | null;
  invoice_number: string | null;
  po_number: string | null;
  warranty_extended: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Asset {
  asset_id: string;
  asset_name: string;
}

interface ServiceFormData {
  asset_id: string;
  service_date: string;
  service_type: string;
  service_provider: string;
  service_description: string;
  service_cost: string;
  next_service_date: string;
  performed_by: string;
  invoice_number: string;
  po_number: string;
  remarks: string;
  warranty_extended: boolean;
}

const SERVICE_TYPES = ['Maintenance', 'Repair', 'Inspection', 'Calibration', 'Upgrade', 'Other'];

export default function ServicesTab() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'asset' | 'details'>('asset');
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetPage, setAssetPage] = useState(1);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const itemsPerPage = 10;
  const { toast } = useToast();

  const [formData, setFormData] = useState<ServiceFormData>({
    asset_id: '',
    service_date: '',
    service_type: '',
    service_provider: '',
    service_description: '',
    service_cost: '',
    next_service_date: '',
    performed_by: '',
    invoice_number: '',
    po_number: '',
    remarks: '',
    warranty_extended: false,
  });

  useEffect(() => {
    loadServices();
    loadVendors();
  }, []);

  useEffect(() => {
    if (isModalOpen && assets.length === 0) {
      loadAssets();
    }
  }, [isModalOpen]);

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name')
        .eq('status', 'active')
        .order('vendor_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asset_service_records')
        .select('*')
        .order('service_date', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('asset_id, asset_name')
        .order('asset_name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const calculateStats = () => {
    const totalServices = services.length;
    const totalCost = services.reduce((sum, s) => sum + (s.service_cost || 0), 0);
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const upcomingServices = services.filter(s => {
      if (!s.next_service_date) return false;
      const nextDate = new Date(s.next_service_date);
      return nextDate >= today && nextDate <= thirtyDaysFromNow;
    }).length;

    const overdueServices = services.filter(s => {
      if (!s.next_service_date) return false;
      return new Date(s.next_service_date) < today;
    }).length;

    return { totalServices, totalCost, upcomingServices, overdueServices };
  };

  const stats = calculateStats();

  const filteredServices = services.filter(service => {
    const matchesSearch = 
      service.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.service_provider?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (service.service_type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (service.performed_by?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesType = serviceTypeFilter === 'all' || service.service_type === serviceTypeFilter;

    const matchesDateRange = 
      (!dateFrom || service.service_date >= dateFrom) &&
      (!dateTo || service.service_date <= dateTo);

    return matchesSearch && matchesType && matchesDateRange;
  });

  const filteredAssets = assets.filter(asset =>
    asset.asset_id.toLowerCase().includes(assetSearch.toLowerCase()) ||
    asset.asset_name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  const assetTotalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const assetStartIndex = (assetPage - 1) * itemsPerPage;
  const paginatedAssets = filteredAssets.slice(assetStartIndex, assetStartIndex + itemsPerPage);

  const handleOpenModal = (service?: ServiceRecord) => {
    if (service) {
      setEditingService(service);
      setFormData({
        asset_id: service.asset_id,
        service_date: service.service_date,
        service_type: service.service_type || '',
        service_provider: service.service_provider || '',
        service_description: service.service_description || '',
        service_cost: service.service_cost?.toString() || '',
        next_service_date: service.next_service_date || '',
        performed_by: service.performed_by || '',
        invoice_number: service.invoice_number || '',
        po_number: service.po_number || '',
        remarks: service.remarks || '',
        warranty_extended: service.warranty_extended || false,
      });
      setModalStep('details');
    } else {
      setEditingService(null);
      setFormData({
        asset_id: '',
        service_date: '',
        service_type: '',
        service_provider: '',
        service_description: '',
        service_cost: '',
        next_service_date: '',
        performed_by: '',
        invoice_number: '',
        po_number: '',
        remarks: '',
        warranty_extended: false,
      });
      setModalStep('asset');
    }
    setAssetSearch('');
    setAssetPage(1);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.asset_id || !formData.service_date) {
      toast({ title: 'Error', description: 'Asset ID and Service Date are required', variant: 'destructive' });
      return;
    }

    try {
      const serviceData = {
        asset_id: formData.asset_id,
        service_date: formData.service_date,
        service_type: formData.service_type || null,
        service_provider: formData.service_provider || null,
        service_description: formData.service_description || null,
        service_cost: formData.service_cost ? parseFloat(formData.service_cost) : null,
        next_service_date: formData.next_service_date || null,
        performed_by: formData.performed_by || null,
        invoice_number: formData.invoice_number || null,
        po_number: formData.po_number || null,
        remarks: formData.remarks || null,
        warranty_extended: formData.warranty_extended,
      };

      if (editingService) {
        const { error } = await supabase
          .from('asset_service_records')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Service record updated successfully' });
      } else {
        const { error } = await supabase
          .from('asset_service_records')
          .insert([serviceData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Service record created successfully' });
      }

      setIsModalOpen(false);
      loadServices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('asset_service_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Service record deleted successfully' });
      setDeleteConfirmId(null);
      loadServices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const downloadServicePDF = async (service: ServiceRecord) => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;
      
      const drawTable = (headers: string[], rows: string[][], startY: number, colWidths: number[]) => {
        let y = startY;
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const startX = 20;
        
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, y, tableWidth, 6, 'FD');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        let x = startX;
        headers.forEach((header, i) => {
          pdf.text(header, x + 2, y + 4);
          x += colWidths[i];
        });
        y += 6;
        
        pdf.setFont('helvetica', 'normal');
        rows.forEach(row => {
          let maxLines = 1;
          row.forEach((cell, i) => {
            const lines = pdf.splitTextToSize(cell, colWidths[i] - 4);
            maxLines = Math.max(maxLines, lines.length);
          });
          const rowHeight = Math.max(5, maxLines * 4);
          
          pdf.rect(startX, y, tableWidth, rowHeight, 'S');
          x = startX;
          row.forEach((cell, i) => {
            const lines = pdf.splitTextToSize(cell, colWidths[i] - 4);
            pdf.text(lines, x + 2, y + 3.5);
            if (i < row.length - 1) {
              pdf.line(x + colWidths[i], y, x + colWidths[i], y + rowHeight);
            }
            x += colWidths[i];
          });
          y += rowHeight;
        });
        
        return y;
      };
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RATHINAM TECHZONE', 20, yPos);
      pdf.setFontSize(12);
      pdf.text('SERVICE RECORD', pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Service ID: ${service.id.slice(-8).toUpperCase()}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 4;
      pdf.text(`Date: ${new Date(service.service_date).toLocaleDateString()}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BASIC INFORMATION', 20, yPos);
      yPos += 5;
      
      const basicInfoRows = [
        ['Asset ID', service.asset_id],
        ['Service Date', new Date(service.service_date).toLocaleDateString()],
        ['Service Type', service.service_type || 'N/A'],
        ['Service Provider', service.service_provider || 'N/A'],
        ['Performed By', service.performed_by || 'N/A']
      ];
      yPos = drawTable(['Field', 'Value'], basicInfoRows, yPos, [60, 110]);
      yPos += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SERVICE DETAILS', 20, yPos);
      yPos += 5;
      
      const serviceRows = [
        ['Description', service.service_description || 'N/A']
      ];
      yPos = drawTable(['Field', 'Value'], serviceRows, yPos, [60, 110]);
      yPos += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FINANCIAL DETAILS', 20, yPos);
      yPos += 5;
      
      const financialRows = [
        ['Service Cost', service.service_cost ? `Rs. ${service.service_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'],
        ['PO Number', service.po_number || 'N/A'],
        ['Invoice Number', service.invoice_number || 'N/A']
      ];
      yPos = drawTable(['Field', 'Value'], financialRows, yPos, [60, 110]);
      yPos += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MAINTENANCE SCHEDULE', 20, yPos);
      yPos += 5;
      
      const scheduleRows = [
        ['Next Service Date', service.next_service_date ? new Date(service.next_service_date).toLocaleDateString() : 'Not Scheduled'],
        ['Warranty Extended', service.warranty_extended ? 'Yes' : 'No']
      ];
      yPos = drawTable(['Field', 'Value'], scheduleRows, yPos, [60, 110]);
      yPos += 6;
      
      if (service.remarks) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REMARKS', 20, yPos);
        yPos += 5;
        
        const remarksRows = [
          ['Remarks', service.remarks]
        ];
        yPos = drawTable(['Field', 'Value'], remarksRows, yPos, [60, 110]);
        yPos += 6;
      }
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      pdf.save(`Service_Record_${service.asset_id}_${service.id.slice(-8)}.pdf`);
      toast({ title: 'Success', description: 'Service record PDF downloaded successfully' });
    } catch (error: any) {
      console.error('Error generating service PDF:', error);
      toast({ title: 'Error', description: 'Failed to generate service PDF', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{stats.totalServices}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">₹{stats.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Services</p>
                <p className="text-xs text-gray-500 mb-1">Next 30 days</p>
                <p className="text-2xl font-bold text-orange-600">{stats.upcomingServices}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Services</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueServices}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Service Records</CardTitle>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {SERVICE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />

              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No service records found</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Date</TableHead>
                        <TableHead>Asset ID</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Cost (₹)</TableHead>
                        <TableHead>Next Service</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>{new Date(service.service_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{service.asset_id}</TableCell>
                          <TableCell>{service.service_type || '-'}</TableCell>
                          <TableCell>{service.service_provider || '-'}</TableCell>
                          <TableCell className="text-right">
                            {service.service_cost ? `₹${service.service_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell>
                            {service.next_service_date ? (
                              <span className={new Date(service.next_service_date) < new Date() ? 'text-red-600 font-semibold' : ''}>
                                {new Date(service.next_service_date).toLocaleDateString()}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingService(service)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadServicePDF(service)}
                                title="Download PDF"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(service)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(service.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredServices.length)} of {filteredServices.length} records
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service Record' : 'Add Service Record'}</DialogTitle>
          </DialogHeader>
          
          {modalStep === 'asset' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search asset ID or name..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssets.map((asset) => (
                      <TableRow key={asset.asset_id}>
                        <TableCell className="font-medium">{asset.asset_id}</TableCell>
                        <TableCell>{asset.asset_name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, asset_id: asset.asset_id });
                              setModalStep('details');
                            }}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-blue-900">Selected Asset: {formData.asset_id}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service Date *</Label>
                    <Input
                      type="date"
                      value={formData.service_date}
                      onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Service Type</Label>
                    <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Service Provider</Label>
                    <Input
                      value={formData.service_provider}
                      onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
                      placeholder="Provider name"
                    />
                  </div>

                  <div>
                    <Label>Performed By (Vendor)</Label>
                    <Select value={formData.performed_by} onValueChange={(v) => setFormData({ ...formData, performed_by: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                              placeholder="Search vendor..."
                              value={vendorSearch}
                              onChange={(e) => setVendorSearch(e.target.value)}
                              className="pl-7 h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {vendors
                            .filter(vendor => vendor.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()))
                            .map(vendor => (
                              <SelectItem key={vendor.id} value={vendor.vendor_name}>{vendor.vendor_name}</SelectItem>
                            ))}
                          {vendors.filter(vendor => vendor.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                            <div className="p-2 text-center text-sm text-gray-500">No vendors found</div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Service Description</Label>
                    <Textarea
                      value={formData.service_description}
                      onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                      placeholder="Describe the service performed"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Service Cost (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.service_cost}
                      onChange={(e) => setFormData({ ...formData, service_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Invoice Number</Label>
                    <Input
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="INV-001"
                    />
                  </div>

                  <div>
                    <Label>PO Number</Label>
                    <Input
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      placeholder="PO-001"
                    />
                  </div>

                  <div>
                    <Label>Next Service Date</Label>
                    <Input
                      type="date"
                      value={formData.next_service_date}
                      onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Remarks</Label>
                    <Textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Additional notes"
                      rows={2}
                    />
                  </div>

                  <div className="col-span-2 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                    <div>
                      <Label className="font-medium">Warranty Extended</Label>
                      <p className="text-xs text-muted-foreground">Was the warranty period extended?</p>
                    </div>
                    <Switch
                      checked={formData.warranty_extended}
                      onCheckedChange={(v) => setFormData({ ...formData, warranty_extended: v })}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Service Dialog */}
      <Dialog open={!!viewingService} onOpenChange={() => setViewingService(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Service Record Details</DialogTitle>
          </DialogHeader>
          {viewingService && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Asset ID</Label>
                  <p className="font-medium">{viewingService.asset_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Date</Label>
                  <p className="font-medium">{new Date(viewingService.service_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Type</Label>
                  <p className="font-medium">{viewingService.service_type || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Provider</Label>
                  <p className="font-medium">{viewingService.service_provider || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Performed By</Label>
                  <p className="font-medium">{viewingService.performed_by || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Cost</Label>
                  <p className="font-medium">
                    {viewingService.service_cost ? `₹${viewingService.service_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Invoice Number</Label>
                  <p className="font-medium">{viewingService.invoice_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">PO Number</Label>
                  <p className="font-medium">{viewingService.po_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Next Service Date</Label>
                  <p className="font-medium">
                    {viewingService.next_service_date ? new Date(viewingService.next_service_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Service Description</Label>
                  <p className="font-medium">{viewingService.service_description || '-'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Remarks</Label>
                  <p className="font-medium">{viewingService.remarks || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Warranty Extended</Label>
                  <p className="font-medium">{viewingService.warranty_extended ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => viewingService && downloadServicePDF(viewingService)}>
              <Printer className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={() => setViewingService(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this service record? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
