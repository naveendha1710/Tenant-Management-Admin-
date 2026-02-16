import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateFileName = (prefix: string, extension: string): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${date}.${extension}`;
};

export const createExcelFile = async (data: any[], headers: string[], fileName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export Data');
  worksheet.columns = headers.map(h => ({ header: h, key: h, width: 15 }));
  worksheet.addRows(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const createPDFFile = (
  data: any[][],
  headers: string[],
  fileName: string,
  title: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 40,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  doc.save(fileName);
};