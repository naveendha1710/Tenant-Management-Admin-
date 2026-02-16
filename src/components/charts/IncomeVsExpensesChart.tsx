import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface IncomeVsExpensesChartProps {
  data: FinancialData[];
}

export function IncomeVsExpensesChart({ data }: IncomeVsExpensesChartProps) {
  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#10b981" 
            strokeWidth={2} 
            name="Revenue"
            dot={{ fill: '#10b981' }}
          />
          <Line 
            type="monotone" 
            dataKey="expenses" 
            stroke="#ef4444" 
            strokeWidth={2} 
            name="Expenses"
            dot={{ fill: '#ef4444' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}