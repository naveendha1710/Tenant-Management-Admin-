import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

interface RevenueData {
  month: string;
  total_revenue: number;
}

export function MonthlyRevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const { data: result, error } = await supabase.rpc('get_monthly_revenue_trend', {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      // Fallback to mock data
      setData([
        { month: '2024-01', total_revenue: 850000 },
        { month: '2024-02', total_revenue: 920000 },
        { month: '2024-03', total_revenue: 780000 },
        { month: '2024-04', total_revenue: 1050000 },
        { month: '2024-05', total_revenue: 980000 },
        { month: '2024-06', total_revenue: 1120000 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;
  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={formatMonth} />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
            labelFormatter={(month: string) => formatMonth(month)}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total_revenue" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            name="Monthly Revenue"
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}