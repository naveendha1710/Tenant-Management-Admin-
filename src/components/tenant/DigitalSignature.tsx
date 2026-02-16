import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  PenTool, 
  CheckCircle, 
  Clock, 
  FileText,
  Download,
  Eye,
  Trash2,
  Save
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'signed' | 'expired';
  created_date: string;
  signed_date?: string;
  expires_date?: string;
}

interface DigitalSignatureProps {
  documents: Document[];
  onSignDocument: (documentId: string, signature: string) => void;
}

export function DigitalSignature({ documents, onSignDocument }: DigitalSignatureProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isSigningDialogOpen, setIsSigningDialogOpen] = useState(false);
  const [signature, setSignature] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'expired':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedDocument) return;
    
    const signatureData = canvas.toDataURL();
    onSignDocument(selectedDocument.id, signatureData);
    setIsSigningDialogOpen(false);
    setSelectedDocument(null);
  };

  const pendingDocuments = documents.filter(doc => doc.status === 'pending');
  const signedDocuments = documents.filter(doc => doc.status === 'signed');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Pending Signatures */}
      {pendingDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-orange-500" />
              Pending Signatures
            </CardTitle>
            <CardDescription>Documents requiring your digital signature</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(document.status)}
                    </div>
                    <div>
                      <h4 className="font-medium">{document.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {document.type} • Created: {new Date(document.created_date).toLocaleDateString()}
                      </p>
                      {document.expires_date && (
                        <p className="text-sm text-orange-600">
                          Expires: {new Date(document.expires_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(document.status)}>
                      {document.status.toUpperCase()}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(document);
                        setIsSigningDialogOpen(true);
                      }}
                    >
                      <PenTool className="h-4 w-4 mr-1" />
                      Sign Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signed Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Signed Documents
          </CardTitle>
          <CardDescription>Your digitally signed documents</CardDescription>
        </CardHeader>
        <CardContent>
          {signedDocuments.length > 0 ? (
            <div className="space-y-3">
              {signedDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(document.status)}
                    </div>
                    <div>
                      <h4 className="font-medium">{document.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {document.type} • Signed: {document.signed_date ? new Date(document.signed_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(document.status)}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      SIGNED
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No signed documents</h3>
              <p>Signed documents will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital Signature Dialog */}
      <Dialog open={isSigningDialogOpen} onOpenChange={setIsSigningDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Digital Signature</DialogTitle>
            <DialogDescription>
              Sign the document: {selectedDocument?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Document Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <span className="font-medium">{selectedDocument?.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Document type: {selectedDocument?.type}
              </p>
              <p className="text-sm text-muted-foreground">
                Created: {selectedDocument?.created_date ? new Date(selectedDocument.created_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Draw your signature below:</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="border rounded cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ touchAction: 'none' }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Draw your signature using your mouse or touch device
                </p>
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Legal Notice:</strong> By signing this document digitally, you agree that your electronic signature 
                has the same legal effect as a handwritten signature. This signature will be legally binding.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSigningDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSignature}>
                <Save className="h-4 w-4 mr-1" />
                Sign Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}