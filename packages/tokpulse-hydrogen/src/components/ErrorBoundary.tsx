import { Component, ErrorInfo, ReactNode } from 'react';
import { Banner, Button, Card, Text } from '@shopify/polaris';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem' }}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text variant="headingLg" as="h1" tone="critical">
                Something went wrong
              </Text>
              <div style={{ marginTop: '1rem' }}>
                <Text variant="bodyMd" as="p" tone="subdued">
                  We're sorry, but something unexpected happened. Please try refreshing the page.
                </Text>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                  <Banner tone="critical" title="Error Details">
                    <pre style={{ 
                      background: '#f6f6f7', 
                      padding: '1rem', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '12px'
                    }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </Banner>
                </div>
              )}
              
              <div style={{ marginTop: '2rem' }}>
                <Button onClick={this.handleReset} variant="primary">
                  Try Again
                </Button>
                <div style={{ marginLeft: '1rem', display: 'inline-block' }}>
                  <Button onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}