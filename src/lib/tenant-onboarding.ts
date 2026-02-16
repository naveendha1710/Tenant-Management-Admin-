// Mock service for demo mode
export interface CreateApplicationData {
  tenant_name: string
  email: string
  quotation_id: string
}

export interface ApproveApplicationData {
  applicationId: string
  email: string
  password: string
  tenant_name: string
  quotation_id: string
}

export const tenantOnboardingService = {
  // Create application from CRM (mock)
  async createApplication(data: CreateApplicationData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      status: 'pending',
      created_at: new Date().toISOString()
    }
  },

  // Get pending applications (mock)
  async getPendingApplications() {
    await new Promise(resolve => setTimeout(resolve, 500))
    return []
  },

  // Approve application and create tenant (mock)
  async approveApplication(data: ApproveApplicationData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return { success: true, authUser: { id: 'mock-user-id' } }
  },

  // Reject application (mock)
  async rejectApplication(applicationId: string) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true }
  }
}