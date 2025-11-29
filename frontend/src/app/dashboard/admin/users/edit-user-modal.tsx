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
}

interface EditUserModalProps {
  user: UserData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, data: { role: string; storeIds: string[] }) => Promise<void>;
  availableStores: Store[];
}

const ROLES = [
  'ADMINISTRATOR',
  'CORPORATE',
  'WHOLESALE',
  'STORE_MANAGER',
  'SALESPERSON',
  'MECHANIC',
];

export default function EditUserModal({ user, isOpen, onClose, onSave, availableStores }: EditUserModalProps) {
  const [role, setRole] = useState(user.role);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(user.stores.map(s => s.id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRole(user.role);
      setSelectedStoreIds(user.stores.map(s => s.id));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, { role, storeIds: selectedStoreIds });
      onClose();
    } catch (error) {
      console.error('Failed to save user', error);
    } finally {
      setSaving(false);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Edit User: {user.username}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
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
  );
}
