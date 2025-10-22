import {
  Card,
  Button,
  Badge,
  Modal,
  TextField,
  Select,
  DataTable,
  ButtonGroup,
  Toast,
  Spinner,
  EmptyState,
} from '@shopify/polaris';
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface Store {
  id: string;
  shopDomain: string;
  status: string;
  region: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  userId: string;
  storeId?: string;
  createdAt: string;
}

export default function UsersRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ content: string; isError?: boolean } | null>(null);

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [connectStoreModalOpen, setConnectStoreModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ANALYST');
  const [newRole, setNewRole] = useState('');
  const [storeId, setStoreId] = useState('');
  const [isDefaultStore, setIsDefaultStore] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, storesRes, auditLogsRes] = await Promise.all([
        fetch('/api/rbac/users', {
          headers: {
            'x-user-id': 'dev-user-123',
            'x-organization-id': 'dev-org-123',
          },
        }),
        fetch('/api/rbac/stores', {
          headers: {
            'x-user-id': 'dev-user-123',
            'x-organization-id': 'dev-org-123',
          },
        }),
        fetch('/api/rbac/audit-logs', {
          headers: {
            'x-user-id': 'dev-user-123',
            'x-organization-id': 'dev-org-123',
          },
        }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData.stores);
      }

      if (auditLogsRes.ok) {
        const auditLogsData = await auditLogsRes.json();
        setAuditLogs(auditLogsData.logs);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    try {
      const response = await fetch('/api/rbac/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user-123',
          'x-organization-id': 'dev-org-123',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        setToast({ content: 'User invited successfully' });
        setInviteModalOpen(false);
        setInviteEmail('');
        setInviteRole('ANALYST');
        await loadData();
      } else {
        const errorData = await response.json();
        setToast({ content: errorData.error || 'Failed to invite user', isError: true });
      }
    } catch (err) {
      setToast({ content: 'Failed to invite user', isError: true });
      console.error('Invite user error:', err);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/rbac/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user-123',
          'x-organization-id': 'dev-org-123',
        },
        body: JSON.stringify({
          role: newRole,
        }),
      });

      if (response.ok) {
        setToast({ content: 'User role updated successfully' });
        setRoleModalOpen(false);
        setSelectedUser(null);
        setNewRole('');
        await loadData();
      } else {
        const errorData = await response.json();
        setToast({ content: errorData.error || 'Failed to update role', isError: true });
      }
    } catch (err) {
      setToast({ content: 'Failed to update role', isError: true });
      console.error('Update role error:', err);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/rbac/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'dev-user-123',
          'x-organization-id': 'dev-org-123',
        },
      });

      if (response.ok) {
        setToast({ content: 'User removed successfully' });
        await loadData();
      } else {
        const errorData = await response.json();
        setToast({ content: errorData.error || 'Failed to remove user', isError: true });
      }
    } catch (err) {
      setToast({ content: 'Failed to remove user', isError: true });
      console.error('Remove user error:', err);
    }
  };

  const handleConnectStore = async () => {
    try {
      const response = await fetch('/api/rbac/stores/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user-123',
          'x-organization-id': 'dev-org-123',
        },
        body: JSON.stringify({
          storeId,
          isDefault: isDefaultStore,
        }),
      });

      if (response.ok) {
        setToast({ content: 'Store connected successfully' });
        setConnectStoreModalOpen(false);
        setStoreId('');
        setIsDefaultStore(false);
        await loadData();
      } else {
        const errorData = await response.json();
        setToast({ content: errorData.error || 'Failed to connect store', isError: true });
      }
    } catch (err) {
      setToast({ content: 'Failed to connect store', isError: true });
      console.error('Connect store error:', err);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleMap = {
      OWNER: { status: 'success' as const, children: 'Owner' },
      ADMIN: { status: 'info' as const, children: 'Admin' },
      ANALYST: { status: 'warning' as const, children: 'Analyst' },
      VIEWER: { status: 'attention' as const, children: 'Viewer' },
    };
    return roleMap[role as keyof typeof roleMap] || { status: 'info' as const, children: role };
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ACTIVE: { status: 'success' as const, children: 'Active' },
      SUSPENDED: { status: 'warning' as const, children: 'Suspended' },
      UNINSTALLED: { status: 'critical' as const, children: 'Uninstalled' },
    };
    return (
      statusMap[status as keyof typeof statusMap] || { status: 'info' as const, children: status }
    );
  };

  const usersTableRows = users.map((user) => [
    user.email,
    user.name || 'No name',
    <Badge key={user.id} {...getRoleBadge(user.role)} />,
    new Date(user.createdAt).toLocaleDateString(),
    <ButtonGroup key={`actions-${user.id}`}>
      <Button
        size="slim"
        onClick={() => {
          setSelectedUser(user);
          setNewRole(user.role);
          setRoleModalOpen(true);
        }}
      >
        Change Role
      </Button>
      <Button size="slim" destructive onClick={() => handleRemoveUser(user.id)}>
        Remove
      </Button>
    </ButtonGroup>,
  ]);

  const storesTableRows = stores.map((store) => [
    store.shopDomain,
    <Badge key={store.id} {...getStatusBadge(store.status)} />,
    store.region,
    new Date(store.createdAt).toLocaleDateString(),
    <Button
      key={`disconnect-${store.id}`}
      size="slim"
      destructive
      onClick={() => {
        if (confirm('Are you sure you want to disconnect this store?')) {
          // Handle disconnect
        }
      }}
    >
      Disconnect
    </Button>,
  ]);

  const auditLogsTableRows = auditLogs.map((log) => [
    log.action,
    log.resource,
    log.resourceId || '-',
    log.userId,
    new Date(log.createdAt).toLocaleString(),
  ]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spinner size="large" />
        <p>Loading users and roles...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Users & Roles</h1>

      {toast && (
        <Toast content={toast.content} error={toast.isError} onDismiss={() => setToast(null)} />
      )}

      {/* Users Section */}
      <Card sectioned>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2>Team Members</h2>
          <Button primary onClick={() => setInviteModalOpen(true)}>
            Invite User
          </Button>
        </div>

        {users.length === 0 ? (
          <EmptyState
            heading="No team members yet"
            action={{
              content: 'Invite your first team member',
              onAction: () => setInviteModalOpen(true),
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          />
        ) : (
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'text']}
            headings={['Email', 'Name', 'Role', 'Joined', 'Actions']}
            rows={usersTableRows}
          />
        )}
      </Card>

      {/* Stores Section */}
      <Card sectioned>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2>Connected Stores</h2>
          <Button onClick={() => setConnectStoreModalOpen(true)}>Connect Store</Button>
        </div>

        {stores.length === 0 ? (
          <EmptyState
            heading="No stores connected"
            action={{
              content: 'Connect your first store',
              onAction: () => setConnectStoreModalOpen(true),
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          />
        ) : (
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'text']}
            headings={['Store Domain', 'Status', 'Region', 'Connected', 'Actions']}
            rows={storesTableRows}
          />
        )}
      </Card>

      {/* Audit Logs Section */}
      <Card sectioned>
        <h2>Recent Activity</h2>
        {auditLogs.length === 0 ? (
          <EmptyState
            heading="No recent activity"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          />
        ) : (
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'text']}
            headings={['Action', 'Resource', 'Resource ID', 'User', 'Date']}
            rows={auditLogsTableRows}
          />
        )}
      </Card>

      {/* Invite User Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite User"
        primaryAction={{
          content: 'Send Invite',
          onAction: handleInviteUser,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setInviteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="Email"
            value={inviteEmail}
            onChange={setInviteEmail}
            type="email"
            placeholder="user@example.com"
          />
          <div style={{ marginTop: '1rem' }}>
            <Select
              label="Role"
              options={[
                { label: 'Viewer', value: 'VIEWER' },
                { label: 'Analyst', value: 'ANALYST' },
                { label: 'Admin', value: 'ADMIN' },
              ]}
              value={inviteRole}
              onChange={setInviteRole}
            />
          </div>
        </Modal.Section>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Change User Role"
        primaryAction={{
          content: 'Update Role',
          onAction: handleUpdateRole,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setRoleModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <p>
            Changing role for: <strong>{selectedUser?.email}</strong>
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Select
              label="New Role"
              options={[
                { label: 'Viewer', value: 'VIEWER' },
                { label: 'Analyst', value: 'ANALYST' },
                { label: 'Admin', value: 'ADMIN' },
                { label: 'Owner', value: 'OWNER' },
              ]}
              value={newRole}
              onChange={setNewRole}
            />
          </div>
        </Modal.Section>
      </Modal>

      {/* Connect Store Modal */}
      <Modal
        open={connectStoreModalOpen}
        onClose={() => setConnectStoreModalOpen(false)}
        title="Connect Store"
        primaryAction={{
          content: 'Connect Store',
          onAction: handleConnectStore,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setConnectStoreModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="Store ID"
            value={storeId}
            onChange={setStoreId}
            placeholder="store-id"
          />
          <div style={{ marginTop: '1rem' }}>
            <label>
              <input
                type="checkbox"
                checked={isDefaultStore}
                onChange={(e) => setIsDefaultStore(e.target.checked)}
              />
              Set as default store
            </label>
          </div>
        </Modal.Section>
      </Modal>
    </div>
  );
}
