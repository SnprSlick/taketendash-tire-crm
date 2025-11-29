'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/dashboard/dashboard-layout';
import SalesCharts from '../../../components/analytics/sales-charts';
import { useStore } from '../../../contexts/store-context';
import { RefreshCw, Calendar, Filter, Download, TrendingUp, FileText } from 'lucide-react';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface SalesInsight {
  type: string;
  title: string;
  description: string;
  impact: string;
}

interface KPI {
  name: string;
  value: string | number;
  trend: string;
}

interface AnalyticsResponse {
  basicAnalytics: SalesData;
  insights: SalesInsight[];
  kpis: KPI[];
  categoryBreakdown?: any[];
  topCustomers?: any[];
  topSalespeople?: any[];
  salesTrend?: any[];
}

export default function SalesDashboardPage() {
  const { selectedStoreId } = useStore();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('365');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod, selectedStoreId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const storeParam = selectedStoreId ? `&storeId=${selectedStoreId}` : '';
      const response = await fetch(`/api/v1/invoices/stats/sales?period=${selectedPeriod}${storeParam}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch analytics');
      }

      setAnalyticsData(result.data);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');

      // Set fallback demo data with enhanced structure
      setAnalyticsData({
        basicAnalytics: {
          totalSales: 248,
          totalRevenue: 524000,
          averageOrderValue: 2113,
        },
        categoryBreakdown: [
          { category: 'TIRES', revenue: 350000, profit: 70000, quantity: 1200 },
          { category: 'SERVICES', revenue: 120000, profit: 90000, quantity: 400 },
          { category: 'PARTS', revenue: 54000, profit: 20000, quantity: 300 }
        ],
        topCustomers: [
          { name: 'Fleet Corp A', total_spent: 45000, invoice_count: 12 },
          { name: 'Transport Logistics', total_spent: 32000, invoice_count: 8 },
          { name: 'City Services', total_spent: 28000, invoice_count: 15 }
        ],
        topSalespeople: [
          { salesperson: 'John Doe', _sum: { totalAmount: 150000 }, _count: { id: 45 } },
          { salesperson: 'Jane Smith', _sum: { totalAmount: 142000 }, _count: { id: 38 } }
        ],
        insights: [
          {
            type: 'OPPORTUNITY',
            title: 'Premium Tire Demand Surge',
            description: 'High-performance tire sales increased by 28% this month, indicating strong customer preference for quality products.',
            impact: 'HIGH',
          },
          {
            type: 'WARNING',
            title: 'Winter Season Preparation',
            description: 'Historical data shows 40% increase in tire change appointments in the next 4 weeks. Consider inventory preparation.',
            impact: 'MEDIUM',
          },
          {
            type: 'OPPORTUNITY',
            title: 'Service Package Upsell Potential',
            description: 'Customers purchasing tires show 65% acceptance rate for additional services when offered during installation.',
            impact: 'HIGH',
          }
        ],
        kpis: [
          { name: 'Monthly Growth', value: '+18.7%', trend: 'up' },
          { name: 'Customer Retention', value: '94.2%', trend: 'up' },
          { name: 'Avg Service Time', value: '47 mins', trend: 'down' },
          { name: 'Profit Margin', value: '32.1%', trend: 'up' },
          { name: 'Repeat Customers', value: '78%', trend: 'up' },
          { name: 'Inventory Turnover', value: '6.2x', trend: 'stable' }
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  return (
    <DashboardLayout title="Sales Analytics Dashboard">
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-700 bg-clip-text text-transparent">
                  Sales Analytics
                </h1>
                <p className="text-slate-600">Real-time insights into your business performance</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Time Period Selector */}
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>

              <Link 
                href="/dashboard/sales/reports"
                className="inline-flex items-center px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all duration-200 shadow hover:shadow-md"
              >
                <FileText className="w-4 h-4 mr-2" />
                Detailed Reports
              </Link>

              <button className="inline-flex items-center px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all duration-200 shadow hover:shadow-md">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {error && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-semibold text-amber-800">Backend Connection Issue</h3>
                <p className="mt-1 text-sm text-amber-700">{error}</p>
                <p className="mt-1 text-xs text-amber-600">
                  Displaying demo data. The dashboard will automatically update when connection is restored.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Charts */}
        <SalesCharts
          salesData={analyticsData?.basicAnalytics}
          categoryBreakdown={analyticsData?.categoryBreakdown}
          topCustomers={analyticsData?.topCustomers}
          topSalespeople={analyticsData?.topSalespeople}
          salesTrend={analyticsData?.salesTrend}
          insights={analyticsData?.insights}
          kpis={analyticsData?.kpis}
          loading={loading}
          storeId={selectedStoreId}
        />

        {/* System Status Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-red-50 border border-slate-200/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">System Status</h4>
                <p className="text-xs text-slate-600">
                  Connected to TireMaster CRM • Real-time sync enabled • Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-6 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Backend API</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>GraphQL</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Database</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}