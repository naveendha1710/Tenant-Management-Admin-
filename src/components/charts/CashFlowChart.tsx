import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
          <Legend />
          <Bar 
            dataKey="inflow" 
            fill="#10b981" 
            name="Cash Inflow"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="outflow" 
            fill="#ef4444" 
            name="Cash Outflow"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}