import { Spinner, Text } from '@shopify/polaris';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'large' 
}: LoadingSpinnerProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '200px',
      gap: '1rem'
    }}>
      <Spinner size={size} />
      <Text variant="bodyMd" as="p" tone="subdued">
        {message}
      </Text>
    </div>
  );
}