import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Lock, Clock, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { tenantProfileService } from '@/services/tenantProfileService';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  profileData: any;
}

export default function SecuritySection({ profileData }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.new.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setChangingPassword(true);
      await tenantProfileService.changePassword(
        user?.id || '',
        passwordData.current,
        passwordData.new
      );
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Check current password.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>Manage your account security and authentication</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Password */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                placeholder="Re-enter new password"
              />
            </div>

            <Button
              type="button"
              onClick={handlePasswordChange}
              disabled={changingPassword || !passwordData.current || !passwordData.new}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="font-medium">Enable 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
              <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
            </div>
            <Switch disabled />
          </div>
        </div>

        {/* Account Information */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Login</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {profileData?.last_login
                  ? new Date(profileData.last_login).toLocaleString()
                  : 'Never'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Created</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {profileData?.created_at
                  ? new Date(profileData.created_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-2">Security Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Use a strong, unique password</li>
            <li>Never share your password with anyone</li>
            <li>Enable two-factor authentication when available</li>
            <li>Log out from shared devices</li>
            <li>Review your account activity regularly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
