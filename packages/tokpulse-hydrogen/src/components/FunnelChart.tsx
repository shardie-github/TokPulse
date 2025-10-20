import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface FunnelChartProps {
  data?: FunnelData[];
}

const defaultData: FunnelData[] = [
  { stage: 'Visitors', count: 10000, percentage: 100 },
  { stage: 'Engaged', count: 2500, percentage: 25 },
  { stage: 'Added to Cart', count: 500, percentage: 5 },
  { stage: 'Purchased', count: 100, percentage: 1 },
];

export function FunnelChart({ data = defaultData }: FunnelChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <p style={{ margin: 0, fontWeight: '600' }}>{label}</p>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            Count: {data.count.toLocaleString()}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            Conversion: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="stage" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="count" 
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}