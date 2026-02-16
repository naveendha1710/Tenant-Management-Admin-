import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { type Tenant } from '@/data/tenantData';
import { useState } from 'react';
import { TenantPaymentsTab } from './TenantPaymentsTab';

interface TenantViewDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tenant: Tenant) => void;
  onEditAgreement?: (tenant: Tenant, agreementIndex: number) => void;
  onAddAgreement?: (tenant: Tenant) => void;
  onDeleteAgreement?: (tenant: Tenant, agreementIndex: number) => void;
  canEdit?: boolean;
}

export function TenantViewDialog({ tenant, isOpen, onClose, onEdit, onEditAgreement, onAddAgreement, onDeleteAgreement, canEdit = true }: TenantViewDialogProps) {
  const [activeTab, setActiveTab] = useState<'agreements' | 'payments'>('agreements');
  
  if (!tenant) return null;

  const agreements = tenant.agreements || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full h-[98vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Tenant Details - {tenant.company}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-6">
          {/* Left Panel - Company Details */}
          <div className="md:w-2/5 border border-gray-200 rounded-lg p-6 overflow-y-auto bg-white shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
              {canEdit && onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(tenant)} className="text-gray-600 hover:text-gray-900">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* Identity Section */}
            <div className="space-y-5 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Name</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.company}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Person</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Type</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.isGstCompany ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tenant.isGstCompany ? 'GST Registered' : 'Non-GST'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.status === 'Active' ? 'bg-green-50 text-green-700' : 
                      tenant.status === 'Pending Move-In' ? 'bg-amber-50 text-amber-700' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Group</label>
                <p className="text-sm text-gray-900 mt-1">{tenant.companyGroup || <span className="text-gray-400">—</span>}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-6"></div>

            {/* Contact Section */}
            <div className="space-y-5 mb-8">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.email || <span className="text-gray-400">—</span>}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.phone || <span className="text-gray-400">—</span>}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</label>
                <p className="text-sm text-gray-900 mt-1">{tenant.address || <span className="text-gray-400">—</span>}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID Proof</label>
                <p className="text-sm text-gray-900 mt-1">{tenant.idProof || <span className="text-gray-400">—</span>}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-6"></div>

            {/* Legal/Compliance Section */}
            <div className="space-y-5">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Legal & Compliance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">GST Number</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.gstNumber || <span className="text-gray-400">—</span>}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">TAN Number</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.tanNumber || <span className="text-gray-400">—</span>}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PAN Number</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.panNumber || <span className="text-gray-400">—</span>}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CIN Number</label>
                  <p className="text-sm text-gray-900 mt-1">{tenant.cinNumber || <span className="text-gray-400">—</span>}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Agreements and Payments */}
          <div className="md:w-3/5 border border-gray-200 rounded-lg p-6 overflow-y-auto bg-white shadow-sm">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4 border-b">
              <button
                onClick={() => setActiveTab('agreements')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'agreements'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Agreements ({agreements.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'payments'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Payments
              </button>
            </div>

            {/* Agreements Tab */}
            {activeTab === 'agreements' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Agreements ({agreements.length})</h3>
                  {canEdit && onAddAgreement && (
                    <Button variant="outline" size="sm" onClick={() => onAddAgreement(tenant)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Agreement
                    </Button>
                  )}
                </div>

                {agreements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No agreements found</p>
                    <p className="text-sm mt-2">Click "Add Agreement" to create one</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agreements.map((agreement: any, index: number) => {
                      const spaceCount = agreement.spaceAssignments?.length || 0;
                      
                      // Calculate total rent with escalations and charges
                      const today = new Date();
                      const spaceAssignments = agreement.spaceAssignments || [];
                      const escalations = agreement.escalations || [];
                      let floorRent = 0;
                      
                      for (let idx = 0; idx < spaceAssignments.length; idx++) {
                        const assignment = spaceAssignments[idx];
                        const uniqueId = assignment.id || `${assignment.floorId}_${idx}`;
                        let assignmentRent = assignment.amount || 0;
                        
                        for (const escalation of escalations) {
                          if (!escalation.date) continue;
                          const escalationDate = new Date(escalation.date);
                          if (escalationDate > today) continue;
                          
                          const floorEsc = escalation.floorWiseEscalations?.find((f: any) => 
                            f.floorId === uniqueId || f.floorId === assignment.floorId || f.floorId === assignment.id
                          );
                          if (floorEsc && floorEsc.percentage) {
                            assignmentRent = assignmentRent + (assignmentRent * floorEsc.percentage / 100);
                          }
                        }
                        floorRent += assignmentRent;
                      }
                      
                      const maintenanceCharges = agreement.maintenanceCharges?.filter((c: any) => !c.isIncludedInRent) || [];
                      const maintenanceTotal = maintenanceCharges.reduce((sum: number, c: any) => sum + ((c.sqft || 0) * (c.ratePerSqft || 0)), 0);
                      
                      const generalCharges = agreement.generalCharges?.filter((c: any) => {
                        if (c.dueDate) {
                          const dueDate = new Date(c.dueDate);
                          return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
                        }
                        return false;
                      }) || [];
                      const generalTotal = generalCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
                      
                      const serviceCharge = agreement.serviceCharge;
                      const serviceTotal = (serviceCharge && !serviceCharge.isIncludedInRent) ? (serviceCharge.amount || 0) : 0;
                      
                      const totalRent = Math.round(floorRent + maintenanceTotal + generalTotal + serviceTotal);
                      
                      const startDate = agreement.leaseAgreementDate || agreement.createdAt;
                      const endDate = agreement.leaseEndDate;
                      
                      return (
                        <div key={agreement.id || index} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">Agreement :{agreement.agreement_id || `${index + 1}`}</h4>
                                <Badge variant={agreement.status === 'Active' ? 'default' : 'secondary'}>
                                  {agreement.status || 'Active'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Spaces:</span>
                                  <span className="ml-1 font-medium">{spaceCount}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Rent:</span>
                                  <span className="ml-1 font-medium text-green-700">₹{totalRent.toLocaleString()}</span>
                                </div>
                                {startDate && (
                                  <div>
                                    <span className="text-muted-foreground">Start:</span>
                                    <span className="ml-1">{new Date(startDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {endDate && (
                                  <div>
                                    <span className="text-muted-foreground">End:</span>
                                    <span className="ml-1">{new Date(endDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {canEdit && onEditAgreement && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onEditAgreement(tenant, index)}
                                title="View and Edit Agreement"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Quick Summary */}
                          {agreement.spaceAssignments && agreement.spaceAssignments.length > 0 && (
                            <div className="text-xs text-muted-foreground border-t pt-2 mt-2 flex justify-between items-center">
                              <div>
                                <span className="font-medium">Spaces: </span>
                                {agreement.spaceAssignments.map((sa: any, idx: number) => (
                                  <span key={idx}>
                                    {sa.buildingName} {sa.floorName || `Floor ${sa.floor}`}
                                    {idx < agreement.spaceAssignments.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                              {canEdit && onDeleteAgreement && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => onDeleteAgreement(tenant, index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                  title="Delete Agreement"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <TenantPaymentsTab agreements={agreements} />
            )}
          </div>
        </div>


      </DialogContent>
    </Dialog>
  );
}
