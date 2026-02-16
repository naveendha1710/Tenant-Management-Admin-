import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Wallet, Building, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentGatewayProps {
  invoice: {
    id: string;
    invoice_number: string;
    amount: number;
    description: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentId: string) => void;
}

export function PaymentGateway({ invoice, isOpen, onClose, onPaymentSuccess }: PaymentGatewayProps) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState('method'); // method, details, processing, success
  const { toast } = useToast();

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcessing(true);
    setPaymentStep('processing');

    // Simulate payment processing
    setTimeout(() => {
      const paymentId = `PAY-${Date.now()}`;
      setPaymentStep('success');
      setProcessing(false);
      
      setTimeout(() => {
        onPaymentSuccess(paymentId);
        onClose();
        setPaymentStep('method');
        toast({
          title: "Payment Successful",
          description: `Payment of ₹${invoice.amount.toLocaleString()} completed successfully`,
        });
      }, 2000);
    }, 3000);
  };

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, RuPay' },
    { id: 'upi', name: 'UPI Payment', icon: Wallet, description: 'PhonePe, GPay, Paytm' },
    { id: 'netbanking', name: 'Net Banking', icon: Building, description: 'All major banks' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Gateway</DialogTitle>
          <DialogDescription>
            Pay invoice {invoice.invoice_number} - ₹{invoice.amount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        {paymentStep === 'method' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Select Payment Method</Label>
              {paymentMethods.map((method) => (
                <Card 
                  key={method.id} 
                  className={`cursor-pointer transition-colors ${
                    paymentMethod === method.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <method.icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-muted-foreground">{method.description}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={() => setPaymentStep('details')} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {paymentStep === 'details' && (
          <form onSubmit={handlePayment} className="space-y-4">
            {paymentMethod === 'card' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input id="cardName" placeholder="John Doe" required />
                </div>
              </>
            )}

            {paymentMethod === 'upi' && (
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input id="upiId" placeholder="user@paytm" required />
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <div className="space-y-2">
                <Label htmlFor="bank">Select Bank</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sbi">State Bank of India</SelectItem>
                    <SelectItem value="hdfc">HDFC Bank</SelectItem>
                    <SelectItem value="icici">ICICI Bank</SelectItem>
                    <SelectItem value="axis">Axis Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span>Amount to Pay:</span>
                <span className="text-lg font-bold">₹{invoice.amount.toLocaleString()}</span>
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'Processing...' : `Pay ₹${invoice.amount.toLocaleString()}`}
              </Button>
            </div>
          </form>
        )}

        {paymentStep === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
            <p className="text-muted-foreground">Please wait while we process your payment...</p>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">Your payment has been processed successfully.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}