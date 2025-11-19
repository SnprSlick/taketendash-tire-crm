'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Building2,
  Crown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Users,
  FileText,
  Activity,
  Settings,
  Edit,
  RefreshCw,
  Bell
} from 'lucide-react';
import AccountNotifications from './account-notifications';
import { accountAudit } from '../../lib/logging/account-audit';

export interface LargeAccount {
  id: string;
  customerId: string;
  accountType: 'COMMERCIAL' | 'FLEET' | 'ENTERPRISE';
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  annualRevenue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  accountManager: string;
  specialTerms?: string;
  discountTier?: number;
  serviceLevel: 'STANDARD' | 'ENHANCED' | 'PREMIUM';
  priorityRanking?: number;
  contractNumber?: string;
  creditLimit?: number;
  paymentTerms?: string;
  billingContact?: string;
  billingEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LargeAccountDetail extends LargeAccount {
  customer: {
    id: string;
    companyName?: string;
    contactInfo: {
      firstName: string;
      lastName: string;
      email?: string;
      phone: string;
      address?: string;
    };
  };
  contracts?: any[];
  healthScore?: {
    overallScore: number;
    revenueHealth: number;
    serviceHealth: number;
    paymentHealth: number;
    relationshipHealth: number;
    riskFactors: string[];
    recommendations: string[];
  };
  revenueHistory?: any[];
  serviceHistory?: any[];
  tierChangeHistory?: any[];
}

interface AccountProfileProps {
  accountId: string;
  onUpdate?: (account: LargeAccountDetail) => void;
}

export default function AccountProfile({ accountId, onUpdate }: AccountProfileProps) {
  const [account, setAccount] = useState<LargeAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cacheRef = useRef<Record<string, LargeAccountDetail>>({});
  const currentAccountIdRef = useRef<string | null>(null);

  const fetchAccountDetails = useCallback(async (forceRefresh = false) => {
    try {
      // Check if we already have cached data for this account
      const cachedAccount = cacheRef.current[accountId];

      // If we have cached data and this is the same account, use it immediately
      if (cachedAccount && !forceRefresh && currentAccountIdRef.current === accountId) {
        setAccount(cachedAccount);
        setLoading(false);
        setError(null);
        onUpdate?.(cachedAccount);
        return;
      }

      // If this is a different account but we have cache, show it first to prevent blank state
      if (cachedAccount && currentAccountIdRef.current !== accountId) {
        setAccount(cachedAccount);
        setError(null);
      }

      // Only show loading if we don't have any account data
      if (!account && !cachedAccount) {
        setLoading(true);
      }

      setError(null);
      currentAccountIdRef.current = accountId;

      const response = await fetch(`/api/v1/large-accounts/${accountId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch account: ${response.statusText}`);
      }

      const data = await response.json();

      // Update cache
      cacheRef.current[accountId] = data.data;

      setAccount(data.data);
      onUpdate?.(data.data);

      // Log account view (only on fresh fetch)
      if (!cachedAccount || forceRefresh) {
        await accountAudit.logAccountView(accountId, {
          accountType: data.data.accountType,
          tier: data.data.tier,
          status: data.data.status,
        });
      }
    } catch (err) {
      console.error('Error fetching account details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [accountId, onUpdate, account]);

  const refreshAccount = useCallback(async () => {
    setRefreshing(true);
    await fetchAccountDetails(true);
    setRefreshing(false);
  }, [fetchAccountDetails]);

  useEffect(() => {
    fetchAccountDetails();
  }, [fetchAccountDetails]);

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

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return AlertTriangle;
  };

  if (loading && !account) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-44"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-36"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Account</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAccountDetails}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Account Not Found</h3>
          <p className="text-gray-600">The requested large account could not be found.</p>
        </div>
      </div>
    );
  }

  const TierIcon = getTierIcon(account.tier);
  const HealthIcon = account.healthScore ? getHealthScoreIcon(account.healthScore.overallScore) : AlertTriangle;

  return (
    <div className="space-y-6">
      {/* Subtle loading indicator */}
      {loading && account && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded-md text-sm shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Loading account...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
                onClick={refreshAccount}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Refresh account data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Information */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company</label>
                  <p className="text-sm text-gray-900">
                    {account.customer.companyName || `${account.customer.contactInfo.firstName} ${account.customer.contactInfo.lastName}`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Contact</label>
                  <p className="text-sm text-gray-900">
                    {account.customer.contactInfo.firstName} {account.customer.contactInfo.lastName}
                  </p>
                </div>
                {account.customer.contactInfo.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{account.customer.contactInfo.email}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{account.customer.contactInfo.phone}</span>
                </div>
                {account.customer.contactInfo.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{account.customer.contactInfo.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Account Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Type</label>
                  <p className="text-sm text-gray-900">{account.accountType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Manager</label>
                  <p className="text-sm text-gray-900">{account.accountManager}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Service Level</label>
                  <p className="text-sm text-gray-900">{account.serviceLevel}</p>
                </div>
                {account.priorityRanking && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Priority Ranking</label>
                    <p className="text-sm text-gray-900">#{account.priorityRanking}</p>
                  </div>
                )}
                {account.annualRevenue && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      ${account.annualRevenue.toLocaleString()} annual revenue
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Health Score */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Account Health
              </h3>
              {account.healthScore ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Overall Score</span>
                    <div className="flex items-center space-x-2">
                      <HealthIcon className={`w-4 h-4 ${getHealthScoreColor(account.healthScore.overallScore)}`} />
                      <span className={`text-lg font-semibold ${getHealthScoreColor(account.healthScore.overallScore)}`}>
                        {account.healthScore.overallScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Revenue Health</span>
                      <span className="text-gray-900">{account.healthScore.revenueHealth}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Service Health</span>
                      <span className="text-gray-900">{account.healthScore.serviceHealth}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payment Health</span>
                      <span className="text-gray-900">{account.healthScore.paymentHealth}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Relationship Health</span>
                      <span className="text-gray-900">{account.healthScore.relationshipHealth}/100</span>
                    </div>
                  </div>
                  {account.healthScore.riskFactors.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Risk Factors</label>
                      <ul className="text-sm text-red-600 space-y-1">
                        {account.healthScore.riskFactors.map((factor, index) => (
                          <li key={index} className="flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Health score not available</p>
              )}
            </div>
          </div>

          {/* Contract Information */}
          {(account.contractStartDate || account.contractEndDate || account.contractNumber) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Contract Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {account.contractNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Contract Number</label>
                    <p className="text-sm text-gray-900">{account.contractNumber}</p>
                  </div>
                )}
                {account.contractStartDate && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Start Date</label>
                      <p className="text-sm text-gray-900">
                        {new Date(account.contractStartDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {account.contractEndDate && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">End Date</label>
                      <p className="text-sm text-gray-900">
                        {new Date(account.contractEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Terms & Notes */}
          {(account.specialTerms || account.notes) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {account.specialTerms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Special Terms</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{account.specialTerms}</p>
                  </div>
                )}
                {account.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{account.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Account Notifications
          </h3>
        </div>
        <div className="p-6">
          <AccountNotifications accountId={account.id} maxNotifications={5} />
        </div>
      </div>
    </div>
  );
}