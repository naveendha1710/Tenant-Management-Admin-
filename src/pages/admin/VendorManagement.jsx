import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building2, Users, ShieldCheck, XCircle, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, Search, X, ChevronDown, Star,
  Phone, Mail, MapPin, CreditCard, User, Landmark, Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const EMPTY_BANK = () => ({
  id: crypto.randomUUID(),
  bank_name: '',
  account_number: '',
  branch: '',
  ifsc_code: '',
  is_primary: false,
  is_active: true,
});

const EMPTY_CONTACT = () => ({ name: '', phone: '', email: '' });

const EMPTY_FORM = {
  vendor_name: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
  gst_enabled: false,
  gst_number: '',
  pan_number: '',
  contact_persons: [],
  bank_accounts: [],
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ title, value, icon: Icon, iconColor, loading }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-7 w-12 bg-gray-200 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold" style={{ color: iconColor }}>{value}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 opacity-20`} style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

// ─── Inline Popover ───────────────────────────────────────────────────────────
function InlinePopover({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen(v => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[260px] max-w-xs p-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: i === 0 ? '60%' : '80%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Field Error ──────────────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
      </div>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorManagement() {
  const { toast } = useToast();

  // List state
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, gst: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gstFilter, setGstFilter] = useState('all');
  const [sortField, setSortField] = useState('vendor_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View vendor
  const [viewingVendor, setViewingVendor] = useState(null);

  // ── Fetch vendors ────────────────────────────────────────────────────────────
  async function fetchVendors() {
    setLoading(true);
    try {
      let query = supabase.from('vendors').select('*', { count: 'exact' });

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`vendor_name.ilike.${s},email.ilike.${s},phone.ilike.${s},gst_number.ilike.${s}`);
      }
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (gstFilter === 'gst') query = query.eq('gst_enabled', true);
      if (gstFilter === 'nogst') query = query.eq('gst_enabled', false);

      query = query.order(sortField, { ascending: sortAsc });
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      setVendors(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const { data } = await supabase.from('vendors').select('status, gst_enabled');
      if (data) {
        setStats({
          total: data.length,
          active: data.filter(v => v.status === 'active').length,
          inactive: data.filter(v => v.status === 'inactive').length,
          gst: data.filter(v => v.gst_enabled).length,
        });
      }
    } catch (_) {}
  }

  useEffect(() => {
    fetchVendors();
  }, [search, statusFilter, gstFilter, sortField, sortAsc, page]);

  useEffect(() => {
    fetchStats();
  }, [vendors]);

  // ── Sort toggle ───────────────────────────────────────────────────────────────
  function toggleSort(field) {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(true); }
    setPage(1);
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-gray-400 inline ml-1" />;
    return sortAsc
      ? <ChevronDown className="h-3 w-3 text-blue-600 inline ml-1" />
      : <ChevronDown className="h-3 w-3 text-blue-600 inline ml-1 rotate-180" />;
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(vendor) {
    setEditId(vendor.id);
    setForm({
      vendor_name: vendor.vendor_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      status: vendor.status || 'active',
      gst_enabled: vendor.gst_enabled || false,
      gst_number: vendor.gst_number || '',
      pan_number: vendor.pan_number || '',
      contact_persons: vendor.contact_persons || [],
      bank_accounts: (vendor.bank_accounts || []).map(b => ({ ...b, id: b.id || crypto.randomUUID() })),
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setErrors({});
  }

  // ── Form field helpers ────────────────────────────────────────────────────────
  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  // Contact persons
  function addContact() {
    setForm(f => ({ ...f, contact_persons: [...f.contact_persons, EMPTY_CONTACT()] }));
  }
  function updateContact(i, key, val) {
    setForm(f => {
      const arr = [...f.contact_persons];
      arr[i] = { ...arr[i], [key]: val };
      return { ...f, contact_persons: arr };
    });
  }
  function removeContact(i) {
    setForm(f => ({ ...f, contact_persons: f.contact_persons.filter((_, idx) => idx !== i) }));
  }

  // Bank accounts
  function addBank() {
    setForm(f => ({ ...f, bank_accounts: [...f.bank_accounts, EMPTY_BANK()] }));
  }
  function updateBank(id, key, val) {
    setForm(f => {
      let arr = f.bank_accounts.map(b => b.id === id ? { ...b, [key]: val } : b);
      // if setting primary, deselect others
      if (key === 'is_primary' && val === true) {
        arr = arr.map(b => ({ ...b, is_primary: b.id === id }));
      }
      return { ...f, bank_accounts: arr };
    });
    // clear bank-level errors
    setErrors(e => {
      const n = { ...e };
      delete n[`bank_${id}_${key}`];
      return n;
    });
  }
  function removeBank(id) {
    setForm(f => ({ ...f, bank_accounts: f.bank_accounts.filter(b => b.id !== id) }));
  }

  // ── Validation ────────────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.vendor_name.trim()) errs.vendor_name = 'Vendor name is required';
    if (form.gst_enabled && !form.gst_number.trim()) errs.gst_number = 'GST number is required when GST is enabled';
    form.bank_accounts.forEach(b => {
      if (!b.bank_name.trim()) errs[`bank_${b.id}_bank_name`] = 'Bank name required';
      if (!b.account_number.trim()) errs[`bank_${b.id}_account_number`] = 'Account number required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        vendor_name: form.vendor_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        status: form.status,
        gst_enabled: form.gst_enabled,
        gst_number: form.gst_enabled ? form.gst_number.trim() || null : null,
        pan_number: form.pan_number.trim() || null,
        contact_persons: form.contact_persons.filter(c => c.name.trim()),
        bank_accounts: form.bank_accounts,
        updated_at: new Date().toISOString(),
      };

      if (editId) {
        const { error } = await supabase.from('vendors').update(payload).eq('id', editId);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Vendor updated successfully' });
      } else {
        const { error } = await supabase.from('vendors').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: 'Created', description: 'Vendor added successfully' });
      }

      closeModal();
      fetchVendors();
      fetchStats();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Vendor deleted successfully' });
      setDeleteId(null);
      fetchVendors();
      fetchStats();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Vendor Management" subtitle="Manage vendors, contacts, and bank accounts">
      <div className="space-y-6">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Vendors" value={stats.total} icon={Building2}
          iconColor="#3b82f6" loading={loading} />
        <SummaryCard title="Active Vendors" value={stats.active} icon={Users}
          iconColor="#10b981" loading={loading} />
        <SummaryCard title="Inactive Vendors" value={stats.inactive} icon={XCircle}
          iconColor="#ef4444" loading={loading} />
        <SummaryCard title="GST Registered" value={stats.gst} icon={ShieldCheck}
          iconColor="#f59e0b" loading={loading} />
      </div>

      {/* ── Filter + Action Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 w-64"
              placeholder="Search vendor, email, phone, GST…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); setPage(1); }}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={gstFilter}
            onChange={e => { setGstFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All GST</option>
            <option value="gst">GST Registered</option>
            <option value="nogst">Not Registered</option>
          </select>
        </div>

        <Button onClick={openAdd} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                    onClick={() => toggleSort('vendor_name')}
                  >
                    Vendor Name <SortIcon field="vendor_name" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Banks</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                    onClick={() => toggleSort('status')}
                  >
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Building2 className="h-10 w-10" />
                        <p className="text-sm font-medium">No vendors found</p>
                        <p className="text-xs">Try adjusting your filters or add a new vendor</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      {/* Vendor Name */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm text-gray-900">{vendor.vendor_name}</span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {vendor.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {vendor.email}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {vendor.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {vendor.phone}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Banks popover */}
                      <td className="px-4 py-3">
                        {(vendor.bank_accounts || []).length === 0 ? (
                          <span className="text-gray-300 text-sm">—</span>
                        ) : (
                          <InlinePopover
                            trigger={
                              <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 hover:border-blue-300 text-xs">
                                <Landmark className="h-3 w-3 mr-1" />
                                {vendor.bank_accounts.length} Bank{vendor.bank_accounts.length !== 1 ? 's' : ''}
                              </Badge>
                            }
                          >
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bank Accounts</p>
                            <div className="space-y-3">
                              {vendor.bank_accounts.map((b, i) => (
                                <div key={b.id || i} className="text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <p className="font-medium text-gray-800">{b.bank_name}</p>
                                    {b.is_primary && (
                                      <span className="inline-flex items-center gap-0.5 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-1.5 py-0.5">
                                        <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" /> Primary
                                      </span>
                                    )}
                                    <span className={`ml-auto inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                      {b.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <p className="text-gray-500">A/C: {b.account_number}</p>
                                  {b.branch && <p className="text-gray-500">Branch: {b.branch}</p>}
                                  {b.ifsc_code && <p className="text-gray-500">IFSC: {b.ifsc_code}</p>}
                                </div>
                              ))}
                            </div>
                          </InlinePopover>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {vendor.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">Inactive</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingVendor(vendor)}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                            title="View vendor"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(vendor)}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Edit vendor"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(vendor.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete vendor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} vendors
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT VENDOR MODAL
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={v => !v && closeModal()}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">
              {editId ? 'Edit Vendor' : 'Add Vendor'}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

            {/* ── Section 1: Basic Information ── */}
            <div>
              <SectionHeader icon={Building2} title="Basic Information" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vendor Name */}
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium">
                      Vendor Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="mt-1.5"
                      placeholder="ABC Supplies Pvt. Ltd."
                      value={form.vendor_name}
                      onChange={e => setField('vendor_name', e.target.value)}
                    />
                    <FieldError msg={errors.vendor_name} />
                  </div>

                  {/* Email */}
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      className="mt-1.5"
                      placeholder="vendor@example.com"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <Input
                      type="tel"
                      className="mt-1.5"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.phone}
                      onChange={e => setField('phone', e.target.value)}
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium">Address</Label>
                    <textarea
                      rows={3}
                      className="mt-1.5 w-full px-3 py-2 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full address…"
                      value={form.address}
                      onChange={e => setField('address', e.target.value)}
                    />
                  </div>
                </div>

                {/* Status toggle */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <p className="text-xs text-muted-foreground">
                      {form.status === 'active' ? 'Vendor is active and visible' : 'Vendor is inactive'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${form.status === 'inactive' ? 'text-red-500' : 'text-gray-400'}`}>Inactive</span>
                    <Switch
                      checked={form.status === 'active'}
                      onCheckedChange={v => setField('status', v ? 'active' : 'inactive')}
                    />
                    <span className={`text-xs font-medium ${form.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* ── Section 2: GST & Tax Details ── */}
            <div>
              <SectionHeader icon={ShieldCheck} title="GST & Tax Details" />
              <div className="space-y-4">
                {/* GST toggle */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
                  <div>
                    <Label className="text-sm font-medium">GST Enabled</Label>
                    <p className="text-xs text-muted-foreground">Vendor is registered under GST</p>
                  </div>
                  <Switch
                    checked={form.gst_enabled}
                    onCheckedChange={v => setField('gst_enabled', v)}
                  />
                </div>

                {/* Animated slide-down for GST fields */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: form.gst_enabled ? '200px' : '0px', opacity: form.gst_enabled ? 1 : 0 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <Label className="text-sm font-medium">
                        GST Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="mt-1.5 uppercase"
                        placeholder="22AAAAA0000A1Z5"
                        value={form.gst_number}
                        onChange={e => setField('gst_number', e.target.value.toUpperCase())}
                      />
                      <FieldError msg={errors.gst_number} />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">PAN Number</Label>
                      <Input
                        className="mt-1.5 uppercase"
                        placeholder="AAAAA9999A"
                        value={form.pan_number}
                        onChange={e => setField('pan_number', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* ── Section 3: Contact Persons ── */}
            <div>
              <SectionHeader
                icon={User}
                title="Contact Persons"
                action={
                  <Button variant="outline" size="sm" onClick={addContact} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" /> Add Contact
                  </Button>
                }
              />

              {form.contact_persons.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4 border border-dashed border-gray-200 rounded-md">
                  No contacts added. Click "Add Contact" to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.contact_persons.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                      <div>
                        <Input
                          placeholder="Name"
                          value={c.name}
                          onChange={e => updateContact(i, 'name', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Input
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          value={c.phone}
                          onChange={e => updateContact(i, 'phone', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={c.email}
                          onChange={e => updateContact(i, 'email', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeContact(i)}
                        className="mt-1 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* ── Section 4: Bank Accounts ── */}
            <div>
              <SectionHeader
                icon={CreditCard}
                title="Bank Accounts"
                action={
                  <Button variant="outline" size="sm" onClick={addBank} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" /> Add Bank Account
                  </Button>
                }
              />

              {form.bank_accounts.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4 border border-dashed border-gray-200 rounded-md">
                  No bank accounts added. Click "Add Bank Account" to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.bank_accounts.map(b => (
                    <div
                      key={b.id}
                      className={`relative rounded-md border p-3 ${b.is_primary ? 'border-l-4 border-l-yellow-400 border-yellow-200 bg-yellow-50/30' : 'border-gray-200 bg-white'}`}
                    >
                      {/* Primary badge + delete */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {b.is_primary && (
                            <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5 font-medium">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /> Primary
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeBank(b.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Bank Name */}
                        <div>
                          <Label className="text-xs font-medium">
                            Bank Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            className="mt-1 text-sm h-8"
                            placeholder="State Bank of India"
                            value={b.bank_name}
                            onChange={e => updateBank(b.id, 'bank_name', e.target.value)}
                          />
                          <FieldError msg={errors[`bank_${b.id}_bank_name`]} />
                        </div>

                        {/* Account Number */}
                        <div>
                          <Label className="text-xs font-medium">
                            Account Number <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            className="mt-1 text-sm h-8"
                            placeholder="00000000000000"
                            value={b.account_number}
                            onChange={e => updateBank(b.id, 'account_number', e.target.value)}
                          />
                          <FieldError msg={errors[`bank_${b.id}_account_number`]} />
                        </div>

                        {/* Branch */}
                        <div>
                          <Label className="text-xs font-medium">Branch</Label>
                          <Input
                            className="mt-1 text-sm h-8"
                            placeholder="Chennai Main Branch"
                            value={b.branch}
                            onChange={e => updateBank(b.id, 'branch', e.target.value)}
                          />
                        </div>

                        {/* IFSC Code */}
                        <div>
                          <Label className="text-xs font-medium">IFSC Code</Label>
                          <Input
                            className="mt-1 text-sm h-8 uppercase"
                            placeholder="SBIN0001234"
                            value={b.ifsc_code}
                            onChange={e => updateBank(b.id, 'ifsc_code', e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>

                      {/* Primary radio + Active toggle */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="primary_bank"
                            checked={b.is_primary}
                            onChange={() => updateBank(b.id, 'is_primary', true)}
                            className="accent-yellow-500"
                          />
                          <span className="text-xs font-medium text-gray-700">Set as Primary</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Active</span>
                          <Switch
                            checked={b.is_active}
                            onCheckedChange={v => updateBank(b.id, 'is_active', v)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Modal Footer ── */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-3 bg-gray-50">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[80px]">
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving…
                </span>
              ) : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          VIEW VENDOR DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewingVendor} onOpenChange={v => !v && setViewingVendor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Vendor Details</DialogTitle>
          </DialogHeader>

          {viewingVendor && (
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              {/* Basic Information */}
              <div>
                <SectionHeader icon={Building2} title="Basic Information" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Vendor Name</Label>
                    <p className="font-medium">{viewingVendor.vendor_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">
                      {viewingVendor.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium">{viewingVendor.email || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Phone</Label>
                    <p className="font-medium">{viewingVendor.phone || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Address</Label>
                    <p className="font-medium">{viewingVendor.address || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200" />

              {/* GST & Tax Details */}
              <div>
                <SectionHeader icon={ShieldCheck} title="GST & Tax Details" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">GST Enabled</Label>
                    <p className="font-medium">{viewingVendor.gst_enabled ? 'Yes' : 'No'}</p>
                  </div>
                  {viewingVendor.gst_enabled && (
                    <>
                      <div>
                        <Label className="text-muted-foreground text-xs">GST Number</Label>
                        <p className="font-medium">{viewingVendor.gst_number || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">PAN Number</Label>
                        <p className="font-medium">{viewingVendor.pan_number || '—'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200" />

              {/* Contact Persons */}
              <div>
                <SectionHeader icon={User} title="Contact Persons" />
                {(viewingVendor.contact_persons || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No contacts added</p>
                ) : (
                  <div className="space-y-3">
                    {viewingVendor.contact_persons.map((c, i) => (
                      <div key={i} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                        <p className="font-medium text-sm">{c.name || '—'}</p>
                        {c.phone && <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                        {c.email && <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><Mail className="h-3 w-3" />{c.email}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-200" />

              {/* Bank Accounts */}
              <div>
                <SectionHeader icon={CreditCard} title="Bank Accounts" />
                {(viewingVendor.bank_accounts || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No bank accounts added</p>
                ) : (
                  <div className="space-y-3">
                    {viewingVendor.bank_accounts.map((b, i) => (
                      <div key={b.id || i} className={`p-3 border rounded-md ${b.is_primary ? 'border-l-4 border-l-yellow-400 border-yellow-200 bg-yellow-50/30' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-sm">{b.bank_name}</p>
                          {b.is_primary && (
                            <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5">
                              <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" /> Primary
                            </span>
                          )}
                          <span className={`ml-auto inline-block px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {b.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <Label className="text-muted-foreground text-xs">Account Number</Label>
                            <p className="font-medium">{b.account_number}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Branch</Label>
                            <p className="font-medium">{b.branch || '—'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">IFSC Code</Label>
                            <p className="font-medium">{b.ifsc_code || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end bg-gray-50">
            <Button onClick={() => setViewingVendor(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this vendor? This action cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </DashboardLayout>
  );
}
