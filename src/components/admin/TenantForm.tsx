import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, User, Building, CreditCard, FileText, Plus, Trash2, TrendingUp, Upload, X, Eye, Wrench, Settings, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { companyGroupService } from '@/services/companyGroupService';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { numberToWords } from '@/utils/numberToWords';

// Module-level storage to persist activeTab across component remounts
const activeTabStorage = new Map<string, string>();

interface EscalationEntry {
  id: string;
  date: string;
  percentage: number;
  calculatedRent?: number;
  floorWiseEscalations?: Array<{
    floorId: string;
    floorName: string;
    currentRent: number;
    newRent: number;
    percentage: number;
  }>;
}

interface MaintenanceCharge {
  id: string;
  floorId: string;
  floorName: string;
  sqft: number;
  ratePerSqft: number;
  isIncludedInRent: boolean;
}

interface GeneralCharge {
  id: string;
  chargeName: string;
  amount: number;
  dueDate: string;
}

interface ServiceCharge {
  serviceNames: string[];
  amount: number;
  isIncludedInRent: boolean;
}

interface TenantFormProps {
  tenant?: any;
  agreement?: any;
  agreementIndex?: number;
  mode?: 'full' | 'agreement-only' | 'personal-only';
  onSubmit: (tenantData: any) => void;
  onCancel: () => void;
  defaultCompanyGroup?: string;
  onAssignSpace?: (tenant: any) => void;
  isAddingNew?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({ tenant, agreement, agreementIndex, mode = 'full', onSubmit, onCancel, defaultCompanyGroup, onAssignSpace, isAddingNew = false }) => {
  const { toast } = useToast();
  
  const formKey = isAddingNew ? 'tenant-form-new' : `tenant-form-${tenant?.id || 'new'}`;
  
  const storedTab = activeTabStorage.get(formKey);
  const initialTab = storedTab || (mode === 'agreement-only' ? 'agreement' : 'personal');
  const activeTabRef = useRef<string>(initialTab);
  const [activeTab, setActiveTabState] = useState(initialTab);
  
  const setActiveTab = (tab: string) => {
    activeTabRef.current = tab;
    activeTabStorage.set(formKey, tab);
    setActiveTabState(tab);
  };
  
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (activeTabRef.current !== activeTab && activeTabRef.current !== 'personal') {
      setActiveTabState(activeTabRef.current);
    }
  }, [tenant?.id]);
  const [isRentManuallyEdited, setIsRentManuallyEdited] = useState(false);
  const [companyGroups, setCompanyGroups] = useState<any[]>([]);
  const [maintenanceCategories, setMaintenanceCategories] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    company: tenant?.company || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    phoneNumbers: tenant?.phoneNumbers || [tenant?.phone || ''],
    password: tenant?.password || 'admin123',
    address: tenant?.address || '',
    idProof: tenant?.idProof || '',
    isGstCompany: tenant?.isGstCompany ?? tenant?.is_gst_company ?? false,
    gstNumber: tenant?.gstNumber || tenant?.gst_number || '',
    tanNumber: tenant?.tanNumber || tenant?.tan_number || '',
    panNumber: tenant?.panNumber || tenant?.pan_number || '',
    cinNumber: tenant?.cinNumber || tenant?.cin_number || '',
    rentAmount: tenant?.rentAmount || '',
    securityDeposit: tenant?.securityDeposit || '',
    paymentCycle: tenant?.paymentCycle || 'Monthly',
    status: tenant?.status || 'Pending Move-In',
    companyGroup: tenant?.companyGroup || defaultCompanyGroup || '',
    leaseAgreementDate: tenant?.leaseAgreementDate || '',
    operationDate: tenant?.operationDate || '',
    rentCommencementDate: tenant?.rentCommencementDate || '',
    lockInPeriod: tenant?.lockInPeriod || '',
    leaseTenure: tenant?.leaseTenure || '',
    leaseEndDate: tenant?.leaseEndDate || ''
  });

  const [spaceAssignments, setSpaceAssignments] = useState<any[]>(tenant?.spaceAssignments || []);

  const [escalations, setEscalations] = useState<EscalationEntry[]>(tenant?.escalations || []);
  const [initialEscalations, setInitialEscalations] = useState<EscalationEntry[]>(escalations);

  const [maintenanceCharges, setMaintenanceCharges] = useState<MaintenanceCharge[]>(tenant?.maintenanceCharges || []);
  const [initialMaintenanceCharges, setInitialMaintenanceCharges] = useState<MaintenanceCharge[]>(maintenanceCharges);

  const [generalCharges, setGeneralCharges] = useState<GeneralCharge[]>(tenant?.generalCharges || []);
  const [initialGeneralCharges, setInitialGeneralCharges] = useState<GeneralCharge[]>(generalCharges);

  const [serviceCharge, setServiceCharge] = useState<ServiceCharge>(tenant?.serviceCharge || { serviceNames: [], amount: 0, isIncludedInRent: false });
  const [initialServiceCharge, setInitialServiceCharge] = useState<ServiceCharge>(serviceCharge);
  const [serviceChargeOptions, setServiceChargeOptions] = useState<string[]>([]);

  const [documents, setDocuments] = useState<any[]>(tenant?.documents || []);
  const [initialDocuments, setInitialDocuments] = useState<any[]>(documents);
  const [uploading, setUploading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [hardCopyLocation, setHardCopyLocation] = useState({
    location: '',
    building: '',
    floor: '',
    roomNo: '',
    rack: ''
  });
  const [chargeCategories, setChargeCategories] = useState<string[]>([]);
  const [categoryReloadKey, setCategoryReloadKey] = useState(0);
  const [isRecurringEscalationOpen, setIsRecurringEscalationOpen] = useState(false);
  const [recurringEscalation, setRecurringEscalation] = useState<{ startDate: string; percentage: number; years: number; selectedFloors: string[] }>({ startDate: '', percentage: 0, years: 1, selectedFloors: [] });
  const [isEscalationWarningOpen, setIsEscalationWarningOpen] = useState(false);
  const [pendingEscalationAction, setPendingEscalationAction] = useState<(() => void) | null>(null);
  const [isChargeCategoryOpen, setIsChargeCategoryOpen] = useState(false);
  const [newChargeCategory, setNewChargeCategory] = useState('');
  const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false);

  useEffect(() => {
    const loadCompanyGroups = async () => {
      try {
        const groups = await companyGroupService.getAllCompanyGroups();
        setCompanyGroups(groups);
      } catch (error) {
        console.error('Failed to load company groups:', error);
      }
    };
    loadCompanyGroups();

    const loadMaintenanceCategories = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'maintenance_categories')
          .single();
        if (data?.value) {
          setMaintenanceCategories(data.value);
        }
      } catch (error) {
        console.error('Failed to load maintenance categories:', error);
      }
    };
    loadMaintenanceCategories();

    const loadChargeCategories = async () => {
      try {
        const { data } = await supabase
          .from('form_dropdowns')
          .select('name')
          .eq('form_type', 'general_charges')
          .order('name');
        if (data && data.length > 0) {
          setChargeCategories(data.map(d => d.name));
        } else {
          const defaultCategories = ['Lift AMC', 'Generator AMC', 'Fire Safety AMC', 'AC AMC', 'Pest Control', 'Water Tank Cleaning', 'Security Charges', 'Parking Charges', 'Other'];
          setChargeCategories(defaultCategories);
        }
      } catch (error) {
        console.error('Failed to load charge categories:', error);
      }
    };
    loadChargeCategories();
    const loadServiceChargeOptions = async () => {
      try {
        const { data } = await supabase
          .from('form_dropdowns')
          .select('name')
          .eq('form_type', 'service_charges')
          .order('name');
        if (data) {
          setServiceChargeOptions(data.map(d => d.name));
        }
      } catch (error) {
        console.error('Failed to load service charge options:', error);
      }
    };
    loadServiceChargeOptions();
  }, [categoryReloadKey]);

  useEffect(() => {
    const dataSource = agreement || tenant;
    if (!dataSource) return;
    
    const currentFormData = {
      name: tenant?.name || '',
      company: tenant?.company || '',
      email: tenant?.email || '',
      phone: tenant?.phone || '',
      phoneNumbers: tenant?.phoneNumbers || [tenant?.phone || ''],
      password: tenant?.password || 'admin123',
      address: tenant?.address || '',
      idProof: tenant?.idProof || '',
      isGstCompany: tenant?.isGstCompany ?? tenant?.is_gst_company ?? false,
      gstNumber: tenant?.gstNumber || tenant?.gst_number || '',
      tanNumber: tenant?.tanNumber || tenant?.tan_number || '',
      panNumber: tenant?.panNumber || tenant?.pan_number || '',
      cinNumber: tenant?.cinNumber || tenant?.cin_number || '',
      rentAmount: agreementIndex === -1 ? '' : (dataSource?.rent_amount || dataSource?.rentAmount || ''),
      securityDeposit: agreementIndex === -1 ? '' : (dataSource?.security_deposit || dataSource?.securityDeposit || ''),
      paymentCycle: agreementIndex === -1 ? 'Monthly' : (dataSource?.payment_cycle || dataSource?.paymentCycle || 'Monthly'),
      status: agreementIndex === -1 ? 'Pending Move-In' : (dataSource?.status || 'Pending Move-In'),
      companyGroup: tenant?.companyGroup || defaultCompanyGroup || '',
      leaseAgreementDate: agreementIndex === -1 ? '' : (dataSource?.lease_agreement_date || dataSource?.leaseAgreementDate || ''),
      operationDate: agreementIndex === -1 ? '' : (dataSource?.operation_date || dataSource?.operationDate || ''),
      rentCommencementDate: agreementIndex === -1 ? '' : (dataSource?.rent_commencement_date || dataSource?.rentCommencementDate || ''),
      lockInPeriod: agreementIndex === -1 ? '' : (dataSource?.lock_in_period || dataSource?.lockInPeriod || ''),
      leaseTenure: agreementIndex === -1 ? '' : (dataSource?.lease_tenure || dataSource?.leaseTenure || ''),
      leaseEndDate: agreementIndex === -1 ? '' : (dataSource?.lease_end_date || dataSource?.leaseEndDate || '')
    };
    
    setFormData(currentFormData);
    setInitialData(currentFormData);
    
    const newSpaceAssignments = agreementIndex === -1 ? [] : (dataSource?.space_assignments || dataSource?.spaceAssignments || []);
    setSpaceAssignments(newSpaceAssignments);
    
    const newEscalations = agreementIndex === -1 ? [] : (dataSource?.escalations || []);
    setEscalations(newEscalations);
    setInitialEscalations(newEscalations);
    
    const newDocuments = agreementIndex === -1 ? [] : (dataSource?.documents || []);
    setDocuments(newDocuments);
    setInitialDocuments(newDocuments);
    
    const newMaintenanceCharges = agreementIndex === -1 ? [] : (dataSource?.maintenance_charges || dataSource?.maintenanceCharges || []);
    setMaintenanceCharges(newMaintenanceCharges);
    setInitialMaintenanceCharges(newMaintenanceCharges);
    
    const newGeneralCharges = agreementIndex === -1 ? [] : (dataSource?.general_charges || dataSource?.generalCharges || []);
    setGeneralCharges(newGeneralCharges);
    setInitialGeneralCharges(newGeneralCharges);
    
    const newServiceCharge = agreementIndex === -1 ? { serviceNames: [], amount: 0, isIncludedInRent: false } : (dataSource?.service_charge || dataSource?.serviceCharge || { serviceNames: [], amount: 0, isIncludedInRent: false });
    setServiceCharge(newServiceCharge);
    setInitialServiceCharge(newServiceCharge);
    
    setIsRentManuallyEdited(false);
  }, [tenant?.id, agreement?.id, agreementIndex]);

  useEffect(() => {
    if (tenant?.spaceAssignments && !isRentManuallyEdited) {
      const prevAssignmentsStr = JSON.stringify(spaceAssignments);
      const newAssignmentsStr = JSON.stringify(tenant.spaceAssignments);
      
      if (prevAssignmentsStr !== newAssignmentsStr) {
        setSpaceAssignments(tenant.spaceAssignments);
        const calculatedRent = tenant.spaceAssignments.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
        if (calculatedRent > 0) {
          handleInputChange('rentAmount', calculatedRent.toString());
        }
        setHasChanges(true);
      }
    }
  }, [tenant?.spaceAssignments, isRentManuallyEdited]);

  useEffect(() => {
    if (!tenant) {
      setHasChanges(true);
      return;
    }
    const dataChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
    const escalationsChanged = JSON.stringify(escalations) !== JSON.stringify(initialEscalations);
    const documentsChanged = JSON.stringify(documents) !== JSON.stringify(initialDocuments);
    const maintenanceChanged = JSON.stringify(maintenanceCharges) !== JSON.stringify(initialMaintenanceCharges);
    const generalChargesChanged = JSON.stringify(generalCharges) !== JSON.stringify(initialGeneralCharges);
    const serviceChargeChanged = JSON.stringify(serviceCharge) !== JSON.stringify(initialServiceCharge);
    const spaceChanged = JSON.stringify(spaceAssignments) !== JSON.stringify(tenant?.spaceAssignments || []);
    setHasChanges(dataChanged || escalationsChanged || documentsChanged || maintenanceChanged || generalChargesChanged || serviceChargeChanged || spaceChanged);
  }, [formData, escalations, documents, maintenanceCharges, generalCharges, serviceCharge, spaceAssignments, initialData, initialEscalations, initialDocuments, initialMaintenanceCharges, initialGeneralCharges, initialServiceCharge, tenant]);

  const allTabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'agreement', label: 'Lease Agreement Details', icon: FileText },
    { id: 'space', label: 'Space Assignment', icon: Building },
    { id: 'lease', label: 'Basic Lease Information', icon: CreditCard },
    { id: 'charges', label: 'Maintenance & General Charges', icon: Wrench },
    { id: 'escalation', label: 'Rent Escalation Schedule', icon: TrendingUp },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  const tabs = mode === 'agreement-only' 
    ? allTabs.filter(tab => tab.id !== 'personal')
    : mode === 'personal-only'
    ? allTabs.filter(tab => tab.id === 'personal')
    : allTabs;

  const isAddMode = isAddingNew || (!tenant?.id && !agreement) || agreementIndex === -1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    const isLastTab = currentIndex === tabs.length - 1;
    
    const submitData = {
      ...formData,
      spaceAssignments: spaceAssignments,
      escalations: escalationsWithCalculations,
      documents: documents,
      maintenanceCharges: maintenanceCharges,
      generalCharges: generalCharges,
      serviceCharge: serviceCharge,
      activeTab: activeTab
    };
    
    // Always save to database
    await onSubmit(submitData);
    
    // Show success toast
    if (tenant?.id || agreement) {
      toast({
        title: "Success",
        description: mode === 'agreement-only' ? "Agreement updated successfully!" : "Tenant updated successfully!",
      });
    }
    
    // Reset initial states after successful save
    setInitialData(formData);
    setInitialEscalations(escalations);
    setInitialDocuments(documents);
    setInitialMaintenanceCharges(maintenanceCharges);
    setInitialGeneralCharges(generalCharges);
    setInitialServiceCharge(serviceCharge);
    setHasChanges(false);
    
    // In agreement-only mode with existing agreement (editing), only close if on last tab
    if (mode === 'agreement-only' && agreementIndex !== null && agreementIndex >= 0 && isLastTab) {
      onCancel();
      return;
    }
    
    // In edit mode (not adding new), stay on current tab
    if (!isAddMode) {
      return;
    }
  }

  const handleCancel = async () => {
    // Clear stored tab when closing form
    activeTabStorage.delete(formKey);
    
    // Only auto-save if editing existing tenant (not for new tenants)
    if (hasChanges && tenant?.id) {
      const submitData = {
        ...formData,
        spaceAssignments: spaceAssignments,
        escalations: escalationsWithCalculations,
        documents: documents,
        maintenanceCharges: maintenanceCharges,
        generalCharges: generalCharges,
        serviceCharge: serviceCharge,
        activeTab: activeTab
      };
      
      try {
        await onSubmit(submitData);
        toast({
          title: "Auto-saved",
          description: "Your changes have been saved",
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
    
    onCancel();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of Array.from(files)) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const companyName = (formData.company || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const response = await fetch(`/api/upload?category=tenant-documents/${companyName}`, {
          method: 'POST',
          body: uploadFormData
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Upload failed:', response.status, text.substring(0, 500));
          alert(`Upload failed (${response.status}): Check if Node.js server is running`);
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          uploadedFiles.push({
            id: Date.now() + Math.random(),
            name: result.file.name,
            url: result.file.url,
            path: result.file.path,
            size: result.file.size,
            uploadedAt: new Date().toISOString()
          });
        }
      }
      setDocuments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Upload failed: ' + error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!confirm('Delete this document?')) return;
    
    try {
      const response = await fetch(`/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.path })
      });

      if (response.ok) {
        const updatedDocuments = documents.filter(d => d.id !== doc.id);
        setDocuments(updatedDocuments);
        
        // Update database immediately if editing existing tenant
        if (tenant?.id) {
          await supabase
            .from('tenants')
            .update({ documents: updatedDocuments })
            .eq('id', tenant.id);
        }
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Delete failed: ' + error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addEscalation = () => {
    const newEscalation: EscalationEntry = {
      id: Date.now().toString(),
      date: '',
      percentage: 0,
      floorWiseEscalations: []
    };
    setEscalations(prev => [...prev, newEscalation]);
  };

  const addFloorToEscalation = (escalationId: string, uniqueId: string) => {
    setEscalations(prev => prev.map(esc => {
      if (esc.id === escalationId) {
        let foundAssignment = null;
        let foundIndex = -1;
        
        // Find the assignment by checking all possible ID formats
        for (let idx = 0; idx < (spaceAssignments || []).length; idx++) {
          const a = spaceAssignments[idx];
          const aUniqueId = a.id || `${a.floorId}_${idx}`;
          if (aUniqueId === uniqueId || a.id === uniqueId || a.floorId === uniqueId) {
            foundAssignment = a;
            foundIndex = idx;
            break;
          }
        }
        
        if (!foundAssignment) return esc;
        
        // Use the actual unique ID for this assignment
        const actualUniqueId = foundAssignment.id || `${foundAssignment.floorId}_${foundIndex}`;
        
        if (esc.floorWiseEscalations?.some(f => f.floorId === actualUniqueId)) return esc;
        
        const sqft = foundAssignment.assignedSqft || foundAssignment.area || 0;
        const category = foundAssignment.category || 'Workspace';
        const newFloor = {
          floorId: actualUniqueId,
          floorName: `${foundAssignment.buildingName || foundAssignment.building || 'Building'} - Floor ${foundAssignment.floorNumber || foundAssignment.floorName || foundAssignment.floor || 'N/A'} - ${sqft} sqft (${category})`,
          currentRent: foundAssignment.amount || 0,
          newRent: foundAssignment.amount || 0,
          percentage: 0
        };
        
        return { ...esc, floorWiseEscalations: [...(esc.floorWiseEscalations || []), newFloor] };
      }
      return esc;
    }));
  }

  const removeFloorFromEscalation = (escalationId: string, floorId: string) => {
    setEscalations(prev => prev.map(esc => {
      if (esc.id === escalationId) {
        return { ...esc, floorWiseEscalations: esc.floorWiseEscalations?.filter(f => f.floorId !== floorId) };
      }
      return esc;
    }));
  };

  const addRecurringEscalations = () => {
    const { startDate, percentage, years, selectedFloors } = recurringEscalation;
    if (!startDate || !percentage || years < 1) return;

    const newEscalations: EscalationEntry[] = [];
    const baseDate = new Date(startDate);

    // Filter space assignments based on selected floors (if any)
    const floorsToEscalate = (selectedFloors && selectedFloors.length > 0)
      ? (spaceAssignments || []).filter((assignment: any, idx: number) => {
          const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
          return selectedFloors.includes(uniqueId);
        })
      : (spaceAssignments || []);

    // Auto-populate floor-wise escalations from filtered space assignments
    const floorWiseEscalations = floorsToEscalate.map((assignment: any, idx: number) => {
      const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
      const sqft = assignment.assignedSqft || assignment.area || 0;
      const category = assignment.category || 'Workspace';
      return {
        floorId: uniqueId,
        floorName: `${assignment.buildingName || assignment.building || 'Building'} - Floor ${assignment.floorNumber || assignment.floorName || assignment.floor || 'N/A'} - ${sqft} sqft (${category})`,
        currentRent: assignment.amount || 0,
        newRent: assignment.amount || 0,
        percentage: percentage
      };
    });

    for (let i = 0; i < years; i++) {
      const escalationDate = new Date(baseDate);
      escalationDate.setFullYear(baseDate.getFullYear() + i);
      
      newEscalations.push({
        id: (Date.now() + i).toString(),
        date: escalationDate.toISOString().split('T')[0],
        percentage: percentage,
        floorWiseEscalations: floorWiseEscalations
      });
    }

    // Check if any new escalation falls between existing dates or conflicts
    const existingDates = escalations.filter(esc => esc.date).map(esc => new Date(esc.date)).sort((a, b) => a.getTime() - b.getTime());
    let hasBetweenDates = false;
    
    if (existingDates.length > 0) {
      for (const newEsc of newEscalations) {
        const newDate = new Date(newEsc.date);
        
        // Check if new date falls between any two existing dates
        for (let i = 0; i < existingDates.length - 1; i++) {
          if (newDate > existingDates[i] && newDate < existingDates[i + 1]) {
            hasBetweenDates = true;
            break;
          }
        }
        
        // Also check if new date is before the first existing date (when there are multiple existing dates)
        if (existingDates.length > 1 && newDate < existingDates[0]) {
          hasBetweenDates = true;
        }
        
        if (hasBetweenDates) break;
      }
    }
    
    if (hasBetweenDates) {
      setPendingEscalationAction(() => () => {
        setEscalations(prev => [...prev, ...newEscalations]);
        setIsRecurringEscalationOpen(false);
        setRecurringEscalation({ startDate: '', percentage: 0, years: 1, selectedFloors: [] });
      });
      setIsEscalationWarningOpen(true);
      return;
    }

    setEscalations(prev => [...prev, ...newEscalations]);
    setIsRecurringEscalationOpen(false);
    setRecurringEscalation({ startDate: '', percentage: 0, years: 1, selectedFloors: [] });
  };

  const removeEscalation = (id: string) => {
    setEscalations(prev => prev.filter(esc => esc.id !== id));
  };

  const updateEscalation = (id: string, field: keyof EscalationEntry, value: any) => {
    // Check if changing date and if it falls between existing dates
    if (field === 'date' && value) {
      const newDate = new Date(value);
      const otherEscalations = escalations.filter(esc => esc.id !== id && esc.date);
      const sortedDates = otherEscalations.map(esc => new Date(esc.date)).sort((a, b) => a.getTime() - b.getTime());
      
      // Check if new date falls between any two existing dates
      let isBetween = false;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        if (newDate > sortedDates[i] && newDate < sortedDates[i + 1]) {
          isBetween = true;
          break;
        }
      }
      
      if (isBetween) {
        setPendingEscalationAction(() => () => {
          setEscalations(prev => prev.map(esc => 
            esc.id === id ? { ...esc, [field]: value } : esc
          ));
        });
        setIsEscalationWarningOpen(true);
        return;
      }
    }
    
    setEscalations(prev => prev.map(esc => 
      esc.id === id ? { ...esc, [field]: value } : esc
    ));
  };

  const updateFloorEscalation = (escalationId: string, floorId: string, percentage: number) => {
    setEscalations(prev => prev.map(esc => {
      if (esc.id === escalationId) {
        const updatedFloors = esc.floorWiseEscalations?.map(floor => 
          floor.floorId === floorId ? { ...floor, percentage } : floor
        );
        return { ...esc, floorWiseEscalations: updatedFloors };
      }
      return esc;
    }));
  };

  const calculateEscalatedRents = () => {
    const baseRent = parseFloat(formData.rentAmount) || 0;
    if (baseRent === 0) return escalations;

    let currentRent = baseRent;
    return escalations.map((esc, index) => {
      if (index === 0) {
        currentRent = baseRent + (baseRent * esc.percentage / 100);
      } else {
        currentRent = currentRent + (currentRent * esc.percentage / 100);
      }
      
      // Calculate floor-wise escalations
      const floorWiseEscalations = esc.floorWiseEscalations?.map((floorEsc) => {
        // Try to find assignment by multiple ID formats for backward compatibility
        const assignment = spaceAssignments?.find((a: any, idx: number) => {
          const uniqueId = a.id || `${a.floorId}_${idx}`;
          const oldId = a.floorId || a.id;
          return uniqueId === floorEsc.floorId || oldId === floorEsc.floorId || a.id === floorEsc.floorId;
        });
        const baseFloorRent = assignment?.amount || 0;
        
        // Calculate current rent by applying all previous escalations for this floor
        let currentFloorRent = baseFloorRent;
        for (let i = 0; i < index; i++) {
          const prevEsc = escalations[i];
          const prevFloorEsc = prevEsc.floorWiseEscalations?.find(f => f.floorId === floorEsc.floorId);
          if (prevFloorEsc && prevFloorEsc.percentage) {
            currentFloorRent = currentFloorRent + (currentFloorRent * prevFloorEsc.percentage / 100);
          }
        }
        
        const newFloorRent = currentFloorRent + (currentFloorRent * floorEsc.percentage / 100);
        
        return {
          ...floorEsc,
          currentRent: Math.round(currentFloorRent),
          newRent: Math.round(newFloorRent)
        };
      }) || [];
      
      return { ...esc, calculatedRent: Math.round(currentRent), floorWiseEscalations };
    });
  };

  const escalationsWithCalculations = calculateEscalatedRents();

  const getCurrentRent = () => {
    const today = new Date();
    const baseRent = parseFloat(formData.rentAmount) || 0;
    
    // Calculate current rent for each floor
    let currentRent = 0;
    let lastAppliedEscalation = null;
    
    for (let idx = 0; idx < spaceAssignments.length; idx++) {
      const assignment = spaceAssignments[idx];
      const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
      const oldId = assignment.floorId || assignment.id;
      let floorRent = assignment.amount || 0;
      
      // Apply all escalations for this floor
      for (const escalation of escalationsWithCalculations) {
        if (!escalation.date) continue;
        const escalationDate = new Date(escalation.date);
        if (escalationDate > today) continue;
        
        // Try to match by multiple ID formats for backward compatibility
        const floorEsc = escalation.floorWiseEscalations?.find(f => 
          f.floorId === uniqueId || f.floorId === oldId || f.floorId === assignment.id
        );
        if (floorEsc && floorEsc.percentage) {
          floorRent = floorRent + (floorRent * floorEsc.percentage / 100);
          lastAppliedEscalation = escalation;
        }
      }
      
      currentRent += floorRent;
    }
    
    // If no escalations applied, use base rent
    if (currentRent === 0) {
      currentRent = baseRent;
    }
    
    return { currentRent: Math.round(currentRent), lastAppliedEscalation };
  };

  const { currentRent, lastAppliedEscalation } = getCurrentRent();

  const addMaintenanceCharge = () => {
    // Show dropdown or message if no space assignments
    if (!spaceAssignments || spaceAssignments.length === 0) {
      alert('Please assign space first before adding maintenance charges');
      return;
    }
  };

  const addFloorToMaintenance = (uniqueId: string) => {
    let foundAssignment = null;
    let foundIndex = -1;
    
    // Extract floorId from uniqueId (format: floorId_index)
    const floorIdFromUniqueId = uniqueId.includes('_') ? uniqueId.split('_')[0] : uniqueId;
    
    for (let idx = 0; idx < (spaceAssignments || []).length; idx++) {
      const a = spaceAssignments[idx];
      const aUniqueId = a.id || `${a.floorId}_${idx}`;
      // Match by floorId first, then by full uniqueId or id
      if (a.floorId === floorIdFromUniqueId || aUniqueId === uniqueId || a.id === uniqueId) {
        foundAssignment = a;
        foundIndex = idx;
        break;
      }
    }
    
    if (!foundAssignment) return;
    
    const actualUniqueId = foundAssignment.id || `${foundAssignment.floorId}_${foundIndex}`;
    
    if (maintenanceCharges.some(m => m.floorId === actualUniqueId)) return;
    
    const sqft = foundAssignment.assignedSqft || foundAssignment.area || 0;
    const category = foundAssignment.category || 'Workspace';
    const newCharge: MaintenanceCharge = {
      id: Date.now().toString(),
      floorId: actualUniqueId,
      floorName: `${foundAssignment.buildingName || foundAssignment.building || 'Building'} - Floor ${foundAssignment.floorNumber || foundAssignment.floorName || foundAssignment.floor || 'N/A'} - ${sqft} sqft (${category})`,
      sqft: sqft,
      ratePerSqft: 0,
      isIncludedInRent: false
    };
    setMaintenanceCharges(prev => [...prev, newCharge]);
  };

  const removeMaintenanceCharge = (id: string) => {
    setMaintenanceCharges(prev => prev.filter(charge => charge.id !== id));
  };

  const updateMaintenanceCharge = (id: string, field: keyof MaintenanceCharge, value: any) => {
    setMaintenanceCharges(prev => prev.map(charge => 
      charge.id === id ? { ...charge, [field]: value } : charge
    ));
  };

  const getTotalMaintenanceCharges = () => {
    return maintenanceCharges.reduce((total, charge) => total + ((charge.sqft || 0) * (charge.ratePerSqft || 0)), 0);
  };

  const getCurrentMonthGeneralCharges = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return generalCharges.reduce((total, charge) => {
      if (charge.dueDate) {
        const dueDate = new Date(charge.dueDate);
        if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
          return total + (charge.amount || 0);
        }
      }
      return total;
    }, 0);
  };

  const getTotalRent = () => {
    const maintenanceTotal = getTotalMaintenanceCharges();
    const generalChargesTotal = getCurrentMonthGeneralCharges();
    return currentRent + maintenanceTotal + generalChargesTotal;
  };

  const getTotalAssignedSqft = () => {
    if (!spaceAssignments || spaceAssignments.length === 0) return 0;
    return spaceAssignments.reduce((total: number, assignment: any) => {
      return total + (parseFloat(assignment.assignedSqft || assignment.area) || 0);
    }, 0);
  };

  const calculateLeaseDuration = () => {
    if (!formData.rentCommencementDate || !formData.leaseEndDate) return null;
    const start = new Date(formData.rentCommencementDate);
    const end = new Date(formData.leaseEndDate);
    if (end <= start) return null;
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
      months--;
      const tempDate = new Date(end.getFullYear(), end.getMonth(), 0);
      days += tempDate.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months, days };
  };

  const addGeneralCharge = () => {
    const newCharge: GeneralCharge = {
      id: Date.now().toString(),
      chargeName: '',
      amount: 0,
      dueDate: ''
    };
    setGeneralCharges(prev => [...prev, newCharge]);
  };

  const removeGeneralCharge = (id: string) => {
    setGeneralCharges(prev => prev.filter(charge => charge.id !== id));
  };

  const updateGeneralCharge = (id: string, field: keyof GeneralCharge, value: any) => {
    setGeneralCharges(prev => prev.map(charge => 
      charge.id === id ? { ...charge, [field]: value } : charge
    ));
  };





  return (
        
        <form onSubmit={handleSubmit} onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }} className="space-y-4 sm:space-y-6">
          {/* Tenant Info Banner - only show when personal info is disabled */}
          {tenant?.id && mode === 'agreement-only' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                <span className="font-medium">Adding agreement for:</span> {tenant.company} ({tenant.name})
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Personal Information */}
          {activeTab === 'personal' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company/Business *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const newPhone = e.target.value;
                      const newPhones = [...formData.phoneNumbers];
                      newPhones[0] = newPhone;
                      setFormData(prev => ({ ...prev, phone: newPhone, phoneNumbers: newPhones }));
                    }}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, ''] }))}
                    title="Add another phone number"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.phoneNumbers.slice(1).map((phoneNum, idx) => (
                  <div key={idx + 1} className="flex gap-2 mt-2">
                    <Input
                      value={phoneNum}
                      onChange={(e) => {
                        const newPhones = [...formData.phoneNumbers];
                        newPhones[idx + 1] = e.target.value;
                        setFormData(prev => ({ ...prev, phoneNumbers: newPhones }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newPhones = formData.phoneNumbers.filter((_, i) => i !== idx + 1);
                        setFormData(prev => ({ ...prev, phoneNumbers: newPhones }));
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="password">Login Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter login password"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="idProof">ID Proof</Label>
                <Input
                  id="idProof"
                  placeholder="e.g., Aadhaar: 1234-5678-9012"
                  value={formData.idProof}
                  onChange={(e) => handleInputChange('idProof', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <Label className="font-medium">Company Type</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.isGstCompany ? 'Tax Company' : 'Non-Tax Company'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isGstCompany', !formData.isGstCompany)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.isGstCompany ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isGstCompany ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  placeholder="e.g., 22AAAAA0000A1Z5"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tanNumber">TAN Number</Label>
                <Input
                  id="tanNumber"
                  placeholder="e.g., ABCD12345E"
                  value={formData.tanNumber}
                  onChange={(e) => handleInputChange('tanNumber', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  placeholder="e.g., ABCDE1234F"
                  value={formData.panNumber}
                  onChange={(e) => handleInputChange('panNumber', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cinNumber">CIN Number</Label>
                <Input
                  id="cinNumber"
                  placeholder="e.g., U12345AB1234PTC123456"
                  value={formData.cinNumber}
                  onChange={(e) => handleInputChange('cinNumber', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          )}

          {/* Space Assignment */}
          {activeTab === 'space' && onAssignSpace && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Space Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Assign building and floor space to this tenant</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {spaceAssignments && spaceAssignments.length > 0 
                        ? `Currently assigned: ${spaceAssignments.length} space(s)` 
                        : 'No space assigned yet'}
                    </p>
                  </div>
                  <Button type="button" onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    onAssignSpace({ ...formData, ...tenant, id: tenant?.id }); 
                  }} disabled={!formData.name || !formData.email}>
                    <Building className="h-4 w-4 mr-2" />
                    {spaceAssignments && spaceAssignments.length > 0 ? 'Manage Space' : 'Assign Space'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Lease Information */}
          {activeTab === 'lease' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Basic Lease Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned Spaces Section */}
              {spaceAssignments && spaceAssignments.length > 0 && (
                <div className="md:col-span-2 mb-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Assigned Spaces</Label>
                    {spaceAssignments.map((assignment: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Building</Label>
                            <p className="text-sm font-medium">{assignment.buildingName || assignment.building || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Floor</Label>
                            <p className="text-sm font-medium">Floor {assignment.floorNumber || assignment.floorName || assignment.floor || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <p className="text-sm font-medium">{assignment.category || assignment.spaceType || 'Workspace'}</p>
                          </div>
                          {assignment.assignmentType === 'seat' ? (
                            <>
                              <div>
                                <Label className="text-xs text-muted-foreground">Seats</Label>
                                <p className="text-sm font-medium">{(assignment.assignedSeats || 0).toLocaleString()} seats ({(assignment.assignedSqft || 0).toLocaleString()} sqft)</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Rate per Seat</Label>
                                <p className="text-sm font-medium">₹{(assignment.ratePerSeat || 0).toLocaleString()}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <Label className="text-xs text-muted-foreground">Area</Label>
                                <p className="text-sm font-medium">{(assignment.assignedSqft || assignment.area || 0).toLocaleString()} sqft</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Rate per Sqft</Label>
                                <p className="text-sm font-medium">₹{(assignment.ratePerSqft || 0).toLocaleString()}</p>
                              </div>
                            </>
                          )}
                          <div>
                            <Label className="text-xs text-muted-foreground">Monthly Rent</Label>
                            <p className="text-sm font-bold text-green-700">₹{(assignment.amount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-900">Total Base Rent</span>
                        <span className="text-xl font-bold text-blue-900">₹{spaceAssignments.reduce((sum: number, a: any) => sum + (a.amount || 0), 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="rentAmount">Base Rent (₹)</Label>
                <Input
                  id="rentAmount"
                  type="number"
                  placeholder="Auto-calculated after unit assignment"
                  value={formData.rentAmount}
                  onFocus={() => setIsRentManuallyEdited(true)}
                  onChange={(e) => handleInputChange('rentAmount', e.target.value)}
                />
                {(() => {
                  const calculatedRent = spaceAssignments?.reduce((sum: number, a: any) => sum + (a.amount || 0), 0) || 0;
                  const currentRent = parseFloat(formData.rentAmount) || 0;
                  const difference = currentRent - calculatedRent;
                  
                  if (calculatedRent > 0 && difference !== 0) {
                    return (
                      <p className={`text-xs mt-1 font-medium ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {difference > 0 ? '+' : ''}₹{difference.toLocaleString()} from calculated rent (₹{calculatedRent.toLocaleString()})
                      </p>
                    );
                  }
                  return <p className="text-xs text-muted-foreground mt-1">Will be calculated automatically after unit assignment</p>;
                })()}
              </div>
              <div>
                <Label>Total Rent (Base + Maintenance + General Charges)</Label>
                <div className="h-10 px-3 py-2 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                  <span className="text-sm text-green-700">Base: ₹{currentRent.toLocaleString()} + Maintenance: ₹{getTotalMaintenanceCharges().toLocaleString()} + General: ₹{getCurrentMonthGeneralCharges().toLocaleString()}</span>
                  <span className="font-bold text-green-800 text-lg">₹{getTotalRent().toLocaleString()}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  placeholder="50000"
                  value={formData.securityDeposit}
                  onChange={(e) => handleInputChange('securityDeposit', e.target.value)}
                />
                {formData.securityDeposit && parseFloat(formData.securityDeposit) > 0 && (
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    {numberToWords(parseFloat(formData.securityDeposit))} Rupees Only
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="paymentCycle">Payment Cycle</Label>
                <Select value={formData.paymentCycle} onValueChange={(value) => handleInputChange('paymentCycle', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => {
                    handleInputChange('status', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending Move-In">Pending Move-In</SelectItem>
                    <SelectItem value="Vacated">Vacated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="companyGroup">Company Group</Label>
                <Select value={formData.companyGroup || ''} onValueChange={(value) => handleInputChange('companyGroup', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Lease Agreement Details */}
          {activeTab === 'agreement' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lease Agreement Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaseAgreementDate">Lease Agreement Date</Label>
                <Input
                  id="leaseAgreementDate"
                  type="date"
                  value={formData.leaseAgreementDate}
                  onChange={(e) => handleInputChange('leaseAgreementDate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">When lease agreement was signed</p>
              </div>
              <div>
                <Label htmlFor="operationDate">Operation Date</Label>
                <Input
                  id="operationDate"
                  type="date"
                  value={formData.operationDate}
                  onChange={(e) => handleInputChange('operationDate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">When tenant actually starts using the building</p>
              </div>
              <div>
                <Label htmlFor="rentCommencementDate">Rent Commencement Date</Label>
                <Input
                  id="rentCommencementDate"
                  type="date"
                  value={formData.rentCommencementDate}
                  onChange={(e) => handleInputChange('rentCommencementDate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">When rent billing starts</p>
              </div>

              <div>
                <Label htmlFor="lockInPeriod">Lock-in Period (months)</Label>
                <Input
                  id="lockInPeriod"
                  type="number"
                  placeholder="e.g., 12"
                  value={formData.lockInPeriod}
                  onChange={(e) => handleInputChange('lockInPeriod', e.target.value)}
                />
                {(() => {
                  if (formData.leaseAgreementDate && formData.lockInPeriod) {
                    const startDate = new Date(formData.leaseAgreementDate);
                    const months = parseInt(formData.lockInPeriod);
                    const endDate = new Date(startDate);
                    endDate.setMonth(startDate.getMonth() + months);
                    const day = String(endDate.getDate()).padStart(2, '0');
                    const month = String(endDate.getMonth() + 1).padStart(2, '0');
                    const year = endDate.getFullYear();
                    return (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        Lock-in ends on: {day}/{month}/{year}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <Label htmlFor="leaseTenure">Lease Tenure (months)</Label>
                <Input
                  id="leaseTenure"
                  type="number"
                  placeholder="e.g., 36"
                  value={formData.leaseTenure}
                  onChange={(e) => handleInputChange('leaseTenure', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="leaseEndDate">Lease End Date</Label>
                <Input
                  id="leaseEndDate"
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={(e) => handleInputChange('leaseEndDate', e.target.value)}
                />
                {(() => {
                  const duration = calculateLeaseDuration();
                  if (duration) {
                    const parts = [];
                    if (duration.years > 0) parts.push(`${duration.years} year${duration.years !== 1 ? 's' : ''}`);
                    if (duration.months > 0) parts.push(`${duration.months} month${duration.months !== 1 ? 's' : ''}`);
                    if (duration.days > 0) parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
                    return (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        Duration: {parts.join(' and ')}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Maintenance Charges */}
          {activeTab === 'charges' && (
          <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Charges (Floor-wise)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {maintenanceCharges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No maintenance charges added</p>
                  <p className="text-sm">Select floors below to add maintenance charges</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {maintenanceCharges.map((charge) => (
                    <div key={charge.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <Label>Floor</Label>
                          <div className="h-10 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md flex items-center">
                            <span className="text-sm font-medium text-gray-700">{charge.floorName}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Rate/Sqft (₹)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={charge.ratePerSqft || ''}
                            onChange={(e) => updateMaintenanceCharge(charge.id, 'ratePerSqft', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Billing Type</Label>
                          <div className="flex items-center gap-2 h-10">
                            <button
                              type="button"
                              onClick={() => updateMaintenanceCharge(charge.id, 'isIncludedInRent', !charge.isIncludedInRent)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                charge.isIncludedInRent ? 'bg-blue-600' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                charge.isIncludedInRent ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                            <span className="text-xs">{charge.isIncludedInRent ? 'Inclusive' : 'Monthly'}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Total Amount</Label>
                          <div className="h-10 px-3 py-2 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                            <span className="font-medium text-green-800">
                              ₹{((charge.sqft || 0) * (charge.ratePerSqft || 0)).toLocaleString()}
                            </span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeMaintenanceCharge(charge.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900">Total Maintenance Charges</span>
                      <span className="text-xl font-bold text-blue-900">₹{getTotalMaintenanceCharges().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {spaceAssignments && spaceAssignments.length > 0 && (
                <div>
                  <Label>Add Floor for Maintenance</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addFloorToMaintenance(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Select floor to add maintenance charge</option>
                    {spaceAssignments.filter((assignment: any, idx: number) => {
                      const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
                      return !maintenanceCharges.some(m => m.floorId === uniqueId);
                    }).map((assignment: any, idx: number) => {
                      const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
                      const sqft = assignment.assignedSqft || assignment.area || 0;
                      const category = assignment.category || 'Workspace';
                      return (
                        <option key={uniqueId} value={uniqueId}>
                          {assignment.buildingName || assignment.building || 'Building'} - Floor {assignment.floorNumber || assignment.floorName || assignment.floor || 'N/A'} - {sqft} sqft ({category})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Charges */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  General Charges
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addGeneralCharge}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Charge
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {generalCharges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No general charges added</p>
                  <p className="text-sm">Click "Add Charge" to add charges like Lift AMC, etc.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generalCharges.map((charge) => {
                    const isDueThisMonth = charge.dueDate && (() => {
                      const today = new Date();
                      const dueDate = new Date(charge.dueDate);
                      return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
                    })();
                    
                    return (
                    <div key={charge.id} className={`border rounded-lg p-4 ${isDueThisMonth ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Charge Name</Label>
                          <Select value={charge.chargeName} onValueChange={(value) => updateGeneralCharge(charge.id, 'chargeName', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select charge" />
                            </SelectTrigger>
                            <SelectContent>
                              {chargeCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={charge.amount || ''}
                            onChange={(e) => updateGeneralCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Due Date</Label>
                          <Input
                            type="date"
                            value={charge.dueDate}
                            onChange={(e) => updateGeneralCharge(charge.id, 'dueDate', e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeGeneralCharge(charge.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {isDueThisMonth && (
                        <div className="mt-2 text-xs text-yellow-800 font-medium">
                          ⚠️ Due this month - Added to monthly rent
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Service Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Service Names</Label>
                    <div className="space-y-2">
                      {serviceCharge.serviceNames.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {serviceCharge.serviceNames.map((name, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded">
                              <span className="text-sm">{name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-red-100"
                                onClick={() => setServiceCharge(prev => ({ ...prev, serviceNames: prev.serviceNames.filter((_, i) => i !== idx) }))}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value && !serviceCharge.serviceNames.includes(value)) {
                            setServiceCharge(prev => ({ ...prev, serviceNames: [...prev.serviceNames, value] }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Search and add service" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceChargeOptions.filter(opt => !serviceCharge.serviceNames.includes(opt)).map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={serviceCharge.amount || ''}
                      onChange={(e) => setServiceCharge(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Billing Type</Label>
                    <div className="flex items-center gap-2 h-10">
                      <button
                        type="button"
                        onClick={() => setServiceCharge(prev => ({ ...prev, isIncludedInRent: !prev.isIncludedInRent }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          serviceCharge.isIncludedInRent ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          serviceCharge.isIncludedInRent ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-xs">{serviceCharge.isIncludedInRent ? 'Inclusive' : 'Monthly'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          )}

          {/* Documents */}
          {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="documents">Upload Documents</Label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="font-medium text-gray-600">
                        {uploading ? 'Uploading...' : 'Drop files or click to upload'}
                      </span>
                      <span className="text-xs text-gray-500">PDF, Images, Documents</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Uploaded Documents ({documents.length})</Label>
                    {selectedDocs.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        // Check if all selected docs have the same location
                        const selectedDocuments = documents.filter(d => selectedDocs.includes(d.id));
                        const locations = selectedDocuments.map(d => d.hardCopyLocation || '');
                        const allSame = locations.every(loc => loc === locations[0]);
                        
                        if (allSame && locations[0]) {
                          // Parse the location string back into fields
                          const parts = locations[0].split(', ');
                          setHardCopyLocation({
                            location: parts[0] || '',
                            building: parts[1] || '',
                            floor: parts[2] || '',
                            roomNo: parts[3] || '',
                            rack: parts[4] || ''
                          });
                        } else {
                          // Different locations or no location - reset to empty
                          setHardCopyLocation({ location: '', building: '', floor: '', roomNo: '', rack: '' });
                        }
                        
                        setIsLocationDialogOpen(true);
                      }}>
                        <MapPin className="h-4 w-4 mr-2" />
                        Set Location ({selectedDocs.length})
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(doc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocs(prev => [...prev, doc.id]);
                              } else {
                                setSelectedDocs(prev => prev.filter(id => id !== doc.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                              {doc.hardCopyLocation && <span className="ml-2 text-blue-600">📍 {doc.hardCopyLocation}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fileUrl = doc.url || doc.path;
                              window.open(fileUrl.replace('/uploads/', '/api/files/'), '_blank');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Rent Escalation Schedule */}
          {activeTab === 'escalation' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Rent Escalation Schedule
                </CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsRecurringEscalationOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recurring
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addEscalation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Single
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {escalations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No escalation schedule defined</p>
                  <p className="text-sm">Click "Add Escalation" to create rent increase schedule</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Base Rent Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-blue-900">Base Rent</h4>
                        <p className="text-sm text-blue-700">Starting monthly rent amount</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-900">
                          ₹{parseFloat(formData.rentAmount || '0').toLocaleString()}
                        </div>
                        <div className="text-sm text-blue-700">per month</div>
                      </div>
                    </div>
                  </div>

                  {/* Escalation Entries */}
                  {escalationsWithCalculations.map((escalation, index) => (
                    <div key={escalation.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-900">Escalation #{index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeEscalation(escalation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="mb-4">
                        <Label>Escalation Date</Label>
                        <Input
                          type="date"
                          value={escalation.date}
                          onChange={(e) => updateEscalation(escalation.id, 'date', e.target.value)}
                        />
                      </div>
                      
                      {/* Floor-wise Escalation */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium">Floor-wise Escalation</Label>
                          {spaceAssignments && spaceAssignments.length > 0 ? (
                            <select
                              className="h-8 w-[200px] rounded-md border border-input bg-background px-3 text-sm"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  addFloorToEscalation(escalation.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            >
                              <option value="">Add Floor</option>
                              {spaceAssignments.filter((assignment: any, idx: number) => {
                                const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
                                return !escalation.floorWiseEscalations?.some(f => f.floorId === uniqueId);
                              }).map((assignment: any, idx: number) => {
                                const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
                                const sqft = assignment.assignedSqft || assignment.area || 0;
                                const category = assignment.category || 'Workspace';
                                return (
                                  <option key={uniqueId} value={uniqueId}>
                                    {assignment.buildingName || assignment.building || 'Building'} - Floor {assignment.floorNumber || assignment.floorName || assignment.floor || 'N/A'} - {sqft} sqft ({category})
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground">No space assigned</span>
                          )}
                        </div>
                        
                        {escalation.floorWiseEscalations && escalation.floorWiseEscalations.length > 0 && (
                          <div className="space-y-2">
                            {escalation.floorWiseEscalations.map((floor) => (
                              <div key={floor.floorId} className="bg-white border rounded p-3">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                                  <span className="text-sm font-medium text-gray-700">{floor.floorName}</span>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      placeholder="%"
                                      value={floor.percentage || ''}
                                      onChange={(e) => updateFloorEscalation(escalation.id, floor.floorId, parseFloat(e.target.value) || 0)}
                                      className="h-8"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">₹{floor.currentRent.toLocaleString()}</span>
                                    <span className="text-xs text-gray-400">→</span>
                                    <span className="text-sm font-medium text-green-700">₹{floor.newRent.toLocaleString()}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFloorFromEscalation(escalation.id, floor.floorId)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary */}
                  {escalationsWithCalculations.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-3">Escalation Summary</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-green-300">
                              <th className="text-left py-2 px-3 font-medium text-green-900">#</th>
                              <th className="text-left py-2 px-3 font-medium text-green-900">Date</th>
                              <th className="text-left py-2 px-3 font-medium text-green-900">Floor Details</th>
                              <th className="text-left py-2 px-3 font-medium text-green-900">%</th>
                              <th className="text-left py-2 px-3 font-medium text-green-900">Current Rent</th>
                              <th className="text-left py-2 px-3 font-medium text-green-900">New Rent</th>
                              <th className="text-left py-2 px-3 font-medium text-green-900">Difference</th>
                              <th className="text-right py-2 px-3 font-medium text-green-900">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-green-200">
                              <td className="py-2 px-3 font-medium">Base</td>
                              <td className="py-2 px-3">-</td>
                              <td className="py-2 px-3">Initial Rent</td>
                              <td className="py-2 px-3">-</td>
                              <td className="py-2 px-3 font-bold">₹{parseFloat(formData.rentAmount || '0').toLocaleString()}</td>
                              <td className="py-2 px-3">-</td>
                              <td className="py-2 px-3">-</td>
                              <td className="py-2 px-3 text-right">-</td>
                            </tr>
                            {escalationsWithCalculations.map((esc, idx) => {
                              const escalationDate = new Date(esc.date);
                              const today = new Date();
                              const isApplied = escalationDate <= today;
                              
                              return (
                                <tr key={esc.id} className="border-b border-green-200">
                                  <td className="py-2 px-3 font-medium">{idx + 1}</td>
                                  <td className="py-2 px-3">{esc.date}</td>
                                  <td className="py-2 px-3">
                                    {esc.floorWiseEscalations && esc.floorWiseEscalations.length > 0 ? (
                                      <div className="space-y-1">
                                        {esc.floorWiseEscalations.map(floor => (
                                          <div key={floor.floorId} className="text-xs">
                                            {floor.floorName}
                                          </div>
                                        ))}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {esc.floorWiseEscalations && esc.floorWiseEscalations.length > 0 ? (
                                      <div className="space-y-1">
                                        {esc.floorWiseEscalations.map(floor => (
                                          <div key={floor.floorId} className="text-xs">
                                            {floor.percentage}%
                                          </div>
                                        ))}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {esc.floorWiseEscalations && esc.floorWiseEscalations.length > 0 ? (
                                      <div className="space-y-1">
                                        {esc.floorWiseEscalations.map(floor => (
                                          <div key={floor.floorId} className="text-xs">
                                            ₹{floor.currentRent.toLocaleString()}
                                          </div>
                                        ))}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {esc.floorWiseEscalations && esc.floorWiseEscalations.length > 0 ? (
                                      <div className="space-y-1">
                                        {esc.floorWiseEscalations.map(floor => (
                                          <div key={floor.floorId} className="text-xs">
                                            ₹{floor.newRent.toLocaleString()}
                                          </div>
                                        ))}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {esc.floorWiseEscalations && esc.floorWiseEscalations.length > 0 ? (
                                      <div className="space-y-1">
                                        {esc.floorWiseEscalations.map(floor => {
                                          const difference = floor.newRent - floor.currentRent;
                                          return (
                                            <div key={floor.floorId} className="text-xs text-green-700 font-medium">
                                              +₹{difference.toLocaleString()}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      isApplied ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                                    }`}>
                                      {isApplied ? 'Applied' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-green-300 bg-green-100">
                              <td colSpan={7} className="py-2 px-3 font-medium text-green-900">
                                {lastAppliedEscalation ? 'Current Escalated Rent' : 'Current Rent'} (as of {new Date().toLocaleDateString()})
                                {lastAppliedEscalation && (
                                  <span className="text-xs ml-2 text-green-700">
                                    (Last applied: {lastAppliedEscalation.date})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-lg text-green-900">₹{currentRent.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Recurring Escalation Dialog */}
          <Dialog open={isRecurringEscalationOpen} onOpenChange={setIsRecurringEscalationOpen}>
            <DialogContent aria-describedby="recurring-desc">
              <DialogHeader>
                <DialogTitle>Add Recurring Escalations</DialogTitle>
              </DialogHeader>
              <p id="recurring-desc" className="sr-only">Configure recurring rent escalations</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recurring_start_date">Start Date</Label>
                  <Input
                    id="recurring_start_date"
                    type="date"
                    value={recurringEscalation.startDate}
                    onChange={(e) => setRecurringEscalation(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="recurring_percentage">Escalation Percentage (%)</Label>
                  <Input
                    id="recurring_percentage"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 6"
                    value={recurringEscalation.percentage || ''}
                    onChange={(e) => setRecurringEscalation(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="recurring_years">Number of Years</Label>
                  <Input
                    id="recurring_years"
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={recurringEscalation.years || ''}
                    onChange={(e) => setRecurringEscalation(prev => ({ ...prev, years: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will create {recurringEscalation.years} escalation entries, one for each year
                  </p>
                </div>
                {spaceAssignments && spaceAssignments.length > 0 && (
                  <div>
                    <Label>Apply to Specific Floors (Optional)</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(recurringEscalation.selectedFloors || []).length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRecurringEscalation(prev => ({ ...prev, selectedFloors: [] }));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="font-medium">All Floors</span>
                      </label>
                      {spaceAssignments.map((assignment: any, idx: number) => {
                        const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
                        const floorName = `${assignment.buildingName || assignment.building || 'Building'} - Floor ${assignment.floorNumber || assignment.floorName || assignment.floor || 'N/A'}`;
                        const sqft = assignment.assignedSqft || assignment.area || 0;
                        const category = assignment.category || 'Workspace';
                        return (
                          <label key={uniqueId} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={(recurringEscalation.selectedFloors || []).includes(uniqueId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRecurringEscalation(prev => ({ 
                                    ...prev, 
                                    selectedFloors: [...prev.selectedFloors, uniqueId] 
                                  }));
                                } else {
                                  setRecurringEscalation(prev => ({ 
                                    ...prev, 
                                    selectedFloors: prev.selectedFloors.filter(id => id !== uniqueId) 
                                  }));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span>{floorName} - {sqft} sqft ({category})</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(recurringEscalation.selectedFloors || []).length === 0 
                        ? 'Escalation will apply to all assigned floors' 
                        : `Escalation will apply to ${(recurringEscalation.selectedFloors || []).length} selected floor(s)`}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsRecurringEscalationOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="button" onClick={addRecurringEscalations} className="flex-1">
                    Add Escalations
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hard Copy Location Dialog */}
          <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
            <DialogContent aria-describedby="location-desc">
              <DialogHeader>
                <DialogTitle>Set Hard Copy Location</DialogTitle>
              </DialogHeader>
              <p id="location-desc" className="sr-only">Set physical location for documents</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={hardCopyLocation.location}
                      onChange={(e) => setHardCopyLocation({...hardCopyLocation, location: e.target.value})}
                      placeholder="e.g., Main Office"
                    />
                  </div>
                  <div>
                    <Label htmlFor="building">Building</Label>
                    <Input
                      id="building"
                      value={hardCopyLocation.building}
                      onChange={(e) => setHardCopyLocation({...hardCopyLocation, building: e.target.value})}
                      placeholder="e.g., Block A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="floor">Floor</Label>
                    <Input
                      id="floor"
                      value={hardCopyLocation.floor}
                      onChange={(e) => setHardCopyLocation({...hardCopyLocation, floor: e.target.value})}
                      placeholder="e.g., 2nd Floor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="roomNo">Room No</Label>
                    <Input
                      id="roomNo"
                      value={hardCopyLocation.roomNo}
                      onChange={(e) => setHardCopyLocation({...hardCopyLocation, roomNo: e.target.value})}
                      placeholder="e.g., Room 205"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="rack">Rack/Cabinet</Label>
                    <Input
                      id="rack"
                      value={hardCopyLocation.rack}
                      onChange={(e) => setHardCopyLocation({...hardCopyLocation, rack: e.target.value})}
                      placeholder="e.g., Cabinet A, Shelf 2"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fill in the fields as needed. All fields are optional.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900 mb-2">Selected Documents ({selectedDocs.length}):</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {selectedDocs.map(docId => {
                      const doc = documents.find(d => d.id === docId);
                      return doc ? <li key={docId}>• {doc.name}</li> : null;
                    })}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsLocationDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="button" onClick={async () => {
                    const locationStr = [hardCopyLocation.location, hardCopyLocation.building, hardCopyLocation.floor, hardCopyLocation.roomNo, hardCopyLocation.rack]
                      .filter(v => v.trim())
                      .join(', ');
                    
                    const updatedDocs = documents.map(doc => 
                      selectedDocs.includes(doc.id) 
                        ? { ...doc, hardCopyLocation: locationStr }
                        : doc
                    );
                    setDocuments(updatedDocs);
                    
                    // Update database immediately if editing existing tenant
                    if (tenant?.id) {
                      await supabase
                        .from('tenants')
                        .update({ documents: updatedDocs })
                        .eq('id', tenant.id);
                    }
                    
                    setSelectedDocs([]);
                    setHardCopyLocation({ location: '', building: '', floor: '', roomNo: '', rack: '' });
                    setIsLocationDialogOpen(false);
                  }} className="flex-1">
                    Save Location
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Escalation Warning Dialog */}
          <Dialog open={isEscalationWarningOpen} onOpenChange={setIsEscalationWarningOpen}>
            <DialogContent aria-describedby="warning-desc">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-yellow-600">
                  <span className="text-2xl">⚠️</span>
                  Escalation Date Warning
                </DialogTitle>
              </DialogHeader>
              <p id="warning-desc" className="sr-only">Warning about escalation date conflicts</p>
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  This escalation date falls between existing escalation dates.
                </p>
                <p className="text-sm text-gray-700">
                  Adding an escalation between existing dates will affect the rent calculation sequence.
                </p>
                <p className="text-sm font-medium text-gray-900">
                  Do you want to continue?
                </p>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEscalationWarningOpen(false);
                      setPendingEscalationAction(null);
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (pendingEscalationAction) {
                        pendingEscalationAction();
                      }
                      setIsEscalationWarningOpen(false);
                      setPendingEscalationAction(null);
                    }} 
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Charge Category Dialog */}
          <Dialog open={isChargeCategoryOpen} onOpenChange={setIsChargeCategoryOpen}>
            <DialogContent aria-describedby="category-desc">
              <DialogHeader>
                <DialogTitle>Manage Charge Categories</DialogTitle>
              </DialogHeader>
              <p id="category-desc" className="sr-only">Add or remove charge categories</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {chargeCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded">
                        <span className="text-sm">{cat}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-red-100"
                          onClick={async () => {
                            const updated = chargeCategories.filter((_, i) => i !== idx);
                            await supabase.from('app_settings').update({ value: updated }).eq('key', 'general_charge_categories');
                            setCategoryReloadKey(prev => prev + 1);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_charge_category">Add New Category</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new_charge_category"
                      value={newChargeCategory}
                      onChange={(e) => setNewChargeCategory(e.target.value)}
                      placeholder="e.g., Housekeeping"
                    />
                    <Button
                      type="button"
                      onClick={async () => {
                        if (newChargeCategory.trim()) {
                          const updated = [...chargeCategories, newChargeCategory.trim()];
                          await supabase.from('app_settings').update({ value: updated }).eq('key', 'general_charge_categories');
                          setNewChargeCategory('');
                          setCategoryReloadKey(prev => prev + 1);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <Button type="button" onClick={() => setIsChargeCategoryOpen(false)} className="w-full">
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Unsaved Changes Dialog */}
          <Dialog open={isUnsavedChangesDialogOpen} onOpenChange={setIsUnsavedChangesDialogOpen}>
            <DialogContent aria-describedby="unsaved-desc">
              <DialogHeader>
                <DialogTitle>Unsaved Changes</DialogTitle>
              </DialogHeader>
              <p id="unsaved-desc" className="text-sm text-gray-700">Please save your changes before moving to the next tab.</p>
              <div className="flex justify-end">
                <Button onClick={() => setIsUnsavedChangesDialogOpen(false)}>
                  OK
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 sticky bottom-0 bg-white py-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {isAddMode && tabs.findIndex(tab => tab.id === activeTab) < tabs.length - 1 && (
              <Button type="button" onClick={() => {
                if (hasChanges) {
                  setIsUnsavedChangesDialogOpen(true);
                  return;
                }
                const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                setActiveTab(tabs[currentIndex + 1].id);
              }}>
                Next
              </Button>
            )}
            <Button type="submit" disabled={!isAddMode && !hasChanges}>
              {isAddMode ? (activeTab === tabs[tabs.length - 1].id ? 'Save & Close' : 'Save') : 'Update'}
            </Button>
          </div>
        </form>
  );
};