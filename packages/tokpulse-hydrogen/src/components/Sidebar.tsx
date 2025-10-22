import { Navigation, Text } from '@shopify/polaris';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    {
      label: 'Dashboard',
      icon: 'Analytics',
      url: '/',
      selected: location.pathname === '/',
    },
    {
      label: 'Analytics',
      icon: 'Analytics',
      url: '/analytics',
      selected: location.pathname === '/analytics',
    },
    {
      label: 'Products',
      icon: 'Products',
      url: '/products',
      selected: location.pathname === '/products',
    },
    {
      label: 'Orders',
      icon: 'Orders',
      url: '/orders',
      selected: location.pathname === '/orders',
    },
    {
      label: 'Customers',
      icon: 'Customers',
      url: '/customers',
      selected: location.pathname === '/customers',
    },
    {
      label: 'Settings',
      icon: 'Settings',
      url: '/settings',
      selected: location.pathname === '/settings',
    },
  ];

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  return (
    <div
      style={{
        width: isCollapsed ? '60px' : '240px',
        minHeight: '100vh',
        backgroundColor: '#f6f6f7',
        borderRight: '1px solid #e1e3e5',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid #e1e3e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        {!isCollapsed && (
          <Text variant="headingMd" as="h1">
            TokPulse
          </Text>
        )}
        {isCollapsed && (
          <Text variant="headingMd" as="h1">
            TP
          </Text>
        )}
      </div>

      <Navigation location={location.pathname}>
        <Navigation.Section
          items={navigationItems.map((item) => ({
            ...item,
            onClick: () => handleNavigation(item.url),
          }))}
        />
      </Navigation>

      <div
        style={{
          marginTop: 'auto',
          padding: '1rem',
          borderTop: '1px solid #e1e3e5',
        }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{isCollapsed ? '→' : '←'}</span>
          {!isCollapsed && (
            <Text variant="bodySm" as="span">
              Collapse
            </Text>
          )}
        </button>
      </div>
    </div>
  );
}
