'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../../../components/dashboard/dashboard-layout';
import { 
  User, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  ArrowLeft,
  Award,
  Users
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function SalespersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (params?.name) {
      fetchSalespersonDetails();
    }
  }, [params?.name, year]);

  const fetchSalespersonDetails = async () => {
    if (!params?.name) return;
    setLoading(true);
    try {
      // Decode the name for the URL
      const encodedName = encodeURIComponent(params.name as string);
      const res = await fetch(`/api/v1/invoices/reports/salespeople/${encodedName}?year=${year}`);
      const result = await res.json();
      
      if (result.salesperson) {
        setData(result);
      } else if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch salesperson details', error);
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
      <DashboardLayout title="Salesperson Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Salesperson Details">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-slate-700">Salesperson not found</h2>
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

  const { salesperson, monthlyStats, recentInvoices, topCustomers, totalCommission } = data;

  // Calculate totals from monthly stats
  const totalRevenue = monthlyStats.reduce((sum: number, m: any) => sum + Number(m.total_revenue), 0);
  const totalProfit = monthlyStats.reduce((sum: number, m: any) => sum + Number(m.total_profit), 0);
  const totalInvoices = monthlyStats.reduce((sum: number, m: any) => sum + Number(m.invoice_count), 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  return (
    <DashboardLayout title={`Salesperson: ${salesperson}`}>
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

        {/* Salesperson Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
              {salesperson.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{salesperson}</h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <Award className="w-4 h-4" />
                <span>Sales Representative</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">Total Profit</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalProfit)}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">Total Commission</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalCommission || 0)}</div>
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
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase">Avg Ticket</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(avgTicket)}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Monthly Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyStats}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month_name" stroke="#64748B" fontSize={12} tickFormatter={(val) => val.trim().substring(0, 3)} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'profit_margin' ? formatPercent(value) : formatCurrency(value),
                      name === 'total_revenue' ? 'Revenue' : name === 'total_profit' ? 'Profit' : 'Margin'
                    ]}
                  />
                  <Area type="monotone" dataKey="total_revenue" name="Revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="total_profit" name="Profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Top Customers</h3>
            <div className="space-y-4">
              {topCustomers.map((customer: any, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group"
                  onClick={() => router.push(`/dashboard/sales/reports/customer/${customer.customer_id || customer.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200 group-hover:border-blue-200 group-hover:text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm group-hover:text-blue-700">{customer.name}</div>
                      <div className="text-xs text-slate-500">{customer.invoice_count} invoices</div>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {formatCurrency(customer.total_revenue)}
                  </div>
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
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Profit</th>
                  <th className="px-6 py-4 text-right">Commission</th>
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
                      {invoice.customer?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600">
                      {formatCurrency(invoice.grossProfit)}
                    </td>
                    <td className="px-6 py-4 text-right text-indigo-600 font-medium">
                      {formatCurrency(invoice.commission || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
