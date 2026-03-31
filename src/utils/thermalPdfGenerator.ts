import jsPDF from 'jspdf';

interface AssetForPrint {
  asset_id: string;
  asset_name?: string;
  asset_category?: string;
  asset_type?: string;
  serial_number?: string;
  building?: string;
  floor?: string;
  room_rack?: string;
}

export interface ThermalPdfOptions {
  assets: AssetForPrint[];
  providedQRCodes?: Record<string, string>;
  filename?: string;
}

/**
 * Generate thermal printer PDF with custom 78mm x 25mm page size
 * EXTREME HIGH PERFECT - DIVIDER LINE SHIFTED TO CLEAR QR BORDER
 */
export async function generateThermalPDF(options: ThermalPdfOptions): Promise<void> {
  const { assets, providedQRCodes = {}, filename = 'Asset_Labels.pdf' } = options;
  
  if (assets.length === 0) {
    throw new Error('No assets provided for PDF generation');
  }

  // --- PRE-PROCESS: Rotate all QR codes 90 degrees Right (Clockwise) ---
  console.log('🔄 Pre-processing and rotating QR codes 90 degrees...');
  const rotatedQRCodes: Record<string, string> = {};
  
  for (const asset of assets) {
    const qr = providedQRCodes[asset.asset_id];
    if (qr) {
      try {
        rotatedQRCodes[asset.asset_id] = await rotateImage90DegreesRight(qr);
      } catch (error) {
        console.warn(`⚠️ Failed to rotate QR for ${asset.asset_id}, using original.`);
        rotatedQRCodes[asset.asset_id] = qr;
      }
    }
  }

  const pdf = new jsPDF({ 
    orientation: 'landscape', 
    unit: 'mm', 
    format: [78, 25] 
  });

  console.log(`📄 Processing ${Math.ceil(assets.length / 2)} pages with ${assets.length} total labels`);

  let isFirstPage = true;

  for (let i = 0; i < assets.length; i += 2) {
    if (!isFirstPage) {
      pdf.addPage([78, 25], 'landscape');
    }
    
    try {
      // Draw Left Label
      drawSingleLabel(pdf, assets[i], rotatedQRCodes[assets[i].asset_id], 0);

      // Draw Right Label
      if (assets[i + 1]) {
        drawSingleLabel(pdf, assets[i + 1], rotatedQRCodes[assets[i + 1].asset_id], 39);
      }
    } catch (error: any) {
      console.error(`❌ Error drawing PDF vectors for assets:`, error);
      throw new Error(`Failed to generate PDF vectors - ${error.message}`);
    }

    isFirstPage = false;
  }

  pdf.save(filename);
}

/**
 * Utility to safely rotate a Base64 image 90 degrees clockwise via HTML5 Canvas
 */
async function rotateImage90DegreesRight(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      canvas.width = img.height;
      canvas.height = img.width;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64); 
        return;
      }
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Image failed to load for rotation'));
    img.src = base64;
  });
}

/**
 * Helper to draw a single label using exact millimeter columns matching the target design
 */
function drawSingleLabel(
  pdf: jsPDF, 
  asset: AssetForPrint, 
  qrCodeBase64: string | undefined, 
  startX: number
) {
  if (!asset) return;

  const labelHeight = 25; 
  const centerY = 12.5; 

  pdf.setFont("helvetica", "bold");

  const drawRotatedText = (text: string, xCenter: number, baseFontSize: number, isWhite: boolean) => {
    pdf.setTextColor(isWhite ? 255 : 0, isWhite ? 255 : 0, isWhite ? 255 : 0);
    
    let currentFontSize = baseFontSize;
    pdf.setFontSize(currentFontSize);
    let textWidth = pdf.getTextWidth(text);
    
    while (textWidth > 24 && currentFontSize > 3) {
      currentFontSize -= 0.5;
      pdf.setFontSize(currentFontSize);
      textWidth = pdf.getTextWidth(text);
    }
    
    const startY = centerY - (textWidth / 2);
    const fontSizeMm = currentFontSize * 0.3527;
    const startXAdjusted = startX + xCenter - (fontSizeMm * 0.35); 
    
    pdf.text(text, startXAdjusted, startY, { angle: -90 });
  };

  // --- 1. Left Black Bar (DO NOT PEAL) | Width: 3.6mm ---
  pdf.setFillColor(0, 0, 0);
  pdf.rect(startX, 0, 3.6, labelHeight, 'F');
  drawRotatedText("DO NOT PEAL", 1.8, 6.8, true);

  // --- 2. Email Column --- 
  drawRotatedText("asset@rathinam.in", 5.65, 8, false);

  // --- 3. Asset ID Column --- 
  // ADJUSTMENT: Text center moved left to 10.0 to stay centered between 7.7 and 12.2
  drawRotatedText(asset.asset_id, 10.0, 8.5, false);

  // --- 4. QR Code Area ---
  const qrSize = 20.7; 
  const qrX = startX + 13.3; 
  const qrY = 2.15; 

  if (qrCodeBase64) {
    // Draw the image
    pdf.addImage(qrCodeBase64, 'PNG', qrX, qrY, qrSize, qrSize);
    
    // Solid black border around the QR code
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.rect(qrX, qrY, qrSize, qrSize, 'S'); 
  } else {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(qrX, qrY, qrSize, qrSize, 'S'); 
    drawRotatedText("NO QR", 24.05, 8, false);
  }

  // --- 5. Right Black Bar (RATHINAM GROUPS) | Width: 4.5mm ---
  pdf.setFillColor(0, 0, 0);
  pdf.rect(startX + 34.5, 0, 4.5, labelHeight, 'F');
  drawRotatedText("RATHINAM GROUP", 36.35, 9, true);

  // --- 6. Borders & Vertical Dividers ---
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4); 
  
  // Outer framing borders
  pdf.line(startX + 3.6, 0.2, startX + 34.5, 0.2);
  pdf.line(startX + 3.6, 24.8, startX + 34.5, 24.8);
  
  // Vertical dividers
  pdf.line(startX + 7.7, 0, startX + 7.7, labelHeight);  
  
  // ADJUSTMENT: Moved line left from 12.9 to 12.2 to clear the QR box
  pdf.line(startX + 12.2, 0, startX + 12.2, labelHeight); 
}

export function validateAssetsForPDF(assets: AssetForPrint[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(assets)) return ['Assets must be an array'];
  if (assets.length === 0) return ['At least one asset is required'];
  
  assets.forEach((asset, index) => {
    if (!asset.asset_id || typeof asset.asset_id !== 'string' || asset.asset_id.trim() === '') {
      errors.push(`Asset at index ${index} has invalid asset_id`);
    }
  });
  return errors;
}

export async function generateAssetLabelsPDF(
  assets: AssetForPrint[],
  qrCodes: Record<string, string> = {},
  filename: string = 'Asset_Labels.pdf'
): Promise<void> {
  const validationErrors = validateAssetsForPDF(assets);
  if (validationErrors.length > 0) throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  
  await generateThermalPDF({ assets, providedQRCodes: qrCodes, filename });
}