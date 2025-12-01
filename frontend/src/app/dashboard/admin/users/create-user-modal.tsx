'use client';

import React, { useState } from 'react';
import { X, User, Lock, Mail, Shield, Store } from 'lucide-react';

interface Store {
  id: string;
  name: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
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

export default function CreateUserModal({ isOpen, onClose, onSave, availableStores, token }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'SALESPERSON',
    storeIds: [] as string[],
    employeeId: ''
  });
  const [saving, setSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);

  useEffect(() => {
    const searchEmployees = async () => {
      if (!employeeSearch || employeeSearch.length < 2) {
        setEmployeeResults([]);
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
  }, [employeeSearch, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleStore = (storeId: string) => {
    setFormData(prev => ({
      ...prev,
      storeIds: prev.storeIds.includes(storeId)
        ? prev.storeIds.filter(id => id !== storeId)
        : [...prev.storeIds, storeId]
    }));
  };

  const selectEmployee = (employee: any) => {
    setFormData(prev => ({
      ...prev,
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      // email: employee.email // Optional: auto-fill email?
    }));
    setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
    setEmployeeResults([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Create New User</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Employee Search Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Link to Existing Employee (Optional)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={employeeSearch}
                onChange={e => {
                  setEmployeeSearch(e.target.value);
                  if (!e.target.value) setFormData(prev => ({ ...prev, employeeId: '' }));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {searchingEmployees && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
            <p className="text-xs text-slate-500 mt-1">
              Linking to an employee will auto-fill name fields and enable role-specific features.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                required
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                required
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                required
                type="text"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Initial Password</label>
            <input
              required
              type="password"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Stores</label>
            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
              {availableStores.map(store => (
                <div 
                  key={store.id}
                  onClick={() => toggleStore(store.id)}
                  className={`
                    flex items-center justify-between p-3 cursor-pointer transition-colors
                    ${formData.storeIds.includes(store.id) ? 'bg-red-50' : 'hover:bg-slate-50'}
                  `}
                >
                  <span className={`text-sm ${formData.storeIds.includes(store.id) ? 'font-medium text-red-900' : 'text-slate-700'}`}>
                    {store.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
