import { Text } from '@shopify/polaris';

interface LeaderboardItem {
  id: string;
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  rank: number;
}

const mockLeaderboardData: LeaderboardItem[] = [
  {
    id: '1',
    name: 'Summer Collection T-Shirt',
    value: 1250,
    change: 15.2,
    trend: 'up',
    rank: 1,
  },
  {
    id: '2',
    name: 'Denim Jeans Classic',
    value: 980,
    change: 8.7,
    trend: 'up',
    rank: 2,
  },
  {
    id: '3',
    name: 'Running Sneakers Pro',
    value: 750,
    change: -2.1,
    trend: 'down',
    rank: 3,
  },
  {
    id: '4',
    name: 'Leather Handbag',
    value: 620,
    change: 12.5,
    trend: 'up',
    rank: 4,
  },
  {
    id: '5',
    name: 'Wireless Headphones',
    value: 480,
    change: 0,
    trend: 'neutral',
    rank: 5,
  },
];

export function Leaderboard() {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getTrendColor = (trend: LeaderboardItem['trend']) => {
    switch (trend) {
      case 'up':
        return '#22c55e';
      case 'down':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getTrendIcon = (trend: LeaderboardItem['trend']) => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      {mockLeaderboardData.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ 
            minWidth: '32px',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {getRankIcon(item.rank)}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyMd" as="p" fontWeight="medium" truncate>
              {item.name}
            </Text>
                <Text variant="bodySm" as="p" tone="subdued">
              {formatValue(item.value)}
            </Text>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            color: getTrendColor(item.trend)
          }}>
            <Text variant="bodySm" as="span">
              {getTrendIcon(item.trend)}
            </Text>
            <Text variant="bodySm" as="span">
              {Math.abs(item.change).toFixed(1)}%
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
}