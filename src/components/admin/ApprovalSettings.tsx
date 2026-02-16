import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Plus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { userService } from '@/data/userData';

interface ApprovalThreshold {
  id: string;
  minAmount: number;
  maxAmount: number;
  approvers: string[]; // Order matters for sequential approval
  requireAll: boolean; // true = sequential (1st→2nd→...→Nth), false = simultaneous (all at once, all must approve)
}

export function ApprovalSettings() {
  const [thresholds, setThresholds] = useState<ApprovalThreshold[]>([
    {
      id: '1',
      minAmount: 0,
      maxAmount: 50000,
      approvers: [],
      requireAll: false
    }
  ]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadSettings();
  }, []);

  const loadUsers = async () => {
    const users = await userService.getAllUsers();
    setAvailableUsers(users.filter(u => u.isApprover));
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('approvalSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.thresholds) setThresholds(settings.thresholds);
      if (settings.emailNotifications !== undefined) setEmailNotifications(settings.emailNotifications);
    }
  };

  const handleSaveSettings = () => {
    const settings = { thresholds, emailNotifications };
    localStorage.setItem('approvalSettings', JSON.stringify(settings));
    toast({
      title: "Success",
      description: "Approval settings saved successfully"
    });
  };

  const addThreshold = () => {
    const newThreshold: ApprovalThreshold = {
      id: Date.now().toString(),
      minAmount: thresholds[thresholds.length - 1]?.maxAmount + 1 || 50001,
      maxAmount: 100000,
      approvers: [],
      requireAll: false
    };
    setThresholds([...thresholds, newThreshold]);
  };

  const removeThreshold = (id: string) => {
    if (thresholds.length > 1) {
      setThresholds(thresholds.filter(t => t.id !== id));
    }
  };

  const updateThreshold = (id: string, updates: Partial<ApprovalThreshold>) => {
    setThresholds(thresholds.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleApprover = (thresholdId: string, userId: string) => {
    const threshold = thresholds.find(t => t.id === thresholdId);
    if (!threshold) return;
    
    const approvers = threshold.approvers.includes(userId)
      ? threshold.approvers.filter(id => id !== userId)
      : [...threshold.approvers, userId];
    
    updateThreshold(thresholdId, { approvers });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Approval Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure approval thresholds and assign approvers for different invoice amounts
          </p>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-medium">Approval Thresholds</Label>
            <Button onClick={addThreshold} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Threshold
            </Button>
          </div>
          
          <div className="space-y-4">
            {thresholds.map((threshold, index) => (
              <Card key={threshold.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">Threshold #{index + 1}</CardTitle>
                    {thresholds.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeThreshold(threshold.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Min Amount (₹)</Label>
                      <Input
                        type="number"
                        value={threshold.minAmount}
                        onChange={(e) => updateThreshold(threshold.id, { minAmount: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Max Amount (₹)</Label>
                      <Input
                        type="number"
                        value={threshold.maxAmount}
                        onChange={(e) => updateThreshold(threshold.id, { maxAmount: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Approval Flow</Label>
                      <Select 
                        value={threshold.requireAll ? 'sequential' : 'simultaneous'} 
                        onValueChange={(value) => updateThreshold(threshold.id, { requireAll: value === 'sequential' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simultaneous">Simultaneous (All must approve)</SelectItem>
                          <SelectItem value="sequential">Sequential (First→Next→...→Last)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      Approvers ({threshold.approvers.length} selected)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {availableUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${threshold.id}-${user.id}`}
                            checked={threshold.approvers.includes(user.id)}
                            onCheckedChange={() => toggleApprover(threshold.id, user.id)}
                          />
                          <Label htmlFor={`${threshold.id}-${user.id}`} className="text-sm">
                            {user.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {threshold.approvers.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">
                          {threshold.requireAll ? 'Sequential Order:' : 'All Approvers:'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {threshold.approvers.map((approverId, index) => {
                            const user = availableUsers.find(u => u.id === approverId);
                            return (
                              <Badge key={approverId} variant="secondary" className="text-xs">
                                {threshold.requireAll && `${index + 1}. `}{user?.name || 'Unknown'}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send email notifications for pending approvals
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          
          <div className="pt-4 border-t">
            <Button onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}