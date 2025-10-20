import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Page, Layout, Card, Text, Button, Select, DatePicker, Spinner, Banner } from '@shopify/polaris';
import { GET_ANALYTICS, GET_PRODUCTS, GET_ORDERS } from '@/lib/graphql/queries';
import { ChannelShareChart } from '@/components/ChannelShareChart';
import { FunnelChart } from '@/components/FunnelChart';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Analytics() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [isLoading, setIsLoading] = useState(true);

  // GraphQL queries
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useQuery(GET_ANALYTICS, {
    variables: {
      first: 30,
      query: `created_at:>=${dateRange.start.toISOString().split('T')[0]} created_at:<=${dateRange.end.toISOString().split('T')[0]}`,
    },
  });

  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS, {
    variables: { first: 100 }
  });

  const { data: ordersData, loading: ordersLoading } = useQuery(GET_ORDERS, {
    variables: { first: 100 }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const metricOptions = [
    { label: 'Revenue', value: 'revenue' },
    { label: 'Orders', value: 'orders' },
    { label: 'Products', value: 'products' },
    { label: 'Customers', value: 'customers' },
  ];

  if (analyticsLoading || productsLoading || ordersLoading || isLoading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" color="subdued">
                  Loading analytics data...
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (analyticsError) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Error loading analytics">
              <p>There was an error loading your analytics data. Please try refreshing the page.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const products = productsData?.products?.edges?.map(edge => edge.node) || [];
  const orders = ordersData?.orders?.edges?.map(edge => edge.node) || [];

  // Calculate analytics data
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + parseFloat(order.totalPrice?.amount || '0');
  }, 0);

  const totalOrders = orders.length;
  const totalProducts = products.length;

  const revenueByChannel = [
    { channel: 'Instagram', revenue: totalRevenue * 0.4, color: '#E4405F' },
    { channel: 'TikTok', revenue: totalRevenue * 0.3, color: '#000000' },
    { channel: 'Facebook', revenue: totalRevenue * 0.2, color: '#1877F2' },
    { channel: 'Twitter', revenue: totalRevenue * 0.1, color: '#1DA1F2' },
  ];

  const funnelData = [
    { stage: 'Visitors', count: 10000, percentage: 100 },
    { stage: 'Engaged', count: 2500, percentage: 25 },
    { stage: 'Added to Cart', count: 500, percentage: 5 },
    { stage: 'Purchased', count: 100, percentage: 1 },
  ];

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Topbar />
          <Page>
            <Layout>
              <Layout.Section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <Text variant="headingLg" as="h1">
                    Analytics Dashboard
                  </Text>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Select
                      label="Metric"
                      options={metricOptions}
                      value={selectedMetric}
                      onChange={setSelectedMetric}
                    />
                    <DatePicker
                      month={dateRange.start.getMonth()}
                      year={dateRange.start.getFullYear()}
                      selected={dateRange}
                      onMonthChange={(month, year) => {
                        setDateRange(prev => ({
                          ...prev,
                          start: new Date(year, month, prev.start.getDate()),
                        }));
                      }}
                      onChange={setDateRange}
                    />
                  </div>
                </div>
              </Layout.Section>

              <Layout.Section>
                <Layout>
                  <Layout.Section oneHalf>
                    <Card>
                      <Text variant="headingMd" as="h2">
                        Revenue by Channel
                      </Text>
                      <ChannelShareChart data={revenueByChannel} />
                    </Card>
                  </Layout.Section>
                  <Layout.Section oneHalf>
                    <Card>
                      <Text variant="headingMd" as="h2">
                        Conversion Funnel
                      </Text>
                      <FunnelChart data={funnelData} />
                    </Card>
                  </Layout.Section>
                </Layout>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <Text variant="headingMd" as="h2">
                    Performance Summary
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                      <Text variant="bodyMd" as="p" color="subdued">Total Revenue</Text>
                      <Text variant="headingLg" as="p">${totalRevenue.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text variant="bodyMd" as="p" color="subdued">Total Orders</Text>
                      <Text variant="headingLg" as="p">{totalOrders.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text variant="bodyMd" as="p" color="subdued">Total Products</Text>
                      <Text variant="headingLg" as="p">{totalProducts.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text variant="bodyMd" as="p" color="subdued">Avg Order Value</Text>
                      <Text variant="headingLg" as="p">
                        ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Layout.Section>
            </Layout>
          </Page>
        </div>
      </div>
    </ErrorBoundary>
  );
}