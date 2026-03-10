import { useState, useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
  subtitle?: string;
}

export default function QRScannerModal({ 
  isOpen, 
  onClose, 
  onScan, 
  title = "SCAN ASSET",
  subtitle = "Scan QR code or enter Asset ID manually"
}: QRScannerModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [isOpen]);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: 250,
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [0],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (error) {
      console.error('Scanner error:', error);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        // Ignore transition errors
      } finally {
        try {
          scannerRef.current.clear();
        } catch (error) {
          // Ignore clear errors
        }
      }
      scannerRef.current = null;
    }
  };

  const handleManualConfirm = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <QrCode className="h-16 w-16 text-blue-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        
        <div className="space-y-4">
          <div id="qr-reader" className="relative rounded-lg overflow-hidden" style={{ width: '100%', height: '300px' }}></div>
          <p className="text-center text-sm text-gray-600 mt-2 animate-pulse">Searching for QR code...</p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">OR ENTER MANUALLY</span>
            </div>
          </div>

          <Input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualConfirm()}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter Asset ID"
            disabled={loading}
          />
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualConfirm}
              disabled={!manualInput.trim() || loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}