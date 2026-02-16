import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
// Mock data mode - no backend required
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Building2, FileText, User, Upload } from 'lucide-react';

const tenantSchema = z.object({
  // Company Information
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  sector: z.string().min(1, 'Please select a sector'),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  gst_number: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[0-9A-Z]{1}$/, 'Invalid GST format'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  
  // Contact Information
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().regex(/^[+]?[0-9]{10,15}$/, 'Invalid phone number'),
  representative_name: z.string().min(2, 'Representative name is required'),
  representative_email: z.string().email('Invalid email address'),
  representative_phone: z.string().regex(/^[+]?[0-9]{10,15}$/, 'Invalid phone number'),
  
  // Requirements
  space_requirements: z.string().min(10, 'Please describe your space requirements'),
  expected_occupancy: z.string().min(1, 'Expected occupancy is required'),
  budget_range: z.string().min(1, 'Budget range is required'),
  move_in_date: z.string().min(1, 'Expected move-in date is required'),
});

type TenantFormData = z.infer<typeof tenantSchema>;

const sectors = [
  'Software Development',
  'AI/ML',
  'Digital Marketing',
  'Consulting',
  'E-commerce',
  'Fintech',
  'Healthcare Tech',
  'EdTech',
  'Gaming',
  'Other'
];

const budgetRanges = [
  '₹10,000 - ₹25,000',
  '₹25,000 - ₹50,000',
  '₹50,000 - ₹75,000',
  '₹75,000 - ₹1,00,000',
  '₹1,00,000 - ₹2,00,000',
  '₹2,00,000+'
];

interface TenantRegistrationProps {
  onSuccess?: () => void;
}

export function TenantRegistration({ onSuccess }: TenantRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 4;

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      company_name: '',
      sector: '',
      pan_number: '',
      gst_number: '',
      address: '',
      contact_email: '',
      contact_phone: '',
      representative_name: '',
      representative_email: '',
      representative_phone: '',
      space_requirements: '',
      expected_occupancy: '',
      budget_range: '',
      move_in_date: '',
    },
  });

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof TenantFormData)[] => {
    switch (step) {
      case 1:
        return ['company_name', 'sector', 'pan_number', 'gst_number', 'address'];
      case 2:
        return ['contact_email', 'contact_phone', 'representative_name', 'representative_email', 'representative_phone'];
      case 3:
        return ['space_requirements', 'expected_occupancy', 'budget_range', 'move_in_date'];
      default:
        return [];
    }
  };

  const onSubmit = async (data: TenantFormData) => {
    setIsSubmitting(true);
    
    // Mock submission
    setTimeout(() => {
      toast.success('Tenant registration submitted successfully! (Demo Mode)');
      onSuccess?.();
      setIsSubmitting(false);
    }, 1000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Company Information</h3>
            </div>
            
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sector"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Sector *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business sector" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sectors.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pan_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDE1234F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gst_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="33ABCDE1234F1Z5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Address *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter complete address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="company@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="representative_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representative Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter representative name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="representative_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Representative Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="representative@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="representative_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Representative Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Space Requirements</h3>
            </div>

            <FormField
              control={form.control}
              name="space_requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Requirements *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your space requirements (e.g., office size, number of seats, specific amenities needed)"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_occupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Occupancy *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10-15 employees" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="move_in_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Move-in Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budget_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Range *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {budgetRanges.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Review & Submit</h3>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Registration Summary</h4>
              <p><strong>Company:</strong> {form.getValues('company_name')}</p>
              <p><strong>Sector:</strong> {form.getValues('sector')}</p>
              <p><strong>Representative:</strong> {form.getValues('representative_name')}</p>
              <p><strong>Email:</strong> {form.getValues('contact_email')}</p>
              <p><strong>Budget:</strong> {form.getValues('budget_range')}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your application will be reviewed by our team</li>
                <li>• You'll receive an email confirmation within 24 hours</li>
                <li>• Our representative will contact you to schedule a site visit</li>
                <li>• Document verification and lease agreement process will follow</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Tenant Registration</CardTitle>
        <CardDescription>
          Complete the registration process to become a tenant at Rathinam Tech Park
        </CardDescription>
        <div className="mt-4">
          <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {renderStepContent()}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}