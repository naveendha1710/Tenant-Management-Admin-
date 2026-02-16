import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Mail, 
  Phone, 
  MessageCircle,
  Settings,
  Check,
  X
} from 'lucide-react';

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

interface NotificationServiceProps {
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationService({ notifications, onMarkAsRead, onMarkAllAsRead }: NotificationServiceProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    whatsapp: true,
    inApp: true
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return '💰';
      case 'document_expiry':
        return '📄';
      case 'maintenance':
        return '🔧';
      case 'lease':
        return '📋';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <Label htmlFor="email">Email</Label>
              </div>
              <Switch
                id="email"
                checked={preferences.email}
                onCheckedChange={(checked) => updatePreference('email', checked)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                <Label htmlFor="sms">SMS</Label>
              </div>
              <Switch
                id="sms"
                checked={preferences.sms}
                onCheckedChange={(checked) => updatePreference('sms', checked)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <Label htmlFor="whatsapp">WhatsApp</Label>
              </div>
              <Switch
                id="whatsapp"
                checked={preferences.whatsapp}
                onCheckedChange={(checked) => updatePreference('whatsapp', checked)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-500" />
                <Label htmlFor="inApp">In-App</Label>
              </div>
              <Switch
                id="inApp"
                checked={preferences.inApp}
                onCheckedChange={(checked) => updatePreference('inApp', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Stay updated with important alerts</CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                    !notification.read 
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 text-lg">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-grow">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkAsRead(notification.id)}
                          className="h-8 w-8 p-0"
                        >
                          {notification.read ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p>You're all caught up! New notifications will appear here.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels Status */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Channels</CardTitle>
          <CardDescription>Current status of notification channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Email</span>
              </div>
              <Badge className={preferences.email ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {preferences.email ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                <span className="text-sm">SMS</span>
              </div>
              <Badge className={preferences.sms ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {preferences.sms ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">WhatsApp</span>
              </div>
              <Badge className={preferences.whatsapp ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {preferences.whatsapp ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-500" />
                <span className="text-sm">In-App</span>
              </div>
              <Badge className={preferences.inApp ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {preferences.inApp ? 'Active' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}