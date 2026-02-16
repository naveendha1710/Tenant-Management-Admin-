import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface CostAnalysisData {
  category: string;
  total_cost: number;
  avg_cost: number;
  avg_resolution_time: string;
}

export const exportCostAnalysisToExcel = (data: CostAnalysisData[]) => {
  const exportData = data.map(item => ({
    'Category': item.category.toUpperCase(),
    'Total Spent': `₹${item.total_cost.toLocaleString()}`,
    'Monthly Average': `₹${item.avg_cost.toLocaleString()}`,
    'Last Updated': new Date().toLocaleDateString()
  }));

  const fileName = generateFileName('cost_analysis_report', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportCostAnalysisToPDF = (data: CostAnalysisData[]) => {
  const headers = ['Category', 'Total Spent', 'Monthly Average', 'Last Updated'];
  
  const tableData = data.map(item => [
    item.category.toUpperCase(),
    `₹${item.total_cost.toLocaleString()}`,
    `₹${item.avg_cost.toLocaleString()}`,
    new Date().toLocaleDateString()
  ]);

  const fileName = generateFileName('cost_analysis_report', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Cost Analysis Report');
};