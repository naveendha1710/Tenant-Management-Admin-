import qz from 'qz-tray';
import { QZTrayConfig } from '@/types/zebraPrinter.types';
import { RasterizedLabel } from './labelRasterizer';

class QZTrayService {
  private isInitialized = false;
  private config: QZTrayConfig | null = null;

  async connect(): Promise<QZTrayConfig> {
    try {
      // QZ Tray tries multiple ports automatically
      console.log('Attempting to connect to QZ Tray...');
      
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({
          retries: 5,
          delay: 1000
        });
      }

      const version = await qz.api.getVersion();
      console.log('✅ QZ Tray connected successfully, version:', version);
      
      this.isInitialized = true;
      this.config = {
        printerName: '',
        isConnected: true,
        version: version
      };

      return this.config;
    } catch (error) {
      console.error('❌ QZ Tray connection failed:', error);
      throw new Error('QZ Tray connection failed. Please ensure QZ Tray is running.');
    }
  }

  async disconnect(): Promise<void> {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
    }
    this.isInitialized = false;
    this.config = null;
  }

  async getPrinters(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.connect();
    }
    return await qz.printers.find();
  }

  async findZebraPrinter(): Promise<string | null> {
    const printers = await this.getPrinters();
    const zebraPrinter = printers.find(
      (printer) =>
        printer.toLowerCase().includes('zebra') ||
        printer.toLowerCase().includes('zd230')
    );
    return zebraPrinter || null;
  }

  /**
   * Convert base64 image to ZPL graphic field format
   */
  private async base64ToZPLGraphic(base64Data: string, width: number, height: number): Promise<string> {
    try {
      // Remove data URL prefix
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Create image element to get pixel data
      const img = new Image();
      img.src = base64Data;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      // Create canvas to extract pixel data
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get pixel data
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      
      // Convert to monochrome bitmap
      const bytesPerRow = Math.ceil(width / 8);
      const bitmapData: number[] = [];
      
      for (let y = 0; y < height; y++) {
        for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
          let byte = 0;
          
          for (let bit = 0; bit < 8; bit++) {
            const x = byteIndex * 8 + bit;
            if (x < width) {
              const pixelIndex = (y * width + x) * 4;
              const r = pixels[pixelIndex];
              const g = pixels[pixelIndex + 1];
              const b = pixels[pixelIndex + 2];
              
              // Convert to grayscale and threshold
              const gray = (r + g + b) / 3;
              const isBlack = gray < 128; // Threshold at 50%
              
              if (isBlack) {
                byte |= (1 << (7 - bit)); // Set bit for black pixels
              }
            }
          }
          
          bitmapData.push(byte);
        }
      }
      
      // Convert to hex string
      const hexData = bitmapData.map(byte => 
        byte.toString(16).padStart(2, '0').toUpperCase()
      ).join('');
      
      const totalBytes = bitmapData.length;
      
      // ZPL graphic field command
      // ^GFA = Graphic Field ASCII
      // Format: ^GFA,totalBytes,totalBytes,bytesPerRow,data
      return `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}`;
      
    } catch (error) {
      console.error('Error converting image to ZPL:', error);
      throw new Error('Failed to convert image to ZPL format');
    }
  }

  /**
   * Print rasterized label using ZPL image wrapper
   */
  async printRasterizedLabel(
    rasterizedLabel: RasterizedLabel,
    printerName: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.connect();
    }

    console.log('Printing rasterized label:', rasterizedLabel.assetId);
    console.log('Image dimensions:', rasterizedLabel.width, 'x', rasterizedLabel.height);

    try {
      // Convert image to ZPL bitmap format
      const graphicField = await this.base64ToZPLGraphic(
        rasterizedLabel.imageData,
        rasterizedLabel.width,
        rasterizedLabel.height
      );

      // Create minimal ZPL wrapper with rasterized image
      const zplCommand = [
        '^XA',  // Start format
        '^LH0,0',  // Label home position
        `^FO0,0`,  // Field origin at top-left
        graphicField,
        '^FS',  // Field separator
        '^XZ'   // End format
      ].join('\n');

      console.log('ZPL Command length:', zplCommand.length);
      console.log('ZPL Preview:', zplCommand.substring(0, 200) + '...');

      const config = qz.configs.create(printerName);
      
      const data = [
        {
          type: 'raw',
          format: 'command',
          data: zplCommand
        }
      ];

      await qz.print(config, data);
      console.log('Rasterized label printed successfully');
    } catch (error) {
      console.error('Print error:', error);
      throw new Error(`Print failed: ${error}`);
    }
  }

  /**
   * Print multiple rasterized labels
   */
  async printRasterizedBatch(
    rasterizedLabels: RasterizedLabel[],
    printerName: string
  ): Promise<void> {
    console.log(`Printing ${rasterizedLabels.length} rasterized labels...`);
    
    for (const label of rasterizedLabels) {
      await this.printRasterizedLabel(label, printerName);
      // Small delay between labels to prevent printer buffer overflow
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Batch printing completed');
  }

  /**
   * Legacy ZPL printing (deprecated - use rasterized printing instead)
   */
  async printZPL(zplCode: string, printerName: string): Promise<void> {
    console.warn('Legacy ZPL printing is deprecated. Use printRasterizedLabel instead.');
    
    if (!this.isInitialized) {
      await this.connect();
    }

    console.log('Printing to:', printerName);
    console.log('ZPL Code:', zplCode);

    try {
      const config = qz.configs.create(printerName);
      
      const data = [
        {
          type: 'raw',
          format: 'command',
          data: zplCode
        }
      ];

      console.log('Print config:', config);
      console.log('Print data:', data);

      await qz.print(config, data);
      console.log('Print job sent successfully');
    } catch (error) {
      console.error('Print error:', error);
      throw new Error(`Print failed: ${error}`);
    }
  }

  isConnected(): boolean {
    return this.isInitialized && qz.websocket.isActive();
  }

  getConfig(): QZTrayConfig | null {
    return this.config;
  }
}

export const qzTrayService = new QZTrayService();
