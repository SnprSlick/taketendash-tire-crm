'use client';

import React from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Lightbulb,
  Target,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from 'lucide-react';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalProfit?: number;
  profitMargin?: number;
}

interface CategoryStat {
  category: string;
  revenue: number;
  profit: number;
  quantity: number;
}

interface TopEntity {
  id?: string;
  name: string;
  total_spent?: number;
  invoice_count?: number;
  _sum?: {
    totalAmount: number;
  };
  _count?: {
    id: number;
  };
  salesperson?: string;
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

interface SalesChartsProps {
  salesData?: SalesData;
  categoryBreakdown?: CategoryStat[];
  topCustomers?: TopEntity[];
  topSalespeople?: TopEntity[];
  salesTrend?: any[];
  insights?: SalesInsight[];
  kpis?: KPI[];
  loading?: boolean;
  storeId?: string | null;
}

const mockSalesData = [
  { month: 'Jan', sales: 4200, revenue: 84000, orders: 168 },
  { month: 'Feb', sales: 3800, revenue: 76000, orders: 152 },
  { month: 'Mar', sales: 5200, revenue: 104000, orders: 208 },
  { month: 'Apr', sales: 4600, revenue: 92000, orders: 184 },
  { month: 'May', sales: 5800, revenue: 116000, orders: 232 },
  { month: 'Jun', sales: 6200, revenue: 124000, orders: 248 }
];

export default function SalesCharts({
  salesData = {
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalProfit: 0,
    profitMargin: 0
  },
  categoryBreakdown = [],
  topCustomers = [],
  topSalespeople = [],
  salesTrend = [],
  insights = [],
  kpis = [],
  loading = false,
  storeId
}: SalesChartsProps) {
  // Use provided salesTrend if available, otherwise fallback to mock data only if loading failed or empty
  const chartData = salesTrend.length > 0 ? salesTrend : mockSalesData;
  
  // Process category data for chart
  const categoryChartData = categoryBreakdown.map((cat, index) => ({
    name: cat.category,
    value: Number(cat.revenue),
    color: ['#dc2626', '#10B981', '#F59E0B', '#6366F1', '#EC4899'][index % 5]
  }));

  // Calculate total revenue for percentages
  const totalRevenue = categoryChartData.reduce((sum, item) => sum + item.value, 0);

  // Calculate dynamic trend percentage
  let trendPercentage = 0;
  let trendDirection = 'neutral';
  
  let invoiceTrend = { formatted: '0.0%', direction: 'neutral' as const };
  let revenueTrend = { formatted: '0.0%', direction: 'neutral' as const };
  let avgOrderTrend = { formatted: '0.0%', direction: 'neutral' as const };
  let marginTrend = { formatted: '0.0%', direction: 'neutral' as const };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return { percent: 0, direction: 'neutral' as const, formatted: '0.0%' };
    const change = ((current - previous) / previous) * 100;
    return {
      percent: Math.abs(change),
      direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral' as const,
      formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  };

  if (chartData.length >= 2) {
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];
    
    // Calculate growth over the period
    const startValue = Number(firstPoint.revenue || 0);
    const endValue = Number(lastPoint.revenue || 0);
    
    if (startValue > 0) {
      trendPercentage = ((endValue - startValue) / startValue) * 100;
      trendDirection = trendPercentage > 0 ? 'increase' : trendPercentage < 0 ? 'decrease' : 'neutral';
    }

    // Invoices (orders)
    invoiceTrend = calculateGrowth(Number(lastPoint.orders || 0), Number(firstPoint.orders || 0));

    // Revenue
    revenueTrend = calculateGrowth(Number(lastPoint.revenue || 0), Number(firstPoint.revenue || 0));

    // Avg Order
    const lastAvg = Number(lastPoint.orders) > 0 ? Number(lastPoint.revenue) / Number(lastPoint.orders) : 0;
    const firstAvg = Number(firstPoint.orders) > 0 ? Number(firstPoint.revenue) / Number(firstPoint.orders) : 0;
    avgOrderTrend = calculateGrowth(lastAvg, firstAvg);

    // Margin (sales is profit)
    const lastMargin = Number(lastPoint.revenue) > 0 ? (Number(lastPoint.sales) / Number(lastPoint.revenue)) * 100 : 0;
    const firstMargin = Number(firstPoint.revenue) > 0 ? (Number(firstPoint.sales) / Number(firstPoint.revenue)) * 100 : 0;
    marginTrend = calculateGrowth(lastMargin, firstMargin);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          icon={<ShoppingCart className="w-6 h-6" />}
          title="Total Invoices"
          value={salesData.totalSales.toString()}
          change={invoiceTrend.formatted}
          changeType={invoiceTrend.direction}
          gradient="from-red-500 to-red-600"
          delay="0s"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Total Revenue"
          value={`$${salesData.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
          change={revenueTrend.formatted}
          changeType={revenueTrend.direction}
          gradient="from-green-500 to-emerald-600"
          delay="0.1s"
        />
        <MetricCard
          icon={<Target className="w-6 h-6" />}
          title="Average Order"
          value={`$${salesData.averageOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          change={avgOrderTrend.formatted}
          changeType={avgOrderTrend.direction}
          gradient="from-purple-500 to-purple-600"
          delay="0.2s"
        />
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Profit Margin"
          value={`${(salesData.profitMargin || 0).toFixed(1)}%`}
          change={marginTrend.formatted}
          changeType={marginTrend.direction}
          gradient="from-amber-500 to-orange-600"
          delay="0.3s"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-red-600" />
              Sales Trend
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                trendDirection === 'increase' ? 'bg-green-100 text-green-800' : 
                trendDirection === 'decrease' ? 'bg-red-100 text-red-800' : 
                'bg-slate-100 text-slate-800'
              }`}>
                {trendDirection === 'increase' ? <ArrowUp className="w-3 h-3 mr-1" /> : 
                 trendDirection === 'decrease' ? <ArrowDown className="w-3 h-3 mr-1" /> : 
                 <ArrowRight className="w-3 h-3 mr-1" />}
                {Math.abs(trendPercentage).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={12} 
                  tickFormatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
                  domain={[0, 'auto']}
                  padding={{ top: 20 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number, name: string) => [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, name === 'revenue' ? 'Revenue' : 'Profit']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#dc2626"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#profitGradient)"
                  name="Profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up" style={{animationDelay: '0.2s'}}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Revenue by Category
          </h3>
          <div className="h-64 flex items-center">
            <div className="w-full">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryChartData.map((item) => (
                  <div key={item.name} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <span className="ml-auto text-sm font-medium text-slate-800">
                      {totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers & Salespeople */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up" style={{animationDelay: '0.3s'}}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-indigo-600" />
            Top Customers
          </h3>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <Link 
                href={`/dashboard/sales/reports/customer/${customer.id}${storeId ? `?storeId=${storeId}` : ''}`}
                key={index} 
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.invoice_count || 0} Invoices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">${Number(customer.total_spent || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </Link>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-center text-slate-500 py-4">No customer data available</p>
            )}
          </div>
        </div>

        {/* Top Salespeople */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up" style={{animationDelay: '0.4s'}}>
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-pink-600" />
            Top Salespeople
          </h3>
          <div className="space-y-4">
            {topSalespeople.map((person, index) => (
              <Link
                href={`/dashboard/sales/reports/salesperson/${encodeURIComponent(person.salesperson || '')}${storeId ? `?storeId=${storeId}` : ''}`}
                key={index} 
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{person.salesperson || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{person._count?.id || 0} Invoices</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">${Number(person._sum?.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </Link>
            ))}
            {topSalespeople.length === 0 && (
              <p className="text-center text-slate-500 py-4">No sales data available</p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-purple-600" />
            Key Performance Indicators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.map((kpi, index) => (
              <div key={index} className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50">
                <div className="text-sm font-medium text-slate-600 mb-1">{kpi.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-800">{kpi.value}</span>
                  <TrendIcon trend={kpi.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Insights */}
      {insights.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
            AI-Powered Business Insights
          </h3>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} delay={`${index * 0.1}s`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  gradient: string;
  delay: string;
}

function MetricCard({ icon, title, value, change, changeType, gradient, delay }: MetricCardProps) {
  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-stagger"
      style={{ '--stagger-delay': delay } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
            {icon}
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mb-2">{value}</p>
          <div className={`flex items-center text-sm font-medium ${
            changeType === 'increase' ? 'text-green-600' :
            changeType === 'decrease' ? 'text-red-600' :
            'text-slate-600'
          }`}>
            <TrendIcon trend={changeType === 'increase' ? 'up' : changeType === 'decrease' ? 'down' : 'stable'} />
            <span className="ml-1">{change}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  const iconClass = "w-4 h-4";

  switch (trend) {
    case 'up':
      return <ArrowUp className={`${iconClass} text-green-600`} />;
    case 'down':
      return <ArrowDown className={`${iconClass} text-red-600`} />;
    default:
      return <ArrowRight className={`${iconClass} text-slate-600`} />;
  }
}

function InsightCard({ insight, delay }: { insight: SalesInsight; delay: string }) {
  const getInsightIcon = () => {
    switch (insight.type) {
      case 'OPPORTUNITY':
        return <Lightbulb className="w-5 h-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (insight.type) {
      case 'OPPORTUNITY':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 animate-stagger ${getBackgroundColor()}`}
      style={{ '--stagger-delay': delay } as React.CSSProperties}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {getInsightIcon()}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-800 mb-1">{insight.title}</h4>
          <p className="text-slate-600 text-sm mb-2">{insight.description}</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            insight.impact === 'HIGH' ? 'bg-red-100 text-red-800' :
            insight.impact === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
            'bg-red-100 text-red-800'
          }`}>
            Impact: {insight.impact}
          </span>
        </div>
      </div>
    </div>
  );
}