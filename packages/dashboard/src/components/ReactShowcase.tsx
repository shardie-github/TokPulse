import { Zap, Code, Layers, BarChart3, Settings, Palette, Shield } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import type { Column } from './AdvancedDataTable';
import { AdvancedDataTable } from './AdvancedDataTable';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import type { FormField } from './AdvancedForm';
import { AdvancedForm } from './AdvancedForm';
import { LoadingSpinner, Skeleton, SkeletonCard, SkeletonTable } from './AdvancedLoading';
import { VirtualList, InfiniteScroll } from './VirtualList';
import { useTheme } from '../contexts/ThemeContext';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePerformance } from '../hooks/usePerformance';

// Sample data for demonstrations
const sampleUsers = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ['Admin', 'User', 'Moderator'][i % 3],
  status: ['Active', 'Inactive', 'Pending'][i % 3],
  lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  score: Math.floor(Math.random() * 1000),
}));

const samplePosts = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  title: `Post ${i + 1}`,
  content: `This is the content for post ${i + 1}. It contains some sample text to demonstrate the virtual scrolling capabilities.`,
  author: `Author ${i + 1}`,
  likes: Math.floor(Math.random() * 100),
  comments: Math.floor(Math.random() * 20),
  createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
}));

export function ReactShowcase() {
  const [activeTab, setActiveTab] = useState('hooks');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [showError, setShowError] = useState(false);
  const [infiniteData, setInfiniteData] = useState(samplePosts.slice(0, 10));
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const { theme, setTheme, actualTheme } = useTheme();
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [favorites, setFavorites] = useLocalStorage<string[]>('showcase-favorites', []);
  const [setRef, entry] = useIntersectionObserver({ threshold: 0.1 });
  const performance = usePerformance('ReactShowcase');

  // Async data fetching simulation
  const {
    data: asyncData,
    loading: asyncLoading,
    execute: fetchData,
  } = useAsync(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { message: 'Data loaded successfully!', timestamp: new Date().toISOString() };
    },
    { immediate: false },
  );

  // Table columns configuration
  const userColumns: Column<(typeof sampleUsers)[0]>[] = [
    {
      key: 'id',
      title: 'ID',
      sortable: true,
      width: 80,
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      filterable: true,
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
              {value.charAt(0)}
            </span>
          </div>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      filterable: true,
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            value === 'Admin'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              : value === 'Moderator'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
            value === 'Active'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : value === 'Inactive'
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              value === 'Active'
                ? 'bg-green-500'
                : value === 'Inactive'
                  ? 'bg-gray-500'
                  : 'bg-yellow-500'
            }`}
          />
          {value}
        </span>
      ),
    },
    {
      key: 'score',
      title: 'Score',
      sortable: true,
      align: 'right',
    },
  ];

  // Form fields configuration
  const formFields: FormField[] = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      validation: { minLength: 2, maxLength: 50 },
      placeholder: 'Enter your full name',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      placeholder: 'Enter your email',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      validation: { minLength: 8 },
      helpText: 'Password must be at least 8 characters long',
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        { value: 'admin', label: 'Administrator' },
        { value: 'user', label: 'User' },
        { value: 'moderator', label: 'Moderator' },
      ],
    },
    {
      name: 'notifications',
      label: 'Email Notifications',
      type: 'checkbox',
    },
    {
      name: 'preferences',
      label: 'Theme Preference',
      type: 'radio',
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' },
      ],
    },
  ];

  // Infinite scroll handler
  const handleLoadMore = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const currentLength = infiniteData.length;
    const newData = samplePosts.slice(currentLength, currentLength + 10);

    if (newData.length === 0) {
      setHasMore(false);
    } else {
      setInfiniteData((prev) => [...prev, ...newData]);
    }

    setLoading(false);
  }, [infiniteData.length, loading]);

  // Form submission handler
  const handleFormSubmit = useCallback(async (data: any) => {
    console.log('Form submitted:', data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert('Form submitted successfully!');
  }, []);

  const tabs = [
    { id: 'hooks', label: 'Custom Hooks', icon: Code },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'components', label: 'Advanced Components', icon: Layers },
    { id: 'forms', label: 'Forms & Validation', icon: Settings },
    { id: 'tables', label: 'Data Tables', icon: BarChart3 },
    { id: 'virtual', label: 'Virtual Scrolling', icon: Palette },
    { id: 'error', label: 'Error Handling', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            React Advanced Features Showcase
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Demonstrating modern React patterns, performance optimizations, and advanced UI
            components
          </p>
        </div>

        {/* Theme Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Theme:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
            <span className="text-xs text-gray-500 dark:text-gray-400">Current: {actualTheme}</span>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Render time: {performance.lastRenderTime.toFixed(2)}ms
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Custom Hooks Tab */}
          {activeTab === 'hooks' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Hooks</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Debounced Search */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Debounced Search</h3>
                  <input
                    type="text"
                    placeholder="Type to search (300ms debounce)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Search term: "{searchTerm}"<br />
                    Debounced: "{debouncedSearch}"
                  </div>
                </div>

                {/* Local Storage */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Local Storage Hook</h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFavorites((prev) => [...prev, `Item ${Date.now()}`])}
                        className="px-3 py-1 bg-brand-600 text-white rounded text-sm"
                      >
                        Add Favorite
                      </button>
                      <button
                        onClick={() => setFavorites([])}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Favorites: {favorites.length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {favorites.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Intersection Observer */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Intersection Observer</h3>
                  <div className="h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                    <div className="p-4 space-y-4">
                      <div>Scroll down to see the intersection observer in action...</div>
                      <div>Item 1</div>
                      <div>Item 2</div>
                      <div>Item 3</div>
                      <div ref={setRef} className="p-4 bg-brand-100 dark:bg-brand-900/20 rounded">
                        <strong>This element is being observed!</strong>
                        <br />
                        Is intersecting: {entry?.isIntersecting ? 'Yes' : 'No'}
                      </div>
                      <div>Item 4</div>
                      <div>Item 5</div>
                    </div>
                  </div>
                </div>

                {/* Async Hook */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Async Hook</h3>
                  <div className="space-y-4">
                    <button
                      onClick={fetchData}
                      disabled={asyncLoading}
                      className="px-4 py-2 bg-brand-600 text-white rounded disabled:opacity-50"
                    >
                      {asyncLoading ? 'Loading...' : 'Fetch Data'}
                    </button>

                    {asyncData && (
                      <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded">
                        <div className="text-sm text-green-800 dark:text-green-400">
                          {asyncData.message}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-500">
                          {asyncData.timestamp}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Performance Monitoring
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Render Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <div>Render time: {performance.lastRenderTime.toFixed(2)}ms</div>
                    <div>Mount time: {performance.mountTime.toFixed(2)}ms</div>
                    <div>Update count: {performance.updateCount}</div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Skeleton Loading</h3>
                  <div className="space-y-3">
                    <Skeleton height="1rem" width="100%" />
                    <Skeleton height="1rem" width="80%" />
                    <Skeleton height="1rem" width="60%" />
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Skeleton Card</h3>
                  <SkeletonCard showImage={true} showActions={true} lines={3} />
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Skeleton Table</h3>
                <SkeletonTable rows={5} columns={4} showHeader={true} />
              </div>
            </div>
          )}

          {/* Advanced Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Advanced Components
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Loading States</h3>
                  <div className="space-y-4">
                    <LoadingSpinner size="sm" text="Small spinner" />
                    <LoadingSpinner size="md" text="Medium spinner" />
                    <LoadingSpinner size="lg" text="Large spinner" />
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Interactive Elements</h3>
                  <div className="space-y-3">
                    <button className="w-full px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">
                      Primary Button
                    </button>
                    <button className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                      Secondary Button
                    </button>
                    <button className="w-full px-4 py-2 border border-brand-600 text-brand-600 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20">
                      Outline Button
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Forms</h2>

              <div className="max-w-2xl">
                <AdvancedForm
                  fields={formFields}
                  onSubmit={handleFormSubmit}
                  submitText="Create Account"
                  cancelText="Cancel"
                />
              </div>
            </div>
          )}

          {/* Data Tables Tab */}
          {activeTab === 'tables' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Advanced Data Tables
              </h2>

              <AdvancedDataTable
                data={sampleUsers}
                columns={userColumns}
                selectable={true}
                exportable={true}
                searchable={true}
                filterable={true}
                pagination={true}
                pageSize={10}
                onSelectionChange={setSelectedUsers}
                onRowClick={(item) => console.log('Row clicked:', item)}
              />

              {selectedUsers.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Selected Users ({selectedUsers.length})
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUsers.map((user) => user.name).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Virtual Scrolling Tab */}
          {activeTab === 'virtual' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Virtual Scrolling
              </h2>

              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Virtual List (1000 items)</h3>
                <VirtualList
                  items={sampleUsers}
                  itemHeight={60}
                  containerHeight={400}
                  renderItem={(user, index) => (
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Score: {user.score}
                      </div>
                    </div>
                  )}
                />
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Infinite Scroll</h3>
                <div className="h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                  <InfiniteScroll hasMore={hasMore} loading={loading} onLoadMore={handleLoadMore}>
                    <div className="space-y-4 p-4">
                      {infiniteData.map((post, index) => (
                        <div
                          key={post.id}
                          className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <h4 className="font-semibold mb-2">{post.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>By {post.author}</span>
                            <span>{post.likes} likes</span>
                            <span>{post.comments} comments</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </InfiniteScroll>
                </div>
              </div>
            </div>
          )}

          {/* Error Handling Tab */}
          {activeTab === 'error' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Error Handling</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Error Boundary Demo</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowError(!showError)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      {showError ? 'Hide Error' : 'Trigger Error'}
                    </button>

                    <AdvancedErrorBoundary>
                      {showError ? (
                        <div>
                          <button
                            onClick={() => {
                              throw new Error('This is a test error for demonstration purposes');
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Throw Error
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded">
                          No error - everything is working fine!
                        </div>
                      )}
                    </AdvancedErrorBoundary>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Error States</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        Error: Something went wrong
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        Warning: Please check your input
                      </div>
                    </div>

                    <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        Success: Operation completed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
