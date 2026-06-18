import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabaseClient';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  headerBg:    '#1A2B4A',   // deep navy – top header bar
  sectionBg:   '#2C3E5D',   // slightly lighter navy – section title rows
  colHeaderBg: '#E8ECF0',   // light grey – column-header rows in list tables
  rowAlt:      '#F4F6F8',   // very light grey – alternating data rows
  rowWhite:    '#FFFFFF',
  border:      '#B0BEC5',   // medium grey border
  labelText:   '#546E7A',   // muted blue-grey for labels
  valueText:   '#1C2B3A',   // near-black for values
  headerText:  '#FFFFFF',
  sectionText: '#FFFFFF',
  colHeaderTxt:'#2C3E5D',
  footerText:  '#78909C',
  accentLine:  '#3A5A8A',   // thin accent under main header
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const hex2rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
};
const setFill   = (pdf: jsPDF, hex: string) => { const [r,g,b]=hex2rgb(hex); pdf.setFillColor(r,g,b); };
const setStroke = (pdf: jsPDF, hex: string) => { const [r,g,b]=hex2rgb(hex); pdf.setDrawColor(r,g,b); };
const setTxt    = (pdf: jsPDF, hex: string) => { const [r,g,b]=hex2rgb(hex); pdf.setTextColor(r,g,b); };
const fmt = (v: any, prefix = '') => (v == null || v === '' ? 'N/A' : `${prefix}${v}`);
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN') : 'N/A';
const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n-1) + '…' : s;

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateAssetDetailPDF(
  assets: any[],
  buildings: any[],
  floors: Record<string, string>,
  rooms: Record<string, string>,
  users: Record<string, string>,
  tenants: Record<string, string>,
  qrCodes?: Record<string, string>
) {
  const pdf    = new jsPDF('p', 'mm', 'a4');
  const PW     = pdf.internal.pageSize.getWidth();   // 210
  const PH     = pdf.internal.pageSize.getHeight();  // 297
  const M      = 12;          // left/right margin
  const TW     = PW - M * 2; // total table width  = 186

  const getBuildingName = (id?: string) => {
    if (!id) return 'N/A';
    return buildings.find(b => b.id === id)?.name || id;
  };

  // ── Per-asset loop ──────────────────────────────────────────────────────────
  for (let ai = 0; ai < assets.length; ai++) {
    const asset = assets[ai];
    if (ai > 0) pdf.addPage();

    // Fetch related data
    const { data: tickets   } = await supabase.from('tickets')
      .select('ticket_number,title,status,created_at')
      .eq('asset_id', asset.id).order('created_at',{ascending:false}).limit(3);

    const { data: movements } = await supabase.from('asset_movements')
      .select('movement_type,to_building,status,created_at')
      .eq('asset_id', asset.id).order('created_at',{ascending:false}).limit(3);

    const { data: audits    } = await supabase.from('asset_audits')
      .select('audit_type,condition,status,audit_date')
      .eq('asset_id', asset.id).order('audit_date',{ascending:false}).limit(3);

    const { data: services  } = await supabase.from('asset_service_records')
      .select('service_type,service_provider,cost,service_date')
      .eq('asset_id', asset.id).order('service_date',{ascending:false}).limit(3);

    // ── HEADER ────────────────────────────────────────────────────────────────
    const HDR_H = 32;
    setFill(pdf, C.headerBg);
    pdf.rect(0, 0, PW, HDR_H, 'F');

    // Accent line at bottom of header
    setFill(pdf, C.accentLine);
    pdf.rect(0, HDR_H - 1.5, PW, 1.5, 'F');

    setTxt(pdf, C.headerText);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('ASSET DETAILS', M, 14);

    // QR Code in header (right side) with white background
    const qrBoxSize = 26;
    const qrSize = 24;
    const qrX = PW - M - qrBoxSize;
    const qrY = 3;
    
    // White background for QR
    setFill(pdf, '#FFFFFF');
    pdf.rect(qrX, qrY, qrBoxSize, qrBoxSize, 'F');
    
    // Border around QR
    setStroke(pdf, C.border);
    pdf.setLineWidth(0.4);
    pdf.rect(qrX, qrY, qrBoxSize, qrBoxSize);
    
    // Use pre-generated QR code with logo if available, otherwise generate plain QR
    const qrDataUrl = qrCodes?.[asset.asset_id];
    if (qrDataUrl) {
      try {
        pdf.addImage(qrDataUrl, 'PNG', qrX + 1, qrY + 1, qrSize, qrSize);
      } catch (err) {
        console.error('Failed to add pre-generated QR code:', err);
      }
    } else {
      // Generate QR code with logo as fallback
      try {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Generate QR code using qrcode library
          const qrCanvas = document.createElement('canvas');
          await QRCode.toCanvas(qrCanvas, asset.asset_id || 'N/A', {
            width: size,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
            errorCorrectionLevel: 'H'
          });
          
          // Draw QR code on main canvas
          ctx.drawImage(qrCanvas, 0, 0, size, size);
          
          // Load and draw logo in center
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
            logo.src = '/Logo/Rathinam Logo (No name).png';
          });
          
          const logoSize = size * 0.25;
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;
          
          // White background for logo (slightly larger for padding)
          const bgPadding = 4;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(logoX - bgPadding, logoY - bgPadding, logoSize + (bgPadding * 2), logoSize + (bgPadding * 2));
          
          // Draw logo
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          
          const generatedQR = canvas.toDataURL('image/png');
          pdf.addImage(generatedQR, 'PNG', qrX + 1, qrY + 1, qrSize, qrSize);
        }
      } catch (err) {
        console.error('QR generation with logo failed, using plain QR:', err);
        // Final fallback: plain QR without logo
        try {
          const plainQR = await QRCode.toDataURL(asset.asset_id || 'N/A', {
            width: 200,
            margin: 0,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          pdf.addImage(plainQR, 'PNG', qrX + 1, qrY + 1, qrSize, qrSize);
        } catch (finalErr) {
          console.error('Plain QR generation failed:', finalErr);
        }
      }
    }

    // Asset ID to the left of QR code
    pdf.setFontSize(14);
    pdf.text(asset.asset_id || 'N/A', qrX - 3, 16, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, M, 24);
    pdf.text('CONFIDENTIAL — FOR INTERNAL USE ONLY', qrX - 3, 24, { align: 'right' });

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const drawFooter = () => {
      const FY = PH - 9;
      setStroke(pdf, C.border);
      pdf.setLineWidth(0.3);
      pdf.line(M, FY, PW - M, FY);
      setTxt(pdf, C.footerText);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.text(`Asset ID: ${asset.asset_id || 'N/A'}`, M, FY + 4);
      pdf.text('Confidential — For Internal Use Only', PW - M, FY + 4, { align: 'right' });
    };

    // ── TABLE DRAWING UTILITIES ───────────────────────────────────────────────
    const ROW_H   = 5.8;   // data row height
    const SEC_H   = 6.5;   // section title row height
    const COL_H   = 5.5;   // column header row height (list tables)
    const LABEL_W = 48;    // label column width for KV tables (reduced from 52 to give more space to values)

    /**
     * drawKVTable – draws a key-value (label | value) table.
     * Returns the Y position after the last border line.
     */
    const drawKVTable = (
      x: number, y: number, w: number,
      title: string,
      rows: [string, string][]
    ): number => {
      // Section title
      setFill(pdf, C.sectionBg);
      pdf.rect(x, y, w, SEC_H, 'F');
      setTxt(pdf, C.sectionText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text(title.toUpperCase(), x + 3, y + SEC_H - 2);
      y += SEC_H;

      rows.forEach(([label, value], i) => {
        // Alternating row background
        setFill(pdf, i % 2 === 0 ? C.rowWhite : C.rowAlt);
        pdf.rect(x, y, w, ROW_H, 'F');

        // Horizontal divider
        setStroke(pdf, C.border);
        pdf.setLineWidth(0.2);
        pdf.line(x, y, x + w, y);

        // Vertical divider between label and value
        pdf.line(x + LABEL_W, y, x + LABEL_W, y + ROW_H);

        // Label
        setTxt(pdf, C.labelText);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(label, x + 3, y + ROW_H - 2);

        // Value - use splitTextToSize to fit within column
        setTxt(pdf, C.valueText);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        const maxValueWidth = w - LABEL_W - 6;
        const valueLines = pdf.splitTextToSize(value, maxValueWidth);
        // Only show first line to maintain row height
        pdf.text(valueLines[0] || '', x + LABEL_W + 3, y + ROW_H - 2);

        y += ROW_H;
      });

      // Bottom + side borders
      setStroke(pdf, C.border);
      pdf.setLineWidth(0.3);
      pdf.line(x, y, x + w, y);                          // bottom
      const topY = y - rows.length * ROW_H - SEC_H;
      pdf.line(x, topY, x, y);                            // left
      pdf.line(x + w, topY, x + w, y);                   // right

      return y;
    };

    /**
     * drawListTable – draws a tabular (multi-column) data table.
     * Returns the Y position after the last border line.
     */
    const drawListTable = (
      x: number, y: number, w: number,
      title: string,
      headers: string[],
      data: string[][],
      colWidths?: number[]
    ): number => {
      // Use custom column widths if provided, otherwise equal distribution
      const columnWidths = colWidths || headers.map(() => w / headers.length);

      // Section title
      setFill(pdf, C.sectionBg);
      pdf.rect(x, y, w, SEC_H, 'F');
      setTxt(pdf, C.sectionText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text(title.toUpperCase(), x + 3, y + SEC_H - 2);
      y += SEC_H;

      // Column headers
      setFill(pdf, C.colHeaderBg);
      pdf.rect(x, y, w, COL_H, 'F');
      setTxt(pdf, C.colHeaderTxt);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.8);
      let colX = x;
      headers.forEach((h, ci) => {
        pdf.text(h.toUpperCase(), colX + 3, y + COL_H - 1.8);
        // Vertical col divider
        if (ci > 0) {
          setStroke(pdf, C.border);
          pdf.setLineWidth(0.2);
          pdf.line(colX, y, colX, y + COL_H);
        }
        colX += columnWidths[ci];
      });
      setStroke(pdf, C.border);
      pdf.setLineWidth(0.2);
      pdf.line(x, y, x + w, y);             // top of col header
      pdf.line(x, y + COL_H, x + w, y + COL_H); // bottom of col header
      y += COL_H;

      // Data rows
      if (data.length === 0) {
        setFill(pdf, C.rowWhite);
        pdf.rect(x, y, w, ROW_H, 'F');
        setTxt(pdf, C.labelText);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('No records found', x + w / 2, y + ROW_H - 2, { align: 'center' });
        y += ROW_H;
      } else {
        data.forEach((row, ri) => {
          setFill(pdf, ri % 2 === 0 ? C.rowWhite : C.rowAlt);
          pdf.rect(x, y, w, ROW_H, 'F');

          setStroke(pdf, C.border);
          pdf.setLineWidth(0.2);
          pdf.line(x, y, x + w, y);

          setTxt(pdf, C.valueText);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);

          colX = x;
          row.forEach((cell, ci) => {
            // Calculate max text width for this column (subtract padding)
            const maxTextWidth = columnWidths[ci] - 6;
            const cellText = String(cell);
            
            // Use splitTextToSize to properly fit text in column
            const lines = pdf.splitTextToSize(cellText, maxTextWidth);
            pdf.text(lines[0], colX + 3, y + ROW_H - 2);
            
            if (ci > 0) {
              setStroke(pdf, C.border);
              pdf.setLineWidth(0.2);
              pdf.line(colX, y, colX, y + ROW_H);
            }
            colX += columnWidths[ci];
          });

          y += ROW_H;
        });
      }

      // Bottom + side borders
      setStroke(pdf, C.border);
      pdf.setLineWidth(0.3);
      pdf.line(x, y, x + w, y);
      const topY = y - (data.length || 1) * ROW_H - COL_H - SEC_H;
      pdf.line(x, topY, x, y);
      pdf.line(x + w, topY, x + w, y);

      return y;
    };

    // ── LAYOUT ────────────────────────────────────────────────────────────────
    const GAP   = 2.5;     // vertical gap between tables
    const COL2W = (TW - 4) / 2;  // each column width when side-by-side
    let y       = HDR_H + 3;

    // ── Row 1: Basic Info (left) + Financial Info (right) ────────────────────────────
    const basicRows: [string,string][] = [
      ['Asset Name',    fmt(asset.asset_name)],
      ['Category',      fmt(asset.asset_category)],
      ['Sub Category',  fmt(asset.asset_sub_category)],
      ['Type',          fmt(asset.asset_type)],
      ['Status',        fmt(asset.asset_status, '') || 'Active'],
      ['Serial Number', fmt(asset.serial_number)],
      ['Manufacturer',  fmt(asset.manufacturer)],
      ['Make / Model',  fmt(asset.make_model)],
    ];

    const finRows: [string,string][] = [
      ['Asset Value',     asset.asset_value != null ? `₹${Number(asset.asset_value).toLocaleString('en-IN')}` : 'N/A'],
      ['Purchase Date',   fmtDate(asset.purchase_date)],
      ['Warranty Expiry', fmtDate(asset.warranty_date)],
      ['PO Number',       fmt(asset.po_number)],
      ['Invoice Number',  fmt(asset.invoice_number)],
      ['Invoice Date',    fmtDate(asset.invoice_date)],
    ];

    const basicEnd = drawKVTable(M, y, COL2W, 'Basic Information', basicRows);
    const finEnd   = drawKVTable(M + COL2W + 4, y, COL2W, 'Financial Information', finRows);
    y = Math.max(basicEnd, finEnd) + GAP;

    // ── Row 2: Location Information (full width) ───────────────────────────────
    const locRows: [string,string][] = [
      ['Building',      getBuildingName(asset.building)],
      ['Floor',         asset.floor_id ? (floors[asset.floor_id] || 'N/A') : 'N/A'],
      ['Room / Rack',   asset.room_id  ? (rooms[asset.room_id]   || 'N/A') : 'N/A'],
      ['Tenant',        asset.handover_to    ? (tenants[asset.handover_to]       || 'N/A') : 'N/A'],
      ['Asset Incharge',asset.asset_incharge ? (users[asset.asset_incharge]      || 'N/A') : 'N/A'],
    ];
    y = drawKVTable(M, y, TW, 'Location Information', locRows) + GAP;

    // ── Row 3: Movements (full width) ─────────────────────────────────────────
    const movData = (movements || []).map(m => [
      fmt(m.movement_type), fmt(m.to_building), fmt(m.status), fmtDate(m.created_at)
    ]);
    // Custom column widths: Type(30mm), To Location(70mm), Status(40mm), Date(46mm)
    y = drawListTable(M, y, TW, 'Movements',
      ['Type', 'To Location', 'Status', 'Date'], movData, [30, 70, 40, 46]) + GAP;

    // ── Row 4: Audits (full width) ────────────────────────────────────────────
    const audData = (audits || []).map(a => [
      fmt(a.audit_type), fmt(a.condition), fmt(a.status), fmtDate(a.audit_date)
    ]);
    // Custom column widths: Type(40mm), Condition(50mm), Status(50mm), Date(46mm)
    y = drawListTable(M, y, TW, 'Audits',
      ['Type', 'Condition', 'Status', 'Date'], audData, [40, 50, 50, 46]) + GAP;

    // ── Row 5: Services (full width) ──────────────────────────────────────────
    const svcData = (services || []).map(s => [
      fmt(s.service_type),
      fmt(s.service_provider),
      s.cost ? `₹${Number(s.cost).toLocaleString('en-IN')}` : 'N/A',
      fmtDate(s.service_date),
    ]);
    // Custom column widths: Type(35mm), Provider(65mm), Cost(40mm), Date(46mm)
    y = drawListTable(M, y, TW, 'Services',
      ['Type', 'Provider', 'Cost', 'Date'], svcData, [35, 65, 40, 46]) + GAP;

    // ── Row 6: Tickets ─────────────────────────────────────────────────────────
    const ticketData = (tickets || []).map(t => [
      fmt(t.ticket_number),
      fmt(t.title),
      fmt(t.status),
      fmtDate(t.created_at),
    ]);
    // Custom column widths: Ticket#(35mm), Title(65mm), Status(40mm), Date(46mm)
    drawListTable(M, y, TW, 'Tickets',
      ['Ticket #', 'Title', 'Status', 'Date'], ticketData, [35, 65, 40, 46]);

    drawFooter();
  }

  return pdf;
}