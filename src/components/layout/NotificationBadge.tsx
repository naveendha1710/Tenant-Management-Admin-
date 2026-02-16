import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useApplicationNotifications } from '@/hooks/useApplicationNotifications'
import { useAuth } from '@/contexts/AuthContext'

export function NotificationBadge() {
  const { role } = useAuth()
  const { pendingCount } = useApplicationNotifications()

  // Only show for admin roles
  if (role !== 'admin' && role !== 'super_admin') {
    return null
  }

  return (
    <div className="relative">
      <Bell className="h-5 w-5 text-gray-600" />
      {pendingCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </Badge>
      )}
    </div>
  )
}