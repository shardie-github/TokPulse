import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChannelData {
  channel: string;
  revenue: number;
  color: string;
}

interface ChannelShareChartProps {
  data?: ChannelData[];
}

const defaultData: ChannelData[] = [
  { channel: 'Instagram', revenue: 40000, color: '#E4405F' },
  { channel: 'TikTok', revenue: 30000, color: '#000000' },
  { channel: 'Facebook', revenue: 20000, color: '#1877F2' },
  { channel: 'Twitter', revenue: 10000, color: '#1DA1F2' },
];

export function ChannelShareChart({ data = defaultData }: ChannelShareChartProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalRevenue) * 100).toFixed(1);
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <p style={{ margin: 0, fontWeight: '600' }}>{data.name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            {formatCurrency(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="revenue"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}