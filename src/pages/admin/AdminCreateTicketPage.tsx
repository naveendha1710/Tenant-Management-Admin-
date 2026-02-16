import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Camera, Video, MapPin, Calendar, AlertTriangle, FileText, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { MaintenanceService } from '@/services/maintenanceService';

const CATEGORIES = {
  Electrical: ['Socket Issue', 'Light Not Working', 'Switch Problem', 'Circuit Breaker', 'Wiring Issue', 'Other'],
  Plumbing: ['Leakage', 'Blocked Drain', 'Tap Issue', 'Toilet Problem', 'Water Pressure', 'Other'],
  Carpentry: ['Door Issue', 'Window Problem', 'Furniture Repair', 'Cabinet Issue', 'Other'],
  HVAC: ['AC Not Cooling', 'AC Leaking', 'Ventilation Issue', 'Thermostat Problem', 'Other'],
  Civil: ['Wall Crack', 'Ceiling Issue', 'Floor Damage', 'Structural Problem', 'Other'],
  Painting: ['Wall Paint', 'Ceiling Paint', 'Door/Window Paint', 'Other'],
  'IT/Networking': ['Internet Issue', 'Network Problem', 'Cable Issue', 'Other'],
  Housekeeping: ['Cleaning Required', 'Pest Control', 'Garbage Disposal', 'Other'],
  Others: ['General Issue']
};

const TIME_SLOTS = ['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-8PM)', 'Anytime'];

export default function AdminCreateTicketPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tenant_id: '',
    category: '',
    subCategory: '',
    title: '',
    description: '',
    building: '',
    floor: '',
    room: '',
    spotDescription: '',
    preferredDate: '',
    preferredTime: '',
    priority: 'Medium',
    safetyRisk: false,
    previousOccurrence: false,
    notes: '',
    photos: [] as File[],
    video: null as File | null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const { tenantDataService } = await import('@/data/tenantData');
      const allTenants = await tenantDataService.getAllTenants();
      setTenants(allTenants);
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.tenant_id) newErrors.tenant_id = 'Tenant is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.subCategory) newErrors.subCategory = 'Sub-category is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.building) newErrors.building = 'Building is required';
    if (!formData.floor) newErrors.floor = 'Floor is required';
    if (!formData.room) newErrors.room = 'Room/Unit is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirm(true);
    }
  };

  const confirmSubmit = async () => {
    try {
      await MaintenanceService.createTicket({
        tenant_id: formData.tenant_id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'pending'
      });
      
      setShowConfirm(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        navigate('/admin/helpdesk');
      }, 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removePhoto = (index: number) => {
    setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  return (
    <DashboardLayout title="Create Maintenance Request" subtitle="Submit a new maintenance ticket on behalf of tenant">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Request Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tenant Selection */}
              <div>
                <Label>Select Tenant *</Label>
                <Select value={formData.tenant_id} onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}>
                  <SelectTrigger className={errors.tenant_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tenant_id && <p className="text-xs text-red-500 mt-1">{errors.tenant_id}</p>}
              </div>

              {/* Issue Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />Issue Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category *</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v, subCategory: '' })}>
                        <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CATEGORIES).map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                    </div>
                    <div>
                      <Label>Sub-Category *</Label>
                      <Select value={formData.subCategory} onValueChange={(v) => setFormData({ ...formData, subCategory: v })} disabled={!formData.category}>
                        <SelectTrigger className={errors.subCategory ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select sub-category" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.category && CATEGORIES[formData.category as keyof typeof CATEGORIES].map((sub) => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.subCategory && <p className="text-xs text-red-500 mt-1">{errors.subCategory}</p>}
                    </div>
                  </div>
                  <div>
                    <Label>Issue Title *</Label>
                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Brief title of the issue" className={errors.title ? 'border-red-500' : ''} />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Describe the issue in detail..." className={errors.description ? 'border-red-500' : ''} />
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <div className="flex gap-2 mt-2">
                      {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                        <Badge key={p} variant={formData.priority === p ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFormData({ ...formData, priority: p })}>{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Safety Risk</Label>
                      <Switch checked={formData.safetyRisk} onCheckedChange={(v) => setFormData({ ...formData, safetyRisk: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Previous Occurrence</Label>
                      <Switch checked={formData.previousOccurrence} onCheckedChange={(v) => setFormData({ ...formData, previousOccurrence: v })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Media */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />Location & Media
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Building/Block *</Label>
                      <Input value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} placeholder="A1" className={errors.building ? 'border-red-500' : ''} />
                      {errors.building && <p className="text-xs text-red-500 mt-1">{errors.building}</p>}
                    </div>
                    <div>
                      <Label>Floor *</Label>
                      <Input value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="3rd Floor" className={errors.floor ? 'border-red-500' : ''} />
                      {errors.floor && <p className="text-xs text-red-500 mt-1">{errors.floor}</p>}
                    </div>
                    <div>
                      <Label>Room/Unit *</Label>
                      <Input value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} placeholder="301" className={errors.room ? 'border-red-500' : ''} />
                      {errors.room && <p className="text-xs text-red-500 mt-1">{errors.room}</p>}
                    </div>
                  </div>
                  <div>
                    <Label>Exact Spot Description</Label>
                    <Input value={formData.spotDescription} onChange={(e) => setFormData({ ...formData, spotDescription: e.target.value })} placeholder="Near the main door, left side" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2"><Camera className="h-4 w-4" />Upload Photos</Label>
                    <Input type="file" accept="image/*" multiple onChange={(e) => setFormData({ ...formData, photos: Array.from(e.target.files || []) })} />
                    {formData.photos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {formData.photos.map((photo, i) => (
                          <div key={i} className="relative">
                            <img src={URL.createObjectURL(photo)} alt="" className="w-20 h-20 object-cover rounded" />
                            <Button size="sm" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full" onClick={() => removePhoto(i)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-2"><Video className="h-4 w-4" />Upload Video (Optional)</Label>
                    <Input type="file" accept="video/*" onChange={(e) => setFormData({ ...formData, video: e.target.files?.[0] || null })} />
                  </div>
                </div>
              </div>

              {/* Visit Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />Visit Preferences
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferred Date</Label>
                      <Input type="date" value={formData.preferredDate} onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })} min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <Label>Preferred Time Slot</Label>
                      <Select value={formData.preferredTime} onValueChange={(v) => setFormData({ ...formData, preferredTime: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Any additional information..." />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">Submit Request</Button>
            </CardContent>
          </Card>
        </form>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p><strong>Tenant:</strong> {tenants.find(t => t.id === formData.tenant_id)?.company}</p>
              <p><strong>Category:</strong> {formData.category} - {formData.subCategory}</p>
              <p><strong>Title:</strong> {formData.title}</p>
              <p><strong>Location:</strong> {formData.building}, Floor {formData.floor}, Room {formData.room}</p>
              <p><strong>Priority:</strong> {formData.priority}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button onClick={confirmSubmit}>Confirm & Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent>
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Request Submitted!</h2>
              <p className="text-muted-foreground">Maintenance request has been created successfully.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
