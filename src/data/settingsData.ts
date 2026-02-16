// Settings Data Structure
export interface OrganizationProfile {
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  supportEmail: string;
}

export interface PaymentCycleConfig {
  defaultCycle: 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Annually';
  reminderDays: number[];
  gracePeriod: number;
}

export interface EmailSMSSettings {
  emailProvider: 'SMTP' | 'SendGrid' | 'AWS SES';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smsProvider: 'Twilio' | 'MSG91' | 'TextLocal';
  smsApiKey: string;
  smsApiSecret: string;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
}

export interface InvoiceTemplate {
  logoPosition: 'left' | 'center' | 'right';
  colorScheme: string;
  footerText: string;
  termsConditions: string;
  showSignature: boolean;
  signatureImage: string;
}

export interface TaxGSTSettings {
  gstRate: number;
  taxType: 'CGST/SGST' | 'IGST';
  hsnCode: string;
  enableGST: boolean;
  companyGSTIN: string;
}

export interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Monthly';
  backupTime: string;
  retentionDays: number;
}

export interface SystemSettings {
  organization: OrganizationProfile;
  paymentCycle: PaymentCycleConfig;
  emailSMS: EmailSMSSettings;
  invoiceTemplate: InvoiceTemplate;
  taxGST: TaxGSTSettings;
  backup: BackupSettings;
}

// Default settings
const defaultSettings: SystemSettings = {
  organization: {
    name: 'Rathinam Nexus Suite',
    logo: '/logo.png',
    address: '123 Business Park, Coimbatore, Tamil Nadu 641021',
    phone: '+91-422-1234567',
    email: 'admin@rathinam.edu',
    website: 'https://rathinam.edu',
    supportEmail: 'support@rathinam.edu'
  },
  paymentCycle: {
    defaultCycle: 'Monthly',
    reminderDays: [7, 3, 1],
    gracePeriod: 5
  },
  emailSMS: {
    emailProvider: 'SMTP',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smsProvider: 'Twilio',
    smsApiKey: '',
    smsApiSecret: '',
    enableEmailNotifications: true,
    enableSMSNotifications: false
  },
  invoiceTemplate: {
    logoPosition: 'left',
    colorScheme: '#3b82f6',
    footerText: 'Thank you for your business!',
    termsConditions: 'Payment due within 30 days of invoice date.',
    showSignature: true,
    signatureImage: ''
  },
  taxGST: {
    gstRate: 18,
    taxType: 'CGST/SGST',
    hsnCode: '997212',
    enableGST: true,
    companyGSTIN: ''
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'Daily',
    backupTime: '02:00',
    retentionDays: 30
  }
};

let currentSettings = { ...defaultSettings };

export const settingsService = {
  getSettings: () => ({ ...currentSettings }),
  
  updateOrganization: (data: Partial<OrganizationProfile>) => {
    currentSettings.organization = { ...currentSettings.organization, ...data };
  },
  
  updatePaymentCycle: (data: Partial<PaymentCycleConfig>) => {
    currentSettings.paymentCycle = { ...currentSettings.paymentCycle, ...data };
  },
  
  updateEmailSMS: (data: Partial<EmailSMSSettings>) => {
    currentSettings.emailSMS = { ...currentSettings.emailSMS, ...data };
  },
  
  updateInvoiceTemplate: (data: Partial<InvoiceTemplate>) => {
    currentSettings.invoiceTemplate = { ...currentSettings.invoiceTemplate, ...data };
  },
  
  updateTaxGST: (data: Partial<TaxGSTSettings>) => {
    currentSettings.taxGST = { ...currentSettings.taxGST, ...data };
  },
  
  updateBackup: (data: Partial<BackupSettings>) => {
    currentSettings.backup = { ...currentSettings.backup, ...data };
  },
  
  resetToDefaults: () => {
    currentSettings = { ...defaultSettings };
  }
};