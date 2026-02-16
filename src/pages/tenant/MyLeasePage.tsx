import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Calendar, DollarSign, Loader2, CheckCircle, Building2, IndianRupee, X, FileText, TrendingUp, ChevronDown, Scale } from 'lucide-react';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Agreement {
  id: string;
  agreement_id: string;
  status: string;
  agreement_name: string;
  rent_amount: number;
  security_deposit: number;
  payment_cycle: string;
  lease_agreement_date: string;
  operation_date: string;
  rent_commencement_date: string;
  lease_end_date: string;
  lock_in_period: string;
  lease_tenure: string;
  space_assignments: any[];
  escalations: any[];
  documents: any[];
  maintenance_charges: any[];
  general_charges: any[];
  service_charge: any;
}

export default function MyLeasePage() {
  const { tenant, loading } = useTenantProfile();
  const { user } = useAuth();
  const [currentRent] = useState(84885);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [expandedAgreementId, setExpandedAgreementId] = useState<string | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);

  useEffect(() => {
    const fetchAgreements = async () => {
      if (!user?.email) return;
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .single();

        if (tenantData) {
          const { data } = await supabase
            .from('agreements')
            .select('*')
            .eq('tenant_id', tenantData.id)
            .order('created_at', { ascending: false });
          
          if (data) {
            const enrichedAgreements = data.map((agreement) => {
              if (agreement.space_assignments?.length > 0) {
                const enrichedSpaces = agreement.space_assignments.map((space: any) => ({
                  ...space,
                  building: space.buildingName || 'Unknown Building',
                  floor: space.floor === 0 ? 'Ground Floor' : `Floor ${space.floor}`,
                  occupied_sqft: space.assignedSqft || 0,
                  spaceType: space.spaceType || 'N/A'
                }));
                return { ...agreement, space_assignments: enrichedSpaces };
              }
              return agreement;
            });
            setAgreements(enrichedAgreements);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchAgreements();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout title="My Lease" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!tenant) {
    return (
      <DashboardLayout title="My Lease" subtitle="No tenant data found">
        <Card>
          <CardContent className="p-6">
            <p>Unable to load lease information. Please contact support.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Lease" subtitle="View your lease agreement and space details">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">My Agreements ({agreements.length})</h3>
          {agreements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">No agreements found</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agreements.map((agreement) => {
                const primarySpace = agreement.space_assignments?.[0];
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                
                // Calculate escalated rent per floor
                const spaceAssignments = agreement.space_assignments || [];
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
                
                // If no space assignments with amounts, use rent_amount
                if (floorRent === 0 && agreement.rent_amount) {
                  floorRent = agreement.rent_amount;
                }
                
                floorRent = Math.round(floorRent);
                
                const maintenanceCharges = agreement.maintenance_charges?.filter((c: any) => !c.isIncludedInRent) || [];
                const maintenanceTotal = maintenanceCharges.reduce((sum: number, c: any) => sum + ((c.sqft || 0) * (c.ratePerSqft || 0)), 0);
                
                const generalCharges = agreement.general_charges?.filter((c: any) => {
                  if (c.dueDate) {
                    const dueDate = new Date(c.dueDate);
                    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
                  }
                  return false;
                }) || [];
                const generalTotal = generalCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
                
                const serviceCharge = agreement.service_charge;
                const serviceTotal = (serviceCharge && !serviceCharge.isIncludedInRent) ? (serviceCharge.amount || 0) : 0;
                
                const totalMonthlyRent = floorRent + maintenanceTotal + generalTotal + serviceTotal;
                const isExpanded = expandedAgreementId === agreement.id;
                
                if (expandedAgreementId && !isExpanded) return null;
                
                return (
                  <div
                    key={agreement.id}
                    className={`bg-white border rounded-lg p-4 transition-all cursor-pointer ${
                      isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-3 shadow-xl' : 'hover:shadow-lg'
                    }`}
                    onClick={() => setExpandedAgreementId(isExpanded ? null : agreement.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">{agreement.agreement_id ? `Agreement: ${agreement.agreement_id}` : 'Unnamed Agreement'}</h4>
                      <Badge className={agreement.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {agreement.status}
                      </Badge>
                    </div>
                    
                    {!isExpanded ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <IndianRupee className="w-4 h-4" />
                          <span className="font-semibold">₹{totalMonthlyRent.toLocaleString()}/month</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(agreement.rent_commencement_date).toLocaleDateString()} - {new Date(agreement.lease_end_date).toLocaleDateString()}</span>
                        </div>
                        {primarySpace && (
                          <>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Building2 className="w-4 h-4" />
                              <span>{primarySpace.building}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{primarySpace.floor} - {primarySpace.occupied_sqft} sqft</span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Status</div>
                            <div className="text-lg font-semibold">{agreement.status}</div>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Monthly Rent</div>
                            <div className="text-lg font-semibold">₹{totalMonthlyRent.toLocaleString()}</div>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Security Deposit</div>
                            <div className="text-lg font-semibold">₹{agreement.security_deposit?.toLocaleString() || 0}</div>
                          </div>
                        </div>

                        <div className="bg-gray-50 border rounded-lg p-4">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />Tenure Details
                          </h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-600">Lease Agreement Date:</span> <span className="ml-2 font-medium">{agreement.lease_agreement_date ? new Date(agreement.lease_agreement_date).toLocaleDateString() : 'N/A'}</span></div>
                            <div><span className="text-gray-600">Operation Date:</span> <span className="ml-2 font-medium">{agreement.operation_date ? new Date(agreement.operation_date).toLocaleDateString() : 'N/A'}</span></div>
                            <div><span className="text-gray-600">Rent Commencement Date:</span> <span className="ml-2 font-medium">{new Date(agreement.rent_commencement_date).toLocaleDateString()}</span></div>
                            <div><span className="text-gray-600">Lease End Date:</span> <span className="ml-2 font-medium">{new Date(agreement.lease_end_date).toLocaleDateString()}</span></div>
                            <div><span className="text-gray-600">Lock-in Period:</span> <span className="ml-2 font-medium">{agreement.lock_in_period || 'N/A'} months</span></div>
                            <div><span className="text-gray-600">Lease Tenure:</span> <span className="ml-2 font-medium">{agreement.lease_tenure || 'N/A'} months</span></div>
                            <div><span className="text-gray-600">Payment Cycle:</span> <span className="ml-2 font-medium">{agreement.payment_cycle || 'N/A'}</span></div>
                          </div>
                        </div>

                        {agreement.space_assignments?.length > 0 && (
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <Building2 className="w-5 h-5" />Space Assignments
                            </h3>
                            <div className="space-y-2">
                              {agreement.space_assignments.map((space: any, idx: number) => (
                                <div key={idx} className="bg-white border rounded p-3 text-sm">
                                  <div className="font-medium">{space.building}</div>
                                  <div className="text-gray-600">{space.floor} | {(space.occupied_sqft || 0).toLocaleString()} sqft | {space.spaceType}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-50 border rounded-lg p-4">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <IndianRupee className="w-5 h-5" />Monthly Payments
                          </h3>
                          <div className="space-y-3">
                            <div className="bg-white border rounded p-2 text-sm flex justify-between font-medium">
                              <span>Floor Rent</span>
                              <span>₹{floorRent.toLocaleString()}</span>
                            </div>
                            
                            {maintenanceCharges.length > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-2">Maintenance Charges</div>
                                {maintenanceCharges.map((charge: any, idx: number) => (
                                  <div key={idx} className="bg-white border rounded p-2 text-sm flex justify-between">
                                    <span>{charge.category}</span>
                                    <span>₹{((charge.sqft || 0) * (charge.ratePerSqft || 0)).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {generalCharges.length > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-2">General Charges</div>
                                {generalCharges.map((charge: any, idx: number) => (
                                  <div key={idx} className="bg-white border rounded p-2 text-sm flex justify-between">
                                    <span>{charge.category}</span>
                                    <span>₹{(charge.amount || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {serviceTotal > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-2">Service Charges</div>
                                <div className="bg-white border rounded p-2 text-sm flex justify-between">
                                  <span>Services: {serviceCharge.serviceNames?.join(', ') || 'N/A'}</span>
                                  <span>₹{serviceTotal.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between font-semibold text-lg">
                                <span>Total Monthly Payment</span>
                                <span>₹{totalMonthlyRent.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
