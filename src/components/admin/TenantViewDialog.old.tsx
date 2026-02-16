import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, Eye } from 'lucide-react';
import { type Tenant } from '@/data/tenantData';

interface TenantViewDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tenant: Tenant) => void;
  canEdit?: boolean;
}

export function TenantViewDialog({ tenant, isOpen, onClose, onEdit, canEdit = true }: TenantViewDialogProps) {
  if (!tenant) return null;

  const calculateCurrentRent = (tenant: Tenant) => {
    const today = new Date();
    const escalations = tenant.escalations || [];
    const spaceAssignments = tenant.spaceAssignments || [];
    
    // Calculate escalated floor rent
    let currentBaseRent = 0;
    for (const assignment of spaceAssignments) {
      let floorRent = assignment.amount || 0;
      
      for (const escalation of escalations) {
        if (!escalation.date) continue;
        const escalationDate = new Date(escalation.date);
        if (escalationDate > today) continue;
        
        // Apply escalation percentage directly to floor rent
        if (escalation.percentage) {
          floorRent = Math.round(floorRent + (floorRent * escalation.percentage / 100));
        }
      }
      currentBaseRent += floorRent;
    }
    
    if (currentBaseRent === 0) currentBaseRent = tenant.rentAmount || 0;
    
    const maintenanceTotal = tenant.maintenanceCharges?.reduce((sum: number, charge: any) => {
      const totalSqft = tenant.spaceAssignments?.reduce((s: number, a: any) => s + (a.assignedSqft || 0), 0) || 0;
      return sum + (totalSqft * (charge.ratePerSqft || 0));
    }, 0) || 0;
    
    const generalChargesTotal = tenant.generalCharges?.reduce((sum: number, charge: any) => {
      const dueDate = charge.dueDate ? new Date(charge.dueDate) : null;
      const isDueThisMonth = dueDate && dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
      return sum + (isDueThisMonth ? (charge.amount || 0) : 0);
    }, 0) || 0;
    
    return Math.round(currentBaseRent + maintenanceTotal + generalChargesTotal);
  };

  const currentRent = calculateCurrentRent(tenant);
  const hasEscalations = tenant.escalations && tenant.escalations.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full h-[98vh]">
        <DialogHeader>
          <DialogTitle>Tenant Details - {tenant.company}</DialogTitle>
          <DialogDescription>
            Complete information for {tenant.company}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Company Name</Label>
              <p className="text-sm">{tenant.company}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Contact Person</Label>
              <p className="text-sm">{tenant.name}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-sm">{tenant.email || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
              <p className="text-sm">{tenant.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Address</Label>
              <p className="text-sm">{tenant.address || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">ID Proof</Label>
              <p className="text-sm">{tenant.idProof || 'Not provided'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Login Password</Label>
              <p className="text-sm font-mono">{tenant.password || 'admin123'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Company Type</Label>
              <Badge variant={tenant.isGstCompany ? 'default' : 'secondary'}>
                {tenant.isGstCompany ? 'GST Registered' : 'Non-GST'}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">GST Number</Label>
              <p className="text-sm">{tenant.gstNumber || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">TAN Number</Label>
              <p className="text-sm">{tenant.tanNumber || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">PAN Number</Label>
              <p className="text-sm">{tenant.panNumber || 'Not provided'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <Badge variant={tenant.status === 'Active' ? 'default' : 'secondary'}>
                {tenant.status}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Company Group</Label>
              <p className="text-sm">{tenant.companyGroup || 'Not assigned'}</p>
            </div>
          </div>

          {/* Lease Agreement Details */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Lease Agreement Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Monthly Floor Rent</Label>
                  <p className="text-sm">₹{(() => {
                    const today = new Date();
                    const escalations = tenant.escalations || [];
                    const spaceAssignments = tenant.spaceAssignments || [];
                    let currentBaseRent = 0;
                    
                    for (const assignment of spaceAssignments) {
                      let floorRent = assignment.amount || 0;
                      
                      for (const escalation of escalations) {
                        if (!escalation.date) continue;
                        const escalationDate = new Date(escalation.date);
                        if (escalationDate > today) continue;
                        
                        if (escalation.percentage) {
                          floorRent = Math.round(floorRent + (floorRent * escalation.percentage / 100));
                        }
                      }
                      currentBaseRent += floorRent;
                    }
                    
                    return (currentBaseRent || tenant.rentAmount || 0).toLocaleString();
                  })()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Maintenance Charges</Label>
                  <p className="text-sm">₹{(() => {
                    const maintenanceTotal = tenant.maintenanceCharges?.reduce((sum: number, charge: any) => {
                      const totalSqft = tenant.spaceAssignments?.reduce((s: number, a: any) => s + (a.assignedSqft || 0), 0) || 0;
                      return sum + (totalSqft * (charge.ratePerSqft || 0));
                    }, 0) || 0;
                    return maintenanceTotal.toLocaleString();
                  })()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">General Charges</Label>
                  <p className="text-sm">₹{(() => {
                    const today = new Date();
                    const generalChargesTotal = tenant.generalCharges?.reduce((sum: number, charge: any) => {
                      const dueDate = charge.dueDate ? new Date(charge.dueDate) : null;
                      const isDueThisMonth = dueDate && dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
                      return sum + (isDueThisMonth ? (charge.amount || 0) : 0);
                    }, 0) || 0;
                    return generalChargesTotal.toLocaleString();
                  })()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Rent (Total)</Label>
                  <p className="text-sm font-medium text-blue-600">₹{currentRent.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Security Deposit</Label>
                  <p className="text-sm">{tenant.securityDeposit ? `₹${tenant.securityDeposit.toLocaleString()}` : 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Payment Cycle</Label>
                  <p className="text-sm">{tenant.paymentCycle || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Lease Agreement Date</Label>
                  <p className="text-sm">{tenant.leaseAgreementDate ? new Date(tenant.leaseAgreementDate).toLocaleDateString() : 'Not provided'}</p>
                </div>
                <div />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Operation Date</Label>
                  <p className="text-sm">{tenant.operationDate ? new Date(tenant.operationDate).toLocaleDateString() : 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rent Commencement Date</Label>
                  <p className="text-sm">{tenant.rentCommencementDate ? new Date(tenant.rentCommencementDate).toLocaleDateString() : 'Not provided'}</p>
                </div>
              </div>
              

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Lock-in Period</Label>
                  <p className="text-sm">{tenant.lockInPeriod ? `${tenant.lockInPeriod} months` : 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Lease End Date</Label>
                  <p className="text-sm">{tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toLocaleDateString() : 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rent Escalation Schedule */}
          {hasEscalations && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Rent Escalation Schedule</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Base Rent:</span> ₹{(tenant.rentAmount || 0).toLocaleString()}
                </div>
                {(tenant.escalations || []).map((escalation, index) => {
                  const escalationDate = new Date(escalation.date);
                  const today = new Date();
                  const isApplied = escalationDate <= today;
                  
                  let calculatedRent = tenant.rentAmount || 0;
                  for (let i = 0; i <= index; i++) {
                    calculatedRent = calculatedRent + (calculatedRent * (tenant.escalations?.[i]?.percentage || 0) / 100);
                  }
                  
                  return (
                    <div key={escalation.id} className="space-y-1">
                      <div className={`text-sm flex justify-between items-center p-2 rounded ${
                        isApplied ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
                      }`}>
                        <span>
                          Escalation #{index + 1} on {new Date(escalation.date).toLocaleDateString()}
                        </span>
                        <Badge variant={isApplied ? 'default' : 'secondary'} className="text-xs">
                          {isApplied ? 'Applied' : 'Pending'}
                        </Badge>
                      </div>
                      {escalation.floorWiseEscalations && escalation.floorWiseEscalations.length > 0 && (
                        <div className="ml-4 text-xs space-y-0.5">
                          {escalation.floorWiseEscalations.map((floor: any) => (
                            <div key={floor.floorId} className="text-gray-600">
                              • {floor.floorName}: {floor.percentage}% (₹{floor.currentRent.toLocaleString()} → ₹{floor.newRent.toLocaleString()})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          {tenant.documents && tenant.documents.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Documents ({tenant.documents.length})</h3>
              <div className="grid grid-cols-1 gap-2">
                {tenant.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : ''} • {new Date(doc.uploadedAt).toLocaleDateString()}
                          {doc.hardCopyLocation && <span className="ml-2 text-blue-600">📍 {doc.hardCopyLocation}</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Charges */}
          {tenant.maintenanceCharges && tenant.maintenanceCharges.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Maintenance Charges</h3>
              <div className="space-y-3">
                {tenant.maintenanceCharges.map((charge: any) => {
                  const totalSqft = tenant.spaceAssignments?.reduce((sum: number, a: any) => sum + (a.assignedSqft || 0), 0) || 0;
                  const totalAmount = totalSqft * (charge.ratePerSqft || 0);
                  return (
                    <div key={charge.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Sqft</Label>
                          <p className="text-sm font-medium">{totalSqft.toLocaleString()} sqft</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Rate/Sqft</Label>
                          <p className="text-sm">₹{charge.ratePerSqft || 0}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                          <p className="text-sm font-medium text-green-800">₹{totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-900">Total Maintenance Charges</span>
                    <span className="text-xl font-bold text-blue-900">
                      ₹{tenant.maintenanceCharges.reduce((sum: number, charge: any) => {
                        const totalSqft = tenant.spaceAssignments?.reduce((s: number, a: any) => s + (a.assignedSqft || 0), 0) || 0;
                        return sum + (totalSqft * (charge.ratePerSqft || 0));
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Charges */}
          {tenant.generalCharges && tenant.generalCharges.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">General Charges</h3>
              <div className="space-y-3">
                {tenant.generalCharges.map((charge: any) => {
                  const today = new Date();
                  const dueDate = charge.dueDate ? new Date(charge.dueDate) : null;
                  const isDueThisMonth = dueDate && dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
                  
                  return (
                    <div key={charge.id} className={`border rounded-lg p-4 ${isDueThisMonth ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Charge Name</Label>
                          <p className="text-sm font-medium">{charge.chargeName || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                          <p className="text-sm font-medium text-green-800">₹{(charge.amount || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                          <p className="text-sm">{charge.dueDate ? new Date(charge.dueDate).toLocaleDateString() : 'Not set'}</p>
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
            </div>
          )}

          {/* Space Assignments */}
          {tenant.spaceAssignments && tenant.spaceAssignments.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Space Assignments</h3>
              <div className="space-y-3">
                {tenant.spaceAssignments.map((assignment, index) => (
                  <div key={index}>
                    <div className="font-medium text-sm mb-1">{assignment.buildingName} - Floor {assignment.floor}</div>
                    <div className="ml-4 space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {assignment.assignedSqft} sqft @ ₹{assignment.ratePerSqft}/sqft = ₹{assignment.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t text-sm">
                  <span className="font-medium">Total: </span>
                  {tenant.spaceAssignments.length} assignments • {tenant.spaceAssignments.reduce((sum, a) => sum + a.assignedSqft, 0).toLocaleString()} sqft • ₹{tenant.spaceAssignments.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}/month
                </div>
              </div>
            </div>
          )}
          {/* Monthly Rent Summary */}
          <div className="border-t pt-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-blue-900">Monthly Rent Summary</h3>
              <div className="space-y-3">
                {(() => {
                  const today = new Date();
                  const baseRent = tenant.rentAmount || 0;
                  const escalations = tenant.escalations || [];
                  const spaceAssignments = tenant.spaceAssignments || [];
                  
                  // Calculate escalated rent for each floor
                  let currentBaseRent = 0;
                  let hasAppliedEscalation = false;
                  
                  for (const assignment of spaceAssignments) {
                    let floorRent = assignment.amount || 0;
                    
                    // Apply all escalations
                    for (const escalation of escalations) {
                      if (!escalation.date) continue;
                      const escalationDate = new Date(escalation.date);
                      if (escalationDate > today) continue;
                      
                      if (escalation.percentage) {
                        floorRent = Math.round(floorRent + (floorRent * escalation.percentage / 100));
                        hasAppliedEscalation = true;
                      }
                    }
                    
                    currentBaseRent += floorRent;
                  }
                  
                  // If no escalations applied, use base rent
                  if (currentBaseRent === 0) {
                    currentBaseRent = baseRent;
                  }
                  
                  const maintenanceTotal = tenant.maintenanceCharges?.reduce((sum: number, charge: any) => {
                    const totalSqft = tenant.spaceAssignments?.reduce((s: number, a: any) => s + (a.assignedSqft || 0), 0) || 0;
                    return sum + (totalSqft * (charge.ratePerSqft || 0));
                  }, 0) || 0;
                  
                  const generalChargesTotal = tenant.generalCharges?.reduce((sum: number, charge: any) => {
                    const dueDate = charge.dueDate ? new Date(charge.dueDate) : null;
                    const isDueThisMonth = dueDate && dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
                    return sum + (isDueThisMonth ? (charge.amount || 0) : 0);
                  }, 0) || 0;
                  
                  return (
                    <>
                      {hasAppliedEscalation && (
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Original Base Rent:</span>
                          <span className="line-through">₹{baseRent.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">{hasAppliedEscalation ? 'Current Base Rent (After Escalation):' : 'Base Rent:'}</span>
                        <span className="font-medium">₹{currentBaseRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">Maintenance Charges:</span>
                        <span className="font-medium">₹{maintenanceTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">General Charges (This Month):</span>
                        <span className="font-medium">₹{generalChargesTotal.toLocaleString()}</span>
                      </div>
                      <div className="border-t-2 border-blue-300 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-blue-900">Total Monthly Rent:</span>
                          <span className="text-2xl font-bold text-green-700">
                            ₹{(currentBaseRent + maintenanceTotal + generalChargesTotal).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {canEdit && onEdit && (
            <Button onClick={() => onEdit(tenant)} className="flex-1">
              <Edit className="h-3 w-3 mr-1" />
              Edit Tenant
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}