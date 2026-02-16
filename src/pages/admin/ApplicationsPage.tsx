import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Check, X, Bell, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react'

// Mock data for demo mode
const mockApplications = [
  {
    id: '1',
    tenant_name: 'TechStart Solutions',
    email: 'contact@techstart.com',
    quotation_id: 'QUO-2024-001',
    status: 'pending',
    created_at: new Date().toISOString()
  },
  {
    id: '2', 
    tenant_name: 'Digital Innovations',
    email: 'hello@digitalinnovations.com',
    quotation_id: 'QUO-2024-002',
    status: 'approved',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    tenant_name: 'Creative Agency',
    email: 'info@creativeagency.com', 
    quotation_id: 'QUO-2024-003',
    status: 'rejected',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
]

interface Application {
  id: string
  tenant_name: string
  email: string
  quotation_id: string
  status: string
  created_at: string
}

const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>(mockApplications)
  const [loading, setLoading] = useState(false)
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; app: Application | null }>({
    open: false,
    app: null
  })
  const [password, setPassword] = useState('')
  const [processing, setProcessing] = useState(false)

  const pendingCount = applications.filter(app => app.status === 'pending').length
  const approvedCount = applications.filter(app => app.status === 'approved').length
  const rejectedCount = applications.filter(app => app.status === 'rejected').length

  const handleApprove = async () => {
    if (!approveDialog.app || !password) return

    setProcessing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('Tenant approved and account created!')
      setApplications(prev => 
        prev.map(app => 
          app.id === approveDialog.app!.id 
            ? { ...app, status: 'approved' }
            : app
        )
      )
      setApproveDialog({ open: false, app: null })
      setPassword('')
    } catch (error) {
      toast.error('Failed to approve application')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (appId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Application rejected')
      setApplications(prev => 
        prev.map(app => 
          app.id === appId 
            ? { ...app, status: 'rejected' }
            : app
        )
      )
    } catch (error) {
      toast.error('Failed to reject application')
    }
  }

  return (
    <DashboardLayout title="Tenant Applications" subtitle="Review and approve tenant applications">
      <div className="space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-500">{applications.length}</div>
              <p className="text-xs text-muted-foreground">All submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-500">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-500">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">Accounts created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-500">{rejectedCount}</div>
              <p className="text-xs text-muted-foreground">Not approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <CardTitle>Applications List</CardTitle>
              {pendingCount > 0 && (
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  <Badge variant="secondary">{pendingCount} pending</Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Tenant Name</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Quotation ID</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{app.tenant_name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{app.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">{app.quotation_id}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          app.status === 'approved' ? 'default' :
                          app.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {app.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Dialog 
                              open={approveDialog.open && approveDialog.app?.id === app.id}
                              onOpenChange={(open) => setApproveDialog({ open, app: open ? app : null })}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Tenant Application</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Tenant Name</Label>
                                    <Input value={app.tenant_name} disabled />
                                  </div>
                                  <div>
                                    <Label>Email</Label>
                                    <Input value={app.email} disabled />
                                  </div>
                                  <div>
                                    <Label>Password</Label>
                                    <Input 
                                      type="password"
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      placeholder="Set tenant password"
                                    />
                                  </div>
                                  <Button 
                                    onClick={handleApprove}
                                    disabled={!password || processing}
                                    className="w-full"
                                  >
                                    {processing ? 'Creating Account...' : 'Create Tenant Account'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleReject(app.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default ApplicationsPage