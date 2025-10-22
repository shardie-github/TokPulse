import { useQuery } from '@apollo/client';
import { Page, Layout, Card, Text, Spinner, Banner } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ChannelShareChart } from '@/components/ChannelShareChart';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FunnelChart } from '@/components/FunnelChart';
import { KPIsGrid } from '@/components/KPIsGrid';
import { Leaderboard } from '@/components/Leaderboard';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { GET_SHOP_INFO, GET_PRODUCTS, GET_ORDERS } from '@/lib/graphql/queries';

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);

  // GraphQL queries
  const { data: shopData, loading: shopLoading, error: shopError } = useQuery(GET_SHOP_INFO);
  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
  } = useQuery(GET_PRODUCTS, {
    variables: { first: 10 },
  });
  const {
    data: ordersData,
    loading: ordersLoading,
    error: ordersError,
  } = useQuery(GET_ORDERS, {
    variables: { first: 10 },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (shopLoading || productsLoading || ordersLoading || isLoading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" tone="subdued">
                  Loading your analytics dashboard...
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (shopError || productsError || ordersError) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Banner tone="critical" title="Error loading data">
              <p>There was an error loading your dashboard data. Please try refreshing the page.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const shop = shopData?.shop;
  const products = productsData?.products?.edges?.map((edge: any) => edge.node) || [];
  const orders = ordersData?.orders?.edges?.map((edge: any) => edge.node) || [];

  // Calculate KPIs
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, order: any) => {
    return sum + parseFloat(order.totalPrice?.amount || '0');
  }, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const kpis = [
    {
      title: 'Total Products',
      value: totalProducts.toLocaleString(),
      change: '+12%',
      trend: 'up' as const,
      icon: 'Package' as const,
    },
    {
      title: 'Total Orders',
      value: totalOrders.toLocaleString(),
      change: '+8%',
      trend: 'up' as const,
      icon: 'ShoppingCart' as const,
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: '+15%',
      trend: 'up' as const,
      icon: 'DollarSign' as const,
    },
    {
      title: 'Avg Order Value',
      value: `$${averageOrderValue.toFixed(2)}`,
      change: '+5%',
      trend: 'up' as const,
      icon: 'TrendingUp' as const,
    },
  ];

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Topbar shopName={shop?.name} />
          <Page>
            <Layout>
              <Layout.Section>
                <Text variant="headingLg" as="h1">
                  Welcome to TokPulse Analytics
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Track your social media performance and optimize your Shopify store
                </Text>
              </Layout.Section>

              <Layout.Section>
                <KPIsGrid kpis={kpis} />
              </Layout.Section>

              <Layout.Section>
                <Layout>
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <Text variant="headingMd" as="h2">
                        Channel Performance
                      </Text>
                      <ChannelShareChart />
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <Text variant="headingMd" as="h2">
                        Conversion Funnel
                      </Text>
                      <FunnelChart />
                    </Card>
                  </Layout.Section>
                </Layout>
              </Layout.Section>

              <Layout.Section>
                <Layout>
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <Text variant="headingMd" as="h2">
                        Recent Activity
                      </Text>
                      <ActivityFeed />
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <Text variant="headingMd" as="h2">
                        Top Products
                      </Text>
                      <Leaderboard />
                    </Card>
                  </Layout.Section>
                </Layout>
              </Layout.Section>
            </Layout>
          </Page>
        </div>
      </div>
    </ErrorBoundary>
  );
}
