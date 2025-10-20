import { Card, Text } from '@shopify/polaris';

interface KPI {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

interface KPIsGridProps {
  kpis: KPI[];
}

export function KPIsGrid({ kpis }: KPIsGridProps) {
  const getTrendColor = (trend: KPI['trend']) => {
    switch (trend) {
      case 'up':
        return '#22c55e';
      case 'down':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getTrendIcon = (trend: KPI['trend']) => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
      gap: '1rem' 
    }}>
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text variant="bodyLg" as="span">
                  {kpi.icon}
                </Text>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                color: getTrendColor(kpi.trend)
              }}>
                <Text variant="bodySm" as="span">
                  {getTrendIcon(kpi.trend)}
                </Text>
                <Text variant="bodySm" as="span" tone="subdued">
                  {kpi.change}
                </Text>
              </div>
            </div>
            
            <div style={{ marginBottom: '0.5rem' }}>
              <Text variant="headingLg" as="h3">
                {kpi.value}
              </Text>
            </div>
            
            <Text variant="bodyMd" as="p" tone="subdued">
              {kpi.title}
            </Text>
          </div>
        </Card>
      ))}
    </div>
  );
}