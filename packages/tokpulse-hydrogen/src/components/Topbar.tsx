import { useState } from 'react';
import { TopBar, Button, Popover, ActionList } from '@shopify/polaris';
import { useTheme } from '@/lib/theme';

interface TopbarProps {
  shopName?: string;
}

export function Topbar({ shopName }: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  const userMenuActions = [
    {
      items: [
        {
          content: 'Profile',
          onAction: () => console.log('Profile clicked'),
        },
        {
          content: 'Settings',
          onAction: () => console.log('Settings clicked'),
        },
        {
          content: 'Help',
          onAction: () => console.log('Help clicked'),
        },
        {
          content: 'Sign out',
          onAction: () => console.log('Sign out clicked'),
        },
      ]
    }
  ];

  const themeToggleActions = [
    {
      content: 'Light',
      onAction: () => setTheme('light'),
    },
    {
      content: 'Dark',
      onAction: () => setTheme('dark'),
    },
    {
      content: 'System',
      onAction: () => setTheme('system'),
    },
  ];

  const userMenuMarkup = (
    <TopBar.UserMenu
      actions={userMenuActions}
      name={shopName || 'Shop Owner'}
      initials={shopName ? shopName.charAt(0).toUpperCase() : 'S'}
      avatar=""
      open={userMenuOpen}
      onToggle={() => setUserMenuOpen(!userMenuOpen)}
    />
  );

  const themeToggleMarkup = (
    <Popover
      active={false}
      activator={
        <Button variant="tertiary" size="slim">
          {resolvedTheme === 'dark' ? '🌙' : '☀️'}
        </Button>
      }
      onClose={() => {}}
    >
      <ActionList items={themeToggleActions} />
    </Popover>
  );

  return (
    <TopBar
      showNavigationToggle={false}
      userMenu={userMenuMarkup}
      secondaryMenu={themeToggleMarkup}
    />
  );
}