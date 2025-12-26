'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../../../components/dashboard/dashboard-layout';
import { useStore } from '@/contexts/store-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  User, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  ArrowLeft,
  Package,
  Truck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedStoreId } = useStore();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => {
    if (params?.id && token) {
      fetchCustomerDetails();
    }
  }, [params?.id, year, selectedStoreId, token, page, limit]);

  const fetchCustomerDetails = async () => {
    if (!params?.id || !token) return;
    setLoading(true);
    try {
      const storeParam = selectedStoreId ? `&storeId=${selectedStoreId}` : '';
      const res = await fetch(`/api/v1/invoices/reports/customers/${params.id}?year=${year}${storeParam}&page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch customer details', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
  };

  const formatPercent = (val: number | string) => {
    return `${Number(val).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Customer Details">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-slate-700">Customer not found</h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const { customer, monthlyStats, recentInvoices, topCategories, pagination } = data;

  // Calculate totals from monthly stats
  const totalRevenue = monthlyStats.reduce((sum: number, m: any) => sum + Number(m.total_revenue), 0);
  const totalProfit = monthlyStats.reduce((sum: number, m: any) => sum + Number(m.total_profit), 0);
  const totalInvoices = monthlyStats.reduce((sum: number, m: any) => sum + Number(m.invoice_count), 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

  return (
    <DashboardLayout title={`Customer: ${customer.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </button>
          <select 
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                {customer.customerCode && (
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {customer.customerCode}
                  </span>
                )}
                {customer.phone && (
                  <span>{customer.phone}</span>
                )}
                {customer.email && (
                  <span>{customer.email}</span>
                )}
              </div>
              {customer.address && (
                <div className="mt-2 text-slate-500 text-sm flex items-center">
                  <Truck className="w-4 h-4 mr-1" />
                  {customer.address}, {customer.city}, {customer.state} {customer.zipCode}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Total Invoices</div>
              <div className="text-2xl font-bold text-slate-800">{customer._count?.invoices || 0}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">YTD Revenue</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">YTD Profit</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalProfit)}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">Avg Margin</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatPercent(avgMargin)}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">Invoices (YTD)</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalInvoices}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Monthly Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month_name" stroke="#64748B" fontSize={12} tickFormatter={(val) => val.trim().substring(0, 3)} />
                  <YAxis 
                    yAxisId="left" 
                    stroke="#64748B" 
                    fontSize={12} 
                    domain={[0, 'auto']}
                    padding={{ top: 20 }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#64748B" 
                    fontSize={12} 
                    domain={[0, 'auto']}
                    padding={{ top: 20 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'profit_margin' ? formatPercent(value) : formatCurrency(value),
                      name === 'total_revenue' ? 'Revenue' : name === 'total_profit' ? 'Profit' : 'Margin'
                    ]}
                  />
                  <Bar yAxisId="left" dataKey="total_revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="total_profit" name="Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Top Categories</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total_revenue"
                  >
                    {topCategories.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {topCategories.map((cat: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-600">{cat.category}</span>
                  </div>
                  <span className="font-medium text-slate-900">{formatCurrency(cat.total_revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Recent Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Salesperson</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((invoice: any) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/sales/invoices/${encodeURIComponent(invoice.invoiceNumber)}`)}
                  >
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {invoice.vehicleInfo || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {invoice.salesperson}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600">
                      {formatCurrency(invoice.grossProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {pagination && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600 font-medium px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
