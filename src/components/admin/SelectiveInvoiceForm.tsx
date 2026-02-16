import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { invoiceApprovalService, type ApprovalRule } from '@/data/invoiceApprovalData';
import { useToast } from '@/hooks/use-toast';

interface SelectiveInvoiceFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function SelectiveInvoiceForm({ onSubmit, onCancel }: SelectiveInvoiceFormProps) {
  const [formData, setFormData] = useState({
    tenantName: '',
    amount: '',
    category: '',
    type: 'Manual' as 'Manual' | 'Auto-generated',
    requiresApproval: false,
    approvers: [] as string[],
    approvalType: 'Sequential' as 'Sequential' | 'Parallel',
    description: ''
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [applicableRule, setApplicableRule] = useState<ApprovalRule | null>(null);
  const [suggestedApprovers, setSuggestedApprovers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const users = invoiceApprovalService.getUsers();
    setAvailableUsers(users);
  }, []);

  useEffect(() => {
    if (formData.amount && formData.category && formData.type) {
      const amount = parseFloat(formData.amount);
      if (!isNaN(amount)) {
        const rule = invoiceApprovalService.findApplicableRule(amount, formData.category, formData.type);
        setApplicableRule(rule);
        
        if (rule) {
          // Find applicable threshold
          const threshold = rule.amountThresholds.find(t => 
            amount >= t.minAmount && amount <= t.maxAmount
          );
          
          // Check for category-specific rules
          const categoryRule = rule.categoryRules.find(c => c.category === formData.category);
          
          const suggested = categoryRule ? categoryRule.approverIds : 
                          threshold ? threshold.approverIds : 
                          rule.defaultApprovers;
          
          setSuggestedApprovers(suggested);
          setFormData(prev => ({ 
            ...prev, 
            approvers: suggested,
            approvalType: categoryRule?.sequential ? 'Sequential' : 'Parallel'
          }));
        } else {
          setSuggestedApprovers([]);
          setFormData(prev => ({ ...prev, approvers: [] }));
        }
      }
    }
  }, [formData.amount, formData.category, formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const invoiceData = {
      tenantName: formData.tenantName,
      amount: parseFloat(formData.amount),
      category: formData.category,
      type: formData.type,
      requiresApproval: formData.requiresApproval,
      status: formData.requiresApproval ? 'Pending Approval' : 'Draft',
      createdBy: 'current-user'
    };

    let approvalData = null;
    if (formData.requiresApproval && formData.approvers.length > 0) {
      approvalData = {
        requiresApproval: true,
        approvers: formData.approvers.map((userId, index) => {
          const user = availableUsers.find(u => u.id === userId);
          return {
            userId,
            userName: user?.name || 'Unknown',
            order: index + 1,
            status: 'Pending' as const
          };
        }),
        approvalType: formData.approvalType,
        status: 'Pending' as const,
        currentStep: 1,
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
        approvalHistory: []
      };
    }

    onSubmit({ invoice: invoiceData, approval: approvalData });
  };

  const toggleApprover = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.includes(userId)
        ? prev.approvers.filter(id => id !== userId)
        : [...prev.approvers, userId]
    }));
  };

  const getApprovalPreview = () => {
    if (!formData.requiresApproval || formData.approvers.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium">Approval Flow Preview:</div>
        <div className="flex items-center gap-2 flex-wrap">
          {formData.approvers.map((userId, index) => {
            const user = availableUsers.find(u => u.id === userId);
            return (
              <div key={userId} className="flex items-center gap-2">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-sm">{user?.name}</span>
                </div>
                {index < formData.approvers.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {formData.approvalType} approval flow
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Basic Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenantName">Tenant/Vendor Name *</Label>
              <Input
                id="tenantName"
                value={formData.tenantName}
                onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
                placeholder="Enter tenant or vendor name"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Invoice Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Auto-generated">Auto-generated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter invoice description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approval Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Approval Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="requiresApproval"
              checked={formData.requiresApproval}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresApproval: checked }))}
            />
            <Label htmlFor="requiresApproval">Require Approval?</Label>
          </div>

          {formData.requiresApproval && (
            <div className="space-y-4 p-4 border rounded-lg">
              {/* Applicable Rule Display */}
              {applicableRule && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Applicable Rule: {applicableRule.name}</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    Based on amount (₹{formData.amount}) and category ({formData.category})
                  </p>
                </div>
              )}

              {/* Approval Type */}
              <div>
                <Label>Approval Type</Label>
                <Select value={formData.approvalType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, approvalType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sequential">Sequential (One after another)</SelectItem>
                    <SelectItem value="Parallel">Parallel (All can approve simultaneously)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Approver Selection */}
              <div>
                <Label>Select Approvers *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={formData.approvers.includes(user.id)}
                        onCheckedChange={() => toggleApprover(user.id)}
                      />
                      <Label htmlFor={user.id} className="text-sm">
                        {user.name} ({user.role})
                      </Label>
                      {suggestedApprovers.includes(user.id) && (
                        <Badge variant="secondary" className="text-xs">Suggested</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Preview */}
              {getApprovalPreview()}
            </div>
          )}

          {formData.requiresApproval && formData.approvers.length === 0 && (
            <div className="flex items-center gap-2 text-orange-600 p-3 bg-orange-50 rounded border border-orange-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Please select at least one approver</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="flex-1"
          disabled={!formData.tenantName || !formData.amount || !formData.category || 
                   (formData.requiresApproval && formData.approvers.length === 0)}
        >
          Create Invoice
        </Button>
      </div>
    </form>
  );
}