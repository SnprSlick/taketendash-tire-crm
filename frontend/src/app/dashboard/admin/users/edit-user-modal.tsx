'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Store, Shield } from 'lucide-react';

interface Store {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  stores: { id: string; name: string }[];
  employee?: { id: string; firstName: string; lastName: string; employeeId: string };
}

interface EditUserModalProps {
  user: UserData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, data: { role: string; storeIds: string[]; employeeId?: string | null }) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  availableStores: Store[];
  token: string | null;
}

const ROLES = [
  'ADMINISTRATOR',
  'CORPORATE',
  'WHOLESALE',
  'STORE_MANAGER',
  'SALESPERSON',
  'MECHANIC',
];

export default function EditUserModal({ user, isOpen, onClose, onSave, onResetPassword, availableStores, token }: EditUserModalProps) {
  const [role, setRole] = useState(user.role);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(user.stores.map(s => s.id));
  const [employeeId, setEmployeeId] = useState<string | null>(user.employee?.id || null);
  const [employeeSearch, setEmployeeSearch] = useState(user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : '');
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRole(user.role);
      setSelectedStoreIds(user.stores.map(s => s.id));
      setEmployeeId(user.employee?.id || null);
      setEmployeeSearch(user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : '');
    }
  }, [isOpen, user]);

  useEffect(() => {
    const searchEmployees = async () => {
      if (!employeeSearch || employeeSearch.length < 2) {
        setEmployeeResults([]);
        return;
      }
      
      // Don't search if the search term matches the currently selected employee's name
      if (user.employee && employeeSearch === `${user.employee.firstName} ${user.employee.lastName}` && employeeId === user.employee.id) {
        return;
      }

      setSearchingEmployees(true);
      try {
        const cleanToken = token?.replace(/"/g, '');
        const res = await fetch(`/api/v1/users/search-employees?q=${encodeURIComponent(employeeSearch)}`, {
          headers: { Authorization: `Bearer ${cleanToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEmployeeResults(data);
        }
      } catch (error) {
        console.error('Failed to search employees', error);
      } finally {
        setSearchingEmployees(false);
      }
    };

    const timeoutId = setTimeout(searchEmployees, 500);
    return () => clearTimeout(timeoutId);
  }, [employeeSearch, token, employeeId, user.employee]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, { role, storeIds: selectedStoreIds, employeeId });
      onClose();
    } catch (error) {
      console.error('Failed to save user', error);
    } finally {
      setSaving(false);
    }
  };

  const selectEmployee = (employee: any) => {
    setEmployeeId(employee.id);
    setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
    setEmployeeResults([]);
  };

  const clearEmployee = () => {
    setEmployeeId(null);
    setEmployeeSearch('');
    setEmployeeResults([]);
  };

  const handleResetPassword = async () => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return;
    setResetting(true);
    try {
      await onResetPassword(user.id);
    } catch (error) {
      console.error('Failed to reset password', error);
    } finally {
      setResetting(false);
    }
  };

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds(prev => 
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Edit User: {user.username}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Employee Linking */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Linked Employee</label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={employeeSearch}
                  onChange={e => {
                    setEmployeeSearch(e.target.value);
                    if (!e.target.value) setEmployeeId(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {employeeId && (
                  <button
                    onClick={clearEmployee}
                    className="px-3 py-2 text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
                    title="Unlink Employee"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {searchingEmployees && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                </div>
              )}
              
              {employeeResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {employeeResults.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => selectEmployee(emp)}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <div className="font-medium text-slate-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-slate-500">ID: {emp.employeeId} • Role: {emp.role}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {employeeId && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Linked to employee
              </p>
            )}
          </div>

          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Store className="w-4 h-4" />
              Assigned Stores
            </label>
            <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
              {availableStores.map(store => (
                <div 
                  key={store.id}
                  onClick={() => toggleStore(store.id)}
                  className={`
                    flex items-center justify-between p-3 cursor-pointer transition-colors
                    ${selectedStoreIds.includes(store.id) ? 'bg-red-50' : 'hover:bg-slate-50'}
                  `}
                >
                  <span className={`text-sm ${selectedStoreIds.includes(store.id) ? 'font-medium text-red-900' : 'text-slate-700'}`}>
                    {store.name}
                  </span>
                  {selectedStoreIds.includes(store.id) && (
                    <Check className="w-4 h-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {selectedStoreIds.length} store{selectedStoreIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset Password'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
