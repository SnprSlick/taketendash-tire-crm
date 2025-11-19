'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/dashboard/dashboard-layout';
import AccountProfile, { LargeAccount, LargeAccountDetail } from '../../../components/accounts/account-profile';
import ContractManager from '../../../components/accounts/contract-manager';
import {
  Building2,
  Crown,
  Star,
  Shield,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Activity,
  RefreshCw,
  Download,
  Settings,
  Bell
} from 'lucide-react';
import AccountNotifications from '../../../components/accounts/account-notifications';

interface AccountFilters {
  tier?: 'SILVER' | 'GOLD' | 'PLATINUM' | '';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED' | '';
  accountType?: 'COMMERCIAL' | 'FLEET' | 'ENTERPRISE' | '';
  accountManager?: string;
  page?: number;
  limit?: number;
}

export default function LargeAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LargeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<LargeAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AccountFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'profile' | 'contracts' | 'notifications'>('list');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.status) params.append('status', filters.status);
      if (filters.accountType) params.append('accountType', filters.accountType);
      if (filters.accountManager) params.append('accountManager', filters.accountManager);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      const response = await fetch(`/api/v1/large-accounts?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      const data = await response.json();
      setAccounts(data.data);

      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = accounts.filter(account => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      account.accountManager.toLowerCase().includes(searchLower) ||
      account.contractNumber?.toLowerCase().includes(searchLower) ||
      account.id.toLowerCase().includes(searchLower)
    );
  });

  const handleAccountSelect = (accountId: string) => {
    startTransition(() => {
      setSelectedAccountId(accountId);
      setView('profile');
    });
  };

  const handleAccountUpdate = (updatedAccount: LargeAccountDetail) => {
    setSelectedAccount(updatedAccount);
    // Update the account in the list as well
    setAccounts(prev =>
      prev.map(account =>
        account.id === updatedAccount.id
          ? { ...account, ...updatedAccount }
          : account
      )
    );
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-purple-600 bg-purple-100';
      case 'GOLD': return 'text-yellow-600 bg-yellow-100';
      case 'SILVER': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return Crown;
      case 'GOLD': return Star;
      case 'SILVER': return Shield;
      default: return Shield;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'INACTIVE': return 'text-gray-600 bg-gray-100';
      case 'SUSPENDED': return 'text-orange-600 bg-orange-100';
      case 'TERMINATED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderAccountCard = (account: LargeAccount) => {
    const TierIcon = getTierIcon(account.tier);

    return (
      <div
        key={account.id}
        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleAccountSelect(account.id)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getTierColor(account.tier)}`}>
              <TierIcon className="w-4 h-4" />
              <span>{account.tier}</span>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(account.status)}`}>
              <Activity className="w-4 h-4" />
              <span>{account.status}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startTransition(() => {
                  setSelectedAccountId(account.id);
                  setView('profile');
                });
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="View profile"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startTransition(() => {
                  setSelectedAccountId(account.id);
                  setView('contracts');
                });
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Manage contracts"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {account.contractNumber || `Account #${account.id.slice(0, 8)}`}
            </h3>
            <p className="text-sm text-gray-600">{account.accountType}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Account Manager:</span>
              <p className="font-medium text-gray-900">{account.accountManager}</p>
            </div>
            <div>
              <span className="text-gray-500">Service Level:</span>
              <p className="font-medium text-gray-900">{account.serviceLevel}</p>
            </div>
          </div>

          {account.annualRevenue && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Annual Revenue</span>
              <span className="text-sm font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                {account.annualRevenue.toLocaleString()}
              </span>
            </div>
          )}

          {account.contractEndDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Contract Expires</span>
              <span className="text-sm font-medium text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(account.contractEndDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Accounts</div>
              <div className="text-2xl font-bold text-gray-900">{accounts.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Crown className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Platinum Accounts</div>
              <div className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.tier === 'PLATINUM').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">
                ${accounts.reduce((sum, a) => sum + (a.annualRevenue || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Active Accounts</div>
              <div className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.status === 'ACTIVE').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Large Accounts</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              <button
                onClick={fetchAccounts}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={filters.tier || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value as any }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Tiers</option>
                  <option value="PLATINUM">Platinum</option>
                  <option value="GOLD">Gold</option>
                  <option value="SILVER">Silver</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select
                  value={filters.accountType || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, accountType: e.target.value as any }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="FLEET">Fleet</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Manager</label>
                <input
                  type="text"
                  value={filters.accountManager || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, accountManager: e.target.value }))}
                  placeholder="Manager name..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Accounts</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={fetchAccounts}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || Object.values(filters).some(v => v)
                  ? "No accounts match your search criteria."
                  : "No large accounts have been created yet."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAccounts.map(renderAccountCard)}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation */}
        {(view === 'profile' || view === 'contracts' || view === 'notifications') && (
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => setView('list')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Accounts
            </button>
            <div className="flex space-x-2 border-b">
              <button
                onClick={() => setView('profile')}
                className={`px-4 py-2 text-sm font-medium ${
                  view === 'profile'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Account Profile
              </button>
              <button
                onClick={() => setView('contracts')}
                className={`px-4 py-2 text-sm font-medium ${
                  view === 'contracts'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Contract Management
              </button>
              <button
                onClick={() => setView('notifications')}
                className={`px-4 py-2 text-sm font-medium flex items-center space-x-1 ${
                  view === 'notifications'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`transition-opacity duration-300 ${view === 'list' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          {renderListView()}
        </div>

        {selectedAccountId && (
          <>
            <div className={`transition-opacity duration-300 ${view === 'profile' ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <AccountProfile
                accountId={selectedAccountId}
                onUpdate={handleAccountUpdate}
              />
            </div>

            <div className={`transition-opacity duration-300 ${view === 'contracts' ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <ContractManager
                accountId={selectedAccountId}
              />
            </div>
          </>
        )}
        <div className={`transition-opacity duration-300 ${view === 'notifications' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  All Account Notifications
                </h2>
                <p className="text-sm text-gray-500">
                  Recent notifications across all large accounts
                </p>
              </div>
            </div>
            <div className="p-6">
              <AccountNotifications maxNotifications={20} showDismissed={false} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}