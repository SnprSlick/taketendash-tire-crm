'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/dashboard/dashboard-layout';
import { useStore } from '../../../../contexts/store-context';
import { useAuth } from '../../../../contexts/auth-context';
import { 
  User, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Wrench, 
  Package,
  Clock,
  Activity,
  ArrowLeft
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
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function MechanicDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedStoreId } = useStore();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all'); // 'month', 'ytd', 'year', 'all'

  const fetchMechanicDetails = useCallback(async () => {
    if (!params?.name || !token) return;
    setLoading(true);
    setError(null);
    try {
      const encodedName = encodeURIComponent(params.name as string);
      let queryParams = `storeId=${selectedStoreId || ''}`;
      
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      
      if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'ytd') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }
      
      if (startDate) {
        queryParams += `&startDate=${startDate.toISOString()}`;
      }
      
      const res = await fetch(`/api/v1/mechanic/details/${encodedName}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        if (res.status === 404) throw new Error('Mechanic not found');
        throw new Error('Failed to fetch data');
      }

      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch mechanic details', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [params?.name, selectedStoreId, token, dateRange]);

  useEffect(() => {
    fetchMechanicDetails();
  }, [fetchMechanicDetails]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(val);
  };

  if (loading) {
    return (
      <DashboardLayout title="Mechanic Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Mechanic Dashboard">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-slate-700">
            {error || 'Mechanic not found'}
          </h2>
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

  const { summary, invoices, chartData } = data;
  const efficiencyColor = summary.efficiency >= 100 ? '#10B981' : summary.efficiency >= 80 ? '#3B82F6' : '#EF4444';

  // Gauge Data
  const gaugeData = [
    { name: 'Efficiency', value: Math.min(summary.efficiency, 150) },
    { name: 'Remaining', value: 150 - Math.min(summary.efficiency, 150) }
  ];

  return (
    <DashboardLayout title={`Mechanic: ${summary.mechanicName}`}>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          {user?.role !== 'MECHANIC' ? (
            <button 
              onClick={() => router.back()}
              className="flex items-center text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </button>
          ) : (
            <div></div>
          )}
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">This Month</option>
            <option value="ytd">Year to Date</option>
            <option value="year">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Efficiency Gauge Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Efficiency Rating</h3>
            <div className="relative w-64 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell key="efficiency" fill={efficiencyColor} />
                    <Cell key="remaining" fill="#E2E8F0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-0 left-0 right-0 text-center">
                <div className="text-3xl font-bold" style={{ color: efficiencyColor }}>
                  {formatNumber(summary.efficiency)}%
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-slate-500">
              Target: 100%
            </div>
          </div>

          {/* Key Metrics */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase">Billed Hours</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatNumber(summary.totalBilledHours)}</div>
              <div className="text-sm text-slate-500 mt-1">
                vs {formatNumber(summary.businessHoursAvailable)} Available Hours
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase">Gross Profit</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalGrossProfit)}</div>
              <div className="text-sm text-slate-500 mt-1">
                {formatCurrency(summary.profitPerHour)} / Hour
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Wrench className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase">Labor Revenue</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalLabor)}</div>
              <div className="text-sm text-slate-500 mt-1">
                {formatCurrency(summary.laborPerHour)} / Hour
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Package className="w-6 h-6 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase">Parts Revenue</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalParts)}</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Performance Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLabor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748B" 
                  fontSize={12} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short' })} 
                />
                <YAxis yAxisId="left" stroke="#64748B" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={12} />
                <Tooltip 
                  labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  formatter={(value: number, name: string) => [
                    name === 'labor' ? formatCurrency(value) : formatNumber(value),
                    name === 'labor' ? 'Labor Revenue' : 'Billed Hours'
                  ]}
                />
                <Area yAxisId="left" type="monotone" dataKey="labor" name="Labor Revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorLabor)" />
                <Area yAxisId="right" type="monotone" dataKey="billedHours" name="Billed Hours" stroke="#10B981" fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Recent Jobs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Categories</th>
                  <th className="px-6 py-4 text-right">Billed Hours</th>
                  <th className="px-6 py-4 text-right">Labor</th>
                  <th className="px-6 py-4 text-right">Parts</th>
                  <th className="px-6 py-4 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice: any, index: number) => (
                  <tr key={`${invoice.invoiceNumber}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {invoice.categories}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatNumber(invoice.hours)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(invoice.labor)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(invoice.parts)}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                      {formatCurrency(invoice.grossProfit)}
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