'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../../components/dashboard/dashboard-layout';
import { useAuth } from '../../../../contexts/auth-context';
import { Check, X, Shield, User, Search, Filter, Edit2, Trash2, Plus } from 'lucide-react';
import EditUserModal from './edit-user-modal';
import CreateUserModal from './create-user-modal';
import { ROLE_SCOPES } from '../../../../../../backend/src/auth/constants'; // We can't import from backend directly in frontend usually, but let's see if we can duplicate or just hardcode scopes for now. Actually, let's just pass empty scopes for now as the backend handles defaults if not provided, or we need to fetch them.
// Better to just hardcode the default scopes map here or fetch from an endpoint.
// For now, I'll just use a simple map or let the backend handle it if I send empty scopes.
// The backend assignRole expects scopes. I should probably update the backend to apply default scopes if none provided.

interface Store {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isApproved: boolean;
  stores: { id: string; name: string }[];
}

// Duplicate constants for now to avoid import issues across monorepo boundary if not set up
const ROLES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  CORPORATE: 'CORPORATE',
  WHOLESALE: 'WHOLESALE',
  STORE_MANAGER: 'STORE_MANAGER',
  SALESPERSON: 'SALESPERSON',
  MECHANIC: 'MECHANIC',
};

const SCOPES = {
  ALL: '*',
  VIEW_DASHBOARD: 'view:dashboard',
  VIEW_INVENTORY: 'view:inventory',
  VIEW_RESTOCK: 'view:restock',
  VIEW_INSIGHTS: 'view:insights',
  VIEW_REPORTS: 'view:reports',
  VIEW_MECHANIC_STATS: 'view:mechanic_stats',
  VIEW_SALES_STATS: 'view:sales_stats',
  MANAGE_USERS: 'manage:users',
  IMPORT_DATA: 'import:data',
  CLEAR_DB: 'clear:db',
};

const ROLE_SCOPES_MAP: Record<string, string[]> = {
  [ROLES.ADMINISTRATOR]: [SCOPES.ALL],
  [ROLES.CORPORATE]: [
    SCOPES.VIEW_DASHBOARD, 
    SCOPES.VIEW_INVENTORY, 
    SCOPES.VIEW_RESTOCK, 
    SCOPES.VIEW_INSIGHTS, 
    SCOPES.VIEW_REPORTS, 
    SCOPES.VIEW_MECHANIC_STATS, 
    SCOPES.VIEW_SALES_STATS
  ],
  [ROLES.WHOLESALE]: [SCOPES.VIEW_INVENTORY, SCOPES.VIEW_RESTOCK, SCOPES.VIEW_INSIGHTS],
  [ROLES.STORE_MANAGER]: [SCOPES.VIEW_DASHBOARD, SCOPES.VIEW_REPORTS, SCOPES.VIEW_INVENTORY],
  [ROLES.SALESPERSON]: [SCOPES.VIEW_SALES_STATS],
  [ROLES.MECHANIC]: [SCOPES.VIEW_MECHANIC_STATS],
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    console.log('AdminUsersPage mounted. Token:', token);
    if (token) {
      fetchUsers();
      fetchStores();
    }
  }, [token]);

  const fetchUsers = async () => {
    const cleanToken = token?.replace(/"/g, '');
    console.log('Fetching users with token:', cleanToken);
    try {
      const res = await fetch('/api/v1/users', {
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      console.log('Fetch users response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    const cleanToken = token?.replace(/"/g, '');
    try {
      const res = await fetch('/api/v1/stores', {
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStores(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch stores', error);
    }
  };

  const handleCreateUser = async (data: any) => {
    const cleanToken = token?.replace(/"/g, '');
    try {
      const scopes = ROLE_SCOPES_MAP[data.role] || [];
      // Create user
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}` 
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
          scopes,
          isApproved: true, // Admin created users are auto-approved
          stores: data.storeIds,
          employeeId: data.employeeId
        })
      });

      if (res.ok) {
        fetchUsers();
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create user', error);
    }
  };

  const handleApprove = async (id: string) => {
    const cleanToken = token?.replace(/"/g, '');
    try {
      const res = await fetch(`/api/v1/users/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to approve user', error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUserIds.length === 0) return;
    const cleanToken = token?.replace(/"/g, '');
    
    try {
      const res = await fetch('/api/v1/users/bulk-approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}` 
        },
        body: JSON.stringify({ ids: selectedUserIds })
      });

      if (res.ok) {
        fetchUsers();
        setSelectedUserIds([]);
      }
    } catch (error) {
      console.error('Failed to bulk approve users', error);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const cleanToken = token?.replace(/"/g, '');
    try {
      const res = await fetch(`/api/v1/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Password reset successful.\nTemporary Password: ${data.tempPassword}`);
      } else {
        alert('Failed to reset password');
      }
    } catch (error) {
      console.error('Failed to reset password', error);
      alert('An error occurred while resetting password');
    }
  };

  const handleUpdateUser = async (userId: string, data: { role: string; storeIds: string[]; employeeId?: string | null }) => {
    const cleanToken = token?.replace(/"/g, '');
    try {
      const scopes = ROLE_SCOPES_MAP[data.role] || [];
      
      await fetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}` 
        },
        body: JSON.stringify({
          role: data.role,
          scopes,
          stores: data.storeIds,
          employeeId: data.employeeId
        })
      });

      fetchUsers();
    } catch (error) {
      console.error('Failed to update user', error);
      throw error;
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
            {selectedUserIds.length > 0 && (
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Approve Selected ({selectedUserIds.length})
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Stores</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isApproved ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <Check className="w-3 h-3" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <Shield className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {user.stores.length > 0 
                      ? user.stores.map(s => s.name).join(', ') 
                      : <span className="text-slate-400 italic">None</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!user.isApproved && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="text-green-600 hover:text-green-700 font-medium text-xs"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingUser && (
          <EditUserModal
            user={editingUser}
            isOpen={!!editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleUpdateUser}
            onResetPassword={handleResetPassword}
            availableStores={stores}
            token={token}
          />
        )}

        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateUser}
          availableStores={stores}
          token={token}
        />
      </div>
    </DashboardLayout>
  );
}
