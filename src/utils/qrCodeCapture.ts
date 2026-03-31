import { AssetForPrint } from '@/types/zebraPrinter.types';

export class QRCodeCapture {
  static captureQRCodesForAssets(assets: AssetForPrint[]): Record<string, string> {
    const qrCodes: Record<string, string> = {};
    
    console.log('Capturing QR codes for assets:', assets.map(a => a.asset_id));
    
    for (const asset of assets) {
      const qrCode = this.findQRCodeForAsset(asset.asset_id);
      if (qrCode) {
        qrCodes[asset.asset_id] = qrCode;
        console.log(`Captured QR code for ${asset.asset_id}`);
      } else {
        console.log(`No QR code found for ${asset.asset_id}`);
      }
    }
    
    console.log(`Captured ${Object.keys(qrCodes).length}/${assets.length} QR codes`);
    return qrCodes;
  }
  
  private static findQRCodeForAsset(assetId: string): string | null {
    const assetElements = document.querySelectorAll(
      '[data-asset-id], .asset-card, .asset-item, .asset-row, tr, .card'
    );
    
    for (const element of assetElements) {
      const text = element.textContent || '';
      const html = element.innerHTML || '';
      
      if (text.includes(assetId) || html.includes(assetId)) {
        const images = element.querySelectorAll('img');
        
        for (const img of images) {
          if (this.isLikelyQRCode(img)) {
            return img.src;
          }
        }
        
        const canvases = element.querySelectorAll('canvas');
        for (const canvas of canvases) {
          if (this.isLikelyQRCode(canvas)) {
            return (canvas as HTMLCanvasElement).toDataURL();
          }
        }
      }
    }
    
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      if (this.isLikelyQRCode(img) && this.isNearAssetId(img, assetId)) {
        return img.src;
      }
    }
    
    return null;
  }
  
  private static isLikelyQRCode(element: HTMLImageElement | HTMLCanvasElement): boolean {
    const isSquare = Math.abs(element.width - element.height) <= 10;
    const reasonableSize = element.width >= 50 && element.width <= 500;
    
    let hasQRKeywords = false;
    if (element instanceof HTMLImageElement) {
      const src = element.src.toLowerCase();
      const alt = (element.alt || '').toLowerCase();
      hasQRKeywords = src.includes('qr') || alt.includes('qr') || 
                     src.includes('code') || alt.includes('code');
    }
    
    const isDataURL = element instanceof HTMLImageElement && 
                     element.src.startsWith('data:image');
    
    return (isSquare && reasonableSize) || hasQRKeywords || isDataURL;
  }
  
  private static isNearAssetId(img: HTMLImageElement, assetId: string): boolean {
    const imgRect = img.getBoundingClientRect();
    const searchRadius = 200;
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent && node.textContent.includes(assetId)) {
        const parent = node.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const distance = Math.sqrt(
            Math.pow(imgRect.x - parentRect.x, 2) + 
            Math.pow(imgRect.y - parentRect.y, 2)
          );
          
          if (distance < searchRadius) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  static captureQRCodeFromAssetPage(assetId: string): string | null {
    console.log(`Looking for QR code on asset page for: ${assetId}`);
    
    const images = document.querySelectorAll('img');
    
    for (const img of images) {
      if (this.isLikelyQRCode(img)) {
        console.log(`Found QR code on asset page for ${assetId}`);
        return img.src;
      }
    }
    
    for (const img of images) {
      if (Math.abs(img.width - img.height) <= 5 && img.width >= 100) {
        console.log(`Found square image (likely QR) for ${assetId}`);
        return img.src;
      }
    }
    
    console.log(`No QR code found on asset page for ${assetId}`);
    return null;
  }
}

export const captureQRCodesForAssets = QRCodeCapture.captureQRCodesForAssets.bind(QRCodeCapture);
