export interface ApprovalRule {
  id: string;
  name: string;
  invoiceType: 'Manual' | 'Auto-generated';
  amountThresholds: AmountThreshold[];
  categoryRules: CategoryRule[];
  defaultApprovers: string[];
  excludeFromAutoCollection: boolean;
  isActive: boolean;
}

export interface AmountThreshold {
  minAmount: number;
  maxAmount: number;
  requiredApprovers: number;
  approverIds: string[];
  approvalFlow: ApprovalLevel[];
}

export interface ApprovalLevel {
  level: number;
  approverId: string;
  isRequired: boolean;
}

export interface CategoryRule {
  category: string;
  approverIds: string[];
  sequential: boolean;
}

export interface InvoiceApproval {
  id: string;
  invoiceId: string;
  requiresApproval: boolean;
  approvers: ApprovalUser[];
  approvalType: 'Sequential' | 'Parallel';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Partially Approved';
  currentStep: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  approvalHistory: ApprovalAction[];
}

export interface ApprovalUser {
  userId: string;
  userName: string;
  order: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedAt?: string;
  comments?: string;
}

export interface ApprovalAction {
  userId: string;
  userName: string;
  action: 'Approved' | 'Rejected';
  comments?: string;
  timestamp: string;
}

export interface SelectiveInvoice {
  id: string;
  invoiceId: string;
  tenantName: string;
  amount: number;
  category: string;
  type: 'Manual' | 'Auto-generated';
  requiresApproval: boolean;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid';
  createdBy: string;
  createdAt: string;
  approvalId?: string;
}

import { userService } from './userData';

const mockApprovalRules: ApprovalRule[] = [
  {
    id: 'rule-1',
    name: 'Standard Manual Invoice Approval',
    invoiceType: 'Manual',
    amountThresholds: [
      { 
        minAmount: 0, 
        maxAmount: 50000, 
        requiredApprovers: 1, 
        approverIds: ['3'], 
        approvalFlow: [{ level: 1, approverId: '3', isRequired: true }]
      },
      { 
        minAmount: 50001, 
        maxAmount: 100000, 
        requiredApprovers: 2, 
        approverIds: ['3', '2'], 
        approvalFlow: [
          { level: 1, approverId: '3', isRequired: true },
          { level: 2, approverId: '2', isRequired: true }
        ]
      },
      { 
        minAmount: 100001, 
        maxAmount: Infinity, 
        requiredApprovers: 3, 
        approverIds: ['3', '2', '1'], 
        approvalFlow: [
          { level: 1, approverId: '3', isRequired: true },
          { level: 2, approverId: '2', isRequired: true },
          { level: 3, approverId: '1', isRequired: true }
        ]
      }
    ],
    categoryRules: [
      { category: 'Maintenance', approverIds: ['2', '1'], sequential: true }
    ],
    defaultApprovers: ['3'],
    excludeFromAutoCollection: true,
    isActive: true
  }
];

const mockInvoices: SelectiveInvoice[] = [
  {
    id: 'inv-1',
    invoiceId: 'INV-2024-001',
    tenantName: 'TechStart Solutions',
    amount: 75000,
    category: 'Maintenance',
    type: 'Manual',
    requiresApproval: true,
    status: 'Pending Approval',
    createdBy: 'user-3',
    createdAt: '2024-01-15',
    approvalId: 'approval-1'
  },
  {
    id: 'inv-2',
    invoiceId: 'INV-2024-002',
    tenantName: 'Innovate Labs',
    amount: 25000,
    category: 'Utilities',
    type: 'Manual',
    requiresApproval: true,
    status: 'Approved',
    createdBy: 'user-3',
    createdAt: '2024-01-16',
    approvalId: 'approval-2'
  }
];

const mockApprovals: InvoiceApproval[] = [
  {
    id: 'approval-1',
    invoiceId: 'INV-2024-001',
    requiresApproval: true,
    approvers: [
      { userId: 'user-1', userName: 'Finance Head', order: 1, status: 'Pending' },
      { userId: 'user-2', userName: 'Director', order: 2, status: 'Pending' }
    ],
    approvalType: 'Sequential',
    status: 'Pending',
    currentStep: 1,
    createdBy: 'user-3',
    createdAt: '2024-01-15',
    approvalHistory: []
  },
  {
    id: 'approval-2',
    invoiceId: 'INV-2024-002',
    requiresApproval: true,
    approvers: [
      { userId: 'user-3', userName: 'Accountant', order: 1, status: 'Approved', approvedAt: '2024-01-16', comments: 'Approved - within budget' }
    ],
    approvalType: 'Sequential',
    status: 'Approved',
    currentStep: 1,
    createdBy: 'user-3',
    createdAt: '2024-01-16',
    completedAt: '2024-01-16',
    approvalHistory: [
      { userId: 'user-3', userName: 'Accountant', action: 'Approved', comments: 'Approved - within budget', timestamp: '2024-01-16T10:30:00Z' }
    ]
  }
];

