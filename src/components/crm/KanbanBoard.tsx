import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, User, Phone, Mail, Calendar } from 'lucide-react';
import { fetchLeads, updateLead } from '@/services/crmService';
import { createTenantApplication } from '@/services/tenantApplicationService';

interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  value: number;
  status: 'inquiry' | 'negotiation' | 'quotation' | 'tenant';
  priority: 'low' | 'medium' | 'high';
  followUpDate?: string;
}

const columns = [
  { id: 'inquiry', title: 'Inquiry', color: 'bg-blue-100 border-blue-200' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-yellow-100 border-yellow-200' },
  { id: 'quotation', title: 'Quotation/Agreement', color: 'bg-purple-100 border-purple-200' },
  { id: 'tenant', title: 'Tenant', color: 'bg-green-100 border-green-200' }
];

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const crmLeads = await fetchLeads();
      const transformedLeads = crmLeads.map(lead => ({
        id: lead.id,
        company: lead.company_name,
        contact: lead.contact_person,
        email: lead.email,
        phone: lead.phone || '',
        value: parseInt(lead.budget_range?.match(/\d+/)?.[0] || '25000'),
        status: lead.status,
        priority: lead.urgency === 'high' ? 'high' : lead.urgency === 'medium' ? 'medium' : 'low',
        followUpDate: lead.follow_up_date
      }));
      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const moveCard = async (leadId: string, newStatus: Lead['status']) => {
    if (newStatus === 'tenant') {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        try {
          await createTenantApplication({
            id: lead.id,
            company_name: lead.company,
            contact_person: lead.contact,
            email: lead.email,
            phone: lead.phone,
            space_type: 'office',
            space_requirement: '10 seats',
            monthly_rent: lead.value,
            security_deposit: lead.value * 3
          });
          alert('Tenant application created! Admin approval required.');
        } catch (error) {
          alert('Failed to create tenant application');
          return;
        }
      }
    }
    
    try {
      await updateLead(leadId, { status: newStatus });
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 pb-4 min-w-max">
      {columns.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-80 min-w-80">
          <Card className={`${column.color} h-full`}>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">
                  {column.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {getLeadsByStatus(column.id).length}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {getLeadsByStatus(column.id).map((lead) => (
                <Card key={lead.id} className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{lead.company}</h4>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(lead.priority)}`} />
                      </div>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{lead.contact}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.followUpDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(lead.followUpDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-green-600">
                          ₹{lead.value.toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {lead.priority}
                        </Badge>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-1 pt-2">
                        {column.id !== 'tenant' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              const nextStatus = columns[columns.findIndex(c => c.id === column.id) + 1]?.id;
                              if (nextStatus) moveCard(lead.id, nextStatus as Lead['status']);
                            }}
                          >
                            Move →
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {getLeadsByStatus(column.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No leads in {column.title.toLowerCase()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}