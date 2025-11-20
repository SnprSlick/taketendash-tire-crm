'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Edit,
  RefreshCw,
  Eye,
  Building2,
  Star,
  AlertTriangle,
  Target,
  BarChart3
} from 'lucide-react';

interface CustomerSummary {
  totalInvoices: number;
  totalAmount: number;
  averageOrderValue: number;
  lastPurchaseDate?: string;
  firstPurchaseDate?: string;
  purchaseFrequency: number;
  loyaltyScore: number;
  riskScore: number;
  isAtRisk: boolean;
}

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  lineItemCount: number;
}

interface TopProduct {
  productName: string;
  quantity: number;
  totalAmount: number;
  category: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerDetailData {
  customer: Customer;
  summary: CustomerSummary;
  recentInvoices: CustomerInvoice[];
  topProducts: TopProduct[];
  monthlyTrends: Array<{
    month: string;
    invoiceCount: number;
    totalAmount: number;
  }>;
}

interface CustomerDetailProps {
  customerId: string;
  onBack?: () => void;
  className?: string;
}

export default function CustomerDetail({
  customerId,
  onBack,
  className = ''
}: CustomerDetailProps) {
  const router = useRouter();
  const [customerData, setCustomerData] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'analytics'>('overview');

  // Load customer details
  const loadCustomerDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/customers/${customerId}/summary`);

      if (!response.ok) {
        throw new Error(`Failed to load customer: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setCustomerData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load customer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCustomerData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerDetail();
  }, [customerId]);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/customers');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusColors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PAID: 'bg-green-100 text-green-800 border-green-200',
      VOIDED: 'bg-red-100 text-red-800 border-red-200',
      OVERDUE: 'bg-orange-100 text-orange-800 border-orange-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'
      }`}>
        {status}
      </span>
    );
  };

  // Risk indicator component
  const RiskIndicator = ({ riskScore, isAtRisk }: { riskScore: number; isAtRisk: boolean }) => {
    const getRiskColor = () => {
      if (riskScore <= 30) return 'text-green-600 bg-green-100';
      if (riskScore <= 60) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    };

    const getRiskLevel = () => {
      if (riskScore <= 30) return 'Low Risk';
      if (riskScore <= 60) return 'Medium Risk';
      return 'High Risk';
    };

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${getRiskColor()}`}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">{getRiskLevel()}</span>
        <span className="text-xs">({riskScore}%)</span>
      </div>
    );
  };

  // Loyalty score component
  const LoyaltyScore = ({ score }: { score: number }) => {
    const getScoreColor = () => {
      if (score >= 80) return 'text-green-600 bg-green-100';
      if (score >= 60) return 'text-blue-600 bg-blue-100';
      if (score >= 40) return 'text-yellow-600 bg-yellow-100';
      return 'text-gray-600 bg-gray-100';
    };

    const getScoreLevel = () => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Average';
      return 'Low';
    };

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${getScoreColor()}`}>
        <Star className="h-4 w-4" />
        <span className="text-sm font-medium">{getScoreLevel()}</span>
        <span className="text-xs">({score}/100)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading customer details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error loading customer</div>
            <div className="text-sm text-gray-500 mb-4">{error}</div>
            <button
              onClick={loadCustomerDetail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { customer, summary, recentInvoices, topProducts, monthlyTrends } = customerData;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {customer.customerCode && (
                    <span>Code: {customer.customerCode}</span>
                  )}
                  <span>•</span>
                  <span>Customer since {formatDate(customer.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/customers/${customer.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Customer Info & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
            <div className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-600">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Purchase Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Orders:</span>
                <span className="font-medium">{summary.totalInvoices}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Spent:</span>
                <span className="font-medium">{formatCurrency(summary.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Average Order:</span>
                <span className="font-medium">{formatCurrency(summary.averageOrderValue)}</span>
              </div>
              {summary.lastPurchaseDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Order:</span>
                  <span className="font-medium">{formatDate(summary.lastPurchaseDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Health */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Health</h3>
            <div className="space-y-3">
              <LoyaltyScore score={summary.loyaltyScore} />
              <RiskIndicator riskScore={summary.riskScore} isAtRisk={summary.isAtRisk} />
              {summary.isAtRisk && (
                <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                  This customer may be at risk of churning. Consider reaching out with special offers or support.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recent Invoices ({recentInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{product.productName}</div>
                        <div className="text-xs text-gray-500">
                          {product.category} • Qty: {product.quantity}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(product.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div>No product purchases yet</div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h3>
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <div>
                        <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(invoice.invoiceDate)} • {invoice.lineItemCount} items
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={invoice.status} />
                        <div className="text-sm font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentInvoices.length > 5 && (
                    <button
                      onClick={() => setActiveTab('invoices')}
                      className="w-full text-center py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View all invoices ({recentInvoices.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div>No invoices yet</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">All Invoices</h3>
              <button
                onClick={() => router.push(`/invoices?customerId=${customer.id}`)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View in Invoices →
              </button>
            </div>

            {recentInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.lineItemCount} items
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.invoiceDate)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.totalAmount)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="mb-2">No invoices found</div>
                <div className="text-sm">This customer hasn't made any purchases yet</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Analytics</h3>

            {monthlyTrends.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Monthly Purchase Trends</h4>
                  <div className="space-y-2">
                    {monthlyTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{trend.month}</div>
                          <div className="text-xs text-gray-500">{trend.invoiceCount} orders</div>
                        </div>
                        <div className="text-sm font-medium">
                          {formatCurrency(trend.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Metrics */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Customer Metrics</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Purchase Frequency</span>
                      </div>
                      <div className="text-lg font-bold text-blue-700">
                        {summary.purchaseFrequency.toFixed(1)} orders/month
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Loyalty Score</span>
                      </div>
                      <div className="text-lg font-bold text-green-700">
                        {summary.loyaltyScore}/100
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm">Risk Score</span>
                      </div>
                      <div className="text-lg font-bold text-orange-700">
                        {summary.riskScore}/100
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="mb-2">No analytics data available</div>
                <div className="text-sm">Purchase history is needed to generate analytics</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}