class InvoiceApprovalService {
  private rules: ApprovalRule[] = [...mockApprovalRules];
  private invoices: SelectiveInvoice[] = [...mockInvoices];
  private approvals: InvoiceApproval[] = [...mockApprovals];
  private subscribers: (() => void)[] = [];

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(callback => callback());
  }

  // Rules
  getApprovalRules(): ApprovalRule[] {
    return this.rules.filter(rule => rule.isActive);
  }

  createApprovalRule(rule: Omit<ApprovalRule, 'id'>): ApprovalRule {
    const newRule: ApprovalRule = {
      ...rule,
      id: `rule-${Date.now()}`
    };
    this.rules.push(newRule);
    this.notify();
    return newRule;
  }

  updateApprovalRule(id: string, updates: Partial<ApprovalRule>): void {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      this.notify();
    }
  }

  // Invoices
  getInvoices(): SelectiveInvoice[] {
    return this.invoices;
  }

  createInvoice(invoice: Omit<SelectiveInvoice, 'id' | 'invoiceId'>): SelectiveInvoice {
    const newInvoice: SelectiveInvoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceId: `INV-2024-${String(this.invoices.length + 1).padStart(3, '0')}`
    };
    this.invoices.push(newInvoice);
    this.notify();
    return newInvoice;
  }

  updateInvoice(id: string, updates: Partial<SelectiveInvoice>): void {
    const index = this.invoices.findIndex(inv => inv.id === id);
    if (index !== -1) {
      this.invoices[index] = { ...this.invoices[index], ...updates };
      this.notify();
    }
  }

  // Approvals
  getApprovals(): InvoiceApproval[] {
    return this.approvals;
  }

  getPendingApprovalsForUser(userId: string): InvoiceApproval[] {
    return this.approvals.filter(approval => {
      if (approval.status !== 'Pending' && approval.status !== 'Partially Approved') return false;
      return approval.approvers.some(approver => 
        approver.userId === userId && approver.status === 'Pending'
      );
    });
  }

  createApproval(approval: Omit<InvoiceApproval, 'id'>): InvoiceApproval {
    const newApproval: InvoiceApproval = {
      ...approval,
      id: `approval-${Date.now()}`
    };
    this.approvals.push(newApproval);
    this.notify();
    return newApproval;
  }

  processApproval(approvalId: string, userId: string, action: 'Approved' | 'Rejected', comments?: string): void {
    const approval = this.approvals.find(a => a.id === approvalId);
    if (!approval) return;

    const approver = approval.approvers.find(a => a.userId === userId);
    if (!approver) return;

    // Update approver status
    approver.status = action;
    approver.approvedAt = new Date().toISOString();
    approver.comments = comments;

    // Add to history
    approval.approvalHistory.push({
      userId,
      userName: approver.userName,
      action,
      comments,
      timestamp: new Date().toISOString()
    });

    // Update overall status
    if (action === 'Rejected') {
      approval.status = 'Rejected';
      approval.completedAt = new Date().toISOString();
    } else {
      const pendingApprovers = approval.approvers.filter(a => a.status === 'Pending');
      if (pendingApprovers.length === 0) {
        approval.status = 'Approved';
        approval.completedAt = new Date().toISOString();
      } else {
        approval.status = 'Partially Approved';
        if (approval.approvalType === 'Sequential') {
          approval.currentStep += 1;
        }
      }
    }

    // Update invoice status
    const invoice = this.invoices.find(inv => inv.invoiceId === approval.invoiceId);
    if (invoice) {
      invoice.status = approval.status === 'Approved' ? 'Approved' : 
                     approval.status === 'Rejected' ? 'Rejected' : 'Pending Approval';
    }

    this.notify();
  }

  // Utility functions
  getApprovalById(id: string): InvoiceApproval | undefined {
    return this.approvals.find(approval => approval.id === id);
  }

  async getUsers() {
    // Get all app users excluding tenants (users without tenant-specific roles)
    const users = await userService.getAllUsers();
    return users
      .filter(user => user.isActive)
      .map(user => ({
        id: user.id,
        name: user.name,
        role: user.role
      }));
  }

  findApplicableRule(amount: number, category: string, type: 'Manual' | 'Auto-generated'): ApprovalRule | undefined {
    return this.rules.find(rule => {
      if (!rule.isActive || rule.invoiceType !== type) return false;
      
      // Check amount thresholds
      const threshold = rule.amountThresholds.find(t => 
        amount >= t.minAmount && amount <= t.maxAmount
      );
      if (!threshold) return false;

      // Check category rules
      const categoryRule = rule.categoryRules.find(c => c.category === category);
      return categoryRule ? true : rule.defaultApprovers.length > 0;
    });
  }
}

export const invoiceApprovalService = new InvoiceApprovalService();