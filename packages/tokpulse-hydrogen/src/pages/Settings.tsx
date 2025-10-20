import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, Text, Button, TextField, Select, Checkbox, Banner, Spinner } from '@shopify/polaris';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    instagram: {
      enabled: false,
      apiKey: '',
      username: '',
    },
    tiktok: {
      enabled: false,
      apiKey: '',
      username: '',
    },
    facebook: {
      enabled: false,
      apiKey: '',
      pageId: '',
    },
    twitter: {
      enabled: false,
      apiKey: '',
      username: '',
    },
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    analytics: {
      autoSync: true,
      syncInterval: '1h',
      dataRetention: '1y',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Load settings from localStorage or API
    const loadSettings = async () => {
      try {
        const savedSettings = localStorage.getItem('tokpulse_settings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });

    // Clear error for this field
    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
    }
  };

  const validateSettings = () => {
    const newErrors: Record<string, string> = {};

    // Validate API keys for enabled platforms
    Object.entries(settings).forEach(([platform, config]) => {
      if (typeof config === 'object' && 'enabled' in config && config.enabled) {
        if (!config.apiKey || config.apiKey.trim() === '') {
          newErrors[`${platform}.apiKey`] = 'API key is required for enabled platforms';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      return;
    }

    try {
      // Save to localStorage (in production, this would be an API call)
      localStorage.setItem('tokpulse_settings', JSON.stringify(settings));
      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const syncIntervalOptions = [
    { label: 'Every 15 minutes', value: '15m' },
    { label: 'Every hour', value: '1h' },
    { label: 'Every 6 hours', value: '6h' },
    { label: 'Every 24 hours', value: '24h' },
  ];

  const dataRetentionOptions = [
    { label: '3 months', value: '3m' },
    { label: '6 months', value: '6m' },
    { label: '1 year', value: '1y' },
    { label: '2 years', value: '2y' },
  ];

  if (isLoading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" color="subdued">
                  Loading settings...
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Topbar />
          <Page>
            <Layout>
              <Layout.Section>
                <Text variant="headingLg" as="h1">
                  Settings
                </Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Configure your social media integrations and preferences
                </Text>
              </Layout.Section>

              {successMessage && (
                <Layout.Section>
                  <Banner status="success" title="Success">
                    {successMessage}
                  </Banner>
                </Layout.Section>
              )}

              <Layout.Section>
                <Card>
                  <Text variant="headingMd" as="h2">
                    Social Media Integrations
                  </Text>
                  
                  {Object.entries(settings).filter(([key]) => !['notifications', 'analytics'].includes(key)).map(([platform, config]) => (
                    <div key={platform} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #e1e3e5', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <Checkbox
                          label={`${platform.charAt(0).toUpperCase() + platform.slice(1)} Integration`}
                          checked={config.enabled}
                          onChange={(value) => handleSettingChange(`${platform}.enabled`, value)}
                        />
                      </div>
                      
                      {config.enabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <TextField
                            label="API Key"
                            value={config.apiKey}
                            onChange={(value) => handleSettingChange(`${platform}.apiKey`, value)}
                            error={errors[`${platform}.apiKey`]}
                            type="password"
                          />
                          <TextField
                            label={platform === 'facebook' ? 'Page ID' : 'Username'}
                            value={platform === 'facebook' ? config.pageId : config.username}
                            onChange={(value) => handleSettingChange(
                              platform === 'facebook' ? `${platform}.pageId` : `${platform}.username`, 
                              value
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <Text variant="headingMd" as="h2">
                    Notifications
                  </Text>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Checkbox
                      label="Email Notifications"
                      checked={settings.notifications.email}
                      onChange={(value) => handleSettingChange('notifications.email', value)}
                    />
                    <Checkbox
                      label="Push Notifications"
                      checked={settings.notifications.push}
                      onChange={(value) => handleSettingChange('notifications.push', value)}
                    />
                    <Checkbox
                      label="SMS Notifications"
                      checked={settings.notifications.sms}
                      onChange={(value) => handleSettingChange('notifications.sms', value)}
                    />
                  </div>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <Card>
                  <Text variant="headingMd" as="h2">
                    Analytics Settings
                  </Text>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Checkbox
                      label="Auto-sync data"
                      checked={settings.analytics.autoSync}
                      onChange={(value) => handleSettingChange('analytics.autoSync', value)}
                    />
                    <Select
                      label="Sync Interval"
                      options={syncIntervalOptions}
                      value={settings.analytics.syncInterval}
                      onChange={(value) => handleSettingChange('analytics.syncInterval', value)}
                    />
                    <Select
                      label="Data Retention"
                      options={dataRetentionOptions}
                      value={settings.analytics.dataRetention}
                      onChange={(value) => handleSettingChange('analytics.dataRetention', value)}
                    />
                  </div>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <Button>Cancel</Button>
                  <Button primary onClick={handleSave}>
                    Save Settings
                  </Button>
                </div>
              </Layout.Section>
            </Layout>
          </Page>
        </div>
      </div>
    </ErrorBoundary>
  );
}