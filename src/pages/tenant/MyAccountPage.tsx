import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit, Save, X, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const mockAccountData = {
  company_name: 'TechStart Solutions',
  contact_person: 'John Doe',
  email: 'contact@techstart.com',
  phone: '+91 9876543210',
  address: '123 Tech Park, Electronic City, Bangalore - 560100',
  account_created: '2024-01-01',
  last_login: '2024-03-15T10:30:00Z',
  tenant_id: 'TNT-001'
};

export default function MyAccountPage() {
  const [accountData, setAccountData] = useState(mockAccountData);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(accountData);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSave = () => {
    setAccountData(formData);
    setIsEditing(false);
    toast({ title: "Success", description: "Account information updated successfully" });
  };

  const handleCancel = () => {
    setFormData(accountData);
    setIsEditing(false);
  };

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(false);
    toast({ title: "Success", description: "Password changed successfully" });
  };

  const handleDownloadArchive = async () => {
    setIsDownloading(true);
    try {
      if (!user || !user.token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-tenant-archive`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download archive");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = "tenant_data_archive.zip";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your data archive has been downloaded.",
      });
    } catch (error: any) {
      console.error("Download archive error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download data archive.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DashboardLayout title="My Account" subtitle="Manage your account information and settings">
      <div className="space-y-4 sm:space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Manage your company details and contact information</CardDescription>
              </div>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
              >
                {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tenant ID</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{accountData.tenant_id}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                {isEditing ? (
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{accountData.company_name}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                {isEditing ? (
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{accountData.contact_person}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{accountData.email}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{accountData.phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              {isEditing ? (
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>{accountData.address}</span>
                </div>
              )}
            </div>
            
            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Manage your password and security preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                  Change Password
                </Button>
              </div>
              
              {isChangingPassword && (
                <form onSubmit={handlePasswordChange} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" required />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit">Update Password</Button>
                    <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Account Activity</CardTitle>
            <CardDescription>Your account timeline and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(accountData.account_created).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(accountData.last_login).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Download a complete archive of your tenant data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleDownloadArchive}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isDownloading ? "Preparing Download..." : "Download Full Archive"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
