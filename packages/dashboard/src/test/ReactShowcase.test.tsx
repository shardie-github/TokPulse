import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactShowcase } from '../components/ReactShowcase';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the hooks
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

vi.mock('../hooks/useLocalStorage', () => ({
  useLocalStorage: () => [[], vi.fn(), vi.fn()],
}));

vi.mock('../hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => [vi.fn(), { isIntersecting: false }],
}));

vi.mock('../hooks/useAsync', () => ({
  useAsync: () => ({
    data: null,
    loading: false,
    error: null,
    execute: vi.fn(),
  }),
}));

vi.mock('../hooks/usePerformance', () => ({
  usePerformance: () => ({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    lastRenderTime: 0,
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ReactShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    expect(screen.getByText('React Advanced Features Showcase')).toBeInTheDocument();
  });

  it('displays all navigation tabs', () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    expect(screen.getByText('Custom Hooks')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Advanced Components')).toBeInTheDocument();
    expect(screen.getByText('Forms & Validation')).toBeInTheDocument();
    expect(screen.getByText('Data Tables')).toBeInTheDocument();
    expect(screen.getByText('Virtual Scrolling')).toBeInTheDocument();
    expect(screen.getByText('Error Handling')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    // Click on Performance tab
    fireEvent.click(screen.getByText('Performance'));

    await waitFor(() => {
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument();
    });

    // Click on Forms tab
    fireEvent.click(screen.getByText('Forms & Validation'));

    await waitFor(() => {
      expect(screen.getByText('Advanced Forms')).toBeInTheDocument();
    });
  });

  it('displays theme selector', () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    const themeSelect = screen.getByDisplayValue('system');
    expect(themeSelect).toBeInTheDocument();
  });

  it('handles search input in hooks tab', async () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    // Switch to hooks tab
    fireEvent.click(screen.getByText('Custom Hooks'));

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Type to search (300ms debounce)...');
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(searchInput).toHaveValue('test search');
    });
  });

  it('displays performance metrics', async () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    // Switch to performance tab
    fireEvent.click(screen.getByText('Performance'));

    await waitFor(() => {
      expect(screen.getByText('Render Metrics')).toBeInTheDocument();
      expect(screen.getByText('Skeleton Loading')).toBeInTheDocument();
      expect(screen.getByText('Skeleton Card')).toBeInTheDocument();
    });
  });

  it('shows data table in tables tab', async () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    // Switch to tables tab
    fireEvent.click(screen.getByText('Data Tables'));

    await waitFor(() => {
      expect(screen.getByText('Advanced Data Tables')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  it('displays form in forms tab', async () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    // Switch to forms tab
    fireEvent.click(screen.getByText('Forms & Validation'));

    await waitFor(() => {
      expect(screen.getByText('Advanced Forms')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });
  });

  it('shows error handling in error tab', async () => {
    render(
      <TestWrapper>
        <ReactShowcase />
      </TestWrapper>,
    );

    // Switch to error tab
    fireEvent.click(screen.getByText('Error Handling'));

    await waitFor(() => {
      expect(screen.getByText('Error Handling')).toBeInTheDocument();
      expect(screen.getByText('Error Boundary Demo')).toBeInTheDocument();
      expect(screen.getByText('Error States')).toBeInTheDocument();
    });
  });
});
