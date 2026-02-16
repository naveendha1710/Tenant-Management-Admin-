import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Users, Phone, Mail, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  space: {
    name: string;
    area: number;
    floor: number;
    building: string;
    seats: number;
  };
  tenant_id: string;
  monthly_rent: number;
  lease_start_date: string;
  lease_end_date: string;
}

interface ProfileManagementProps {
  profileData: ProfileData;
  onUpdateProfile: (data: Partial<ProfileData>) => void;
}

export function ProfileManagement({ profileData, onUpdateProfile }: ProfileManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profileData);
  const { toast } = useToast();

  const handleSave = () => {
    onUpdateProfile(formData);
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  const handleCancel = () => {
    setFormData(profileData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Company Information</CardTitle>
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
              <Label htmlFor="company_name">Company Name</Label>
              {isEditing ? (
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              ) : (
                <p className="text-sm font-medium">{profileData.company_name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant ID</Label>
              <p className="text-sm font-medium">{profileData.tenant_id}</p>
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
                <p className="text-sm font-medium">{profileData.contact_person}</p>
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
                  <p className="text-sm font-medium">{profileData.email}</p>
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
                  <p className="text-sm font-medium">{profileData.phone}</p>
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
              <p className="text-sm font-medium">{profileData.address}</p>
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

      {/* Space Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Space Allocation</CardTitle>
          <CardDescription>Your allocated space details and layout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Building className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium">{profileData.space.building}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <MapPin className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Space</p>
                <p className="font-medium">{profileData.space.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Seats</p>
                <p className="font-medium">{profileData.space.seats} seats</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Building className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Area</p>
                <p className="font-medium">{profileData.space.area} sq ft</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Space Layout</h4>
            <div className="grid grid-cols-6 gap-1 max-w-xs">
              {Array.from({ length: profileData.space.seats }, (_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs font-medium"
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Floor {profileData.space.floor} • {profileData.space.building}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lease Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Information</CardTitle>
          <CardDescription>Current lease terms and rental details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Monthly Rent</Label>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                ₹{profileData.monthly_rent.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Per month</p>
            </div>
            
            <div className="space-y-2">
              <Label>Lease Start Date</Label>
              <p className="font-medium">{new Date(profileData.lease_start_date).toLocaleDateString()}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Lease End Date</Label>
              <p className="font-medium">{new Date(profileData.lease_end_date).toLocaleDateString()}</p>
              <Badge variant="outline" className="text-xs">
                {Math.ceil((new Date(profileData.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Renewal Notice:</strong> Your lease expires in {Math.ceil((new Date(profileData.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days. 
              Contact administration for renewal options.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}