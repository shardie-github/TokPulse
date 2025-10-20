import React from 'react';
import { Text, Badge, Card } from '@shopify/polaris';

interface ActivityItem {
  id: string;
  type: 'order' | 'product' | 'customer' | 'analytics';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'critical';
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'order',
    title: 'New Order Received',
    description: 'Order #1001 for $299.99 from John Doe',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    status: 'success',
  },
  {
    id: '2',
    type: 'product',
    title: 'Product Updated',
    description: 'Summer Collection T-Shirt inventory updated',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    status: 'success',
  },
  {
    id: '3',
    type: 'analytics',
    title: 'Analytics Sync Complete',
    description: 'Instagram data synchronized successfully',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    status: 'success',
  },
  {
    id: '4',
    type: 'customer',
    title: 'New Customer Registered',
    description: 'Jane Smith joined your store',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    status: 'success',
  },
  {
    id: '5',
    type: 'analytics',
    title: 'Sync Warning',
    description: 'TikTok API rate limit approaching',
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    status: 'warning',
  },
];

export function ActivityFeed() {
  const getTypeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'order':
        return '🛒';
      case 'product':
        return '📦';
      case 'customer':
        return '👤';
      case 'analytics':
        return '📊';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'critical';
      default:
        return 'info';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  return (
    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {mockActivities.map((activity) => (
        <div
          key={activity.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ 
            fontSize: '20px',
            lineHeight: '1',
            marginTop: '2px'
          }}>
            {getTypeIcon(activity.type)}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '4px'
            }}>
              <Text variant="bodyMd" as="p" fontWeight="medium">
                {activity.title}
              </Text>
              {activity.status && (
                <Badge status={getStatusColor(activity.status)}>
                  {activity.status}
                </Badge>
              )}
            </div>
            
            <Text variant="bodySm" as="p" color="subdued">
              {activity.description}
            </Text>
            
            <Text variant="bodySm" as="p" color="subdued" style={{ marginTop: '4px' }}>
              {formatTimestamp(activity.timestamp)}
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
}