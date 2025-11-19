'use client';

import React from 'react';
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
  insights?: SalesInsight[];
  kpis?: KPI[];
  loading?: boolean;
}

const mockSalesData = [
  { month: 'Jan', sales: 4200, revenue: 84000, orders: 168 },
  { month: 'Feb', sales: 3800, revenue: 76000, orders: 152 },
  { month: 'Mar', sales: 5200, revenue: 104000, orders: 208 },
  { month: 'Apr', sales: 4600, revenue: 92000, orders: 184 },
  { month: 'May', sales: 5800, revenue: 116000, orders: 232 },
  { month: 'Jun', sales: 6200, revenue: 124000, orders: 248 }
];

const categoryData = [
  { name: 'Tires', value: 45, color: '#3B82F6' },
  { name: 'Service', value: 30, color: '#10B981' },
  { name: 'Parts', value: 15, color: '#F59E0B' },
  { name: 'Labor', value: 10, color: '#6366F1' }
];

export default function SalesCharts({
  salesData = {
    totalSales: 50,
    totalRevenue: 125000,
    averageOrderValue: 2500,
  },
  insights = [],
  kpis = [],
  loading = false
}: SalesChartsProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={<ShoppingCart className="w-6 h-6" />}
          title="Total Sales"
          value={salesData.totalSales.toString()}
          change="+12.5%"
          changeType="increase"
          gradient="from-blue-500 to-blue-600"
          delay="0s"
        />
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Total Revenue"
          value={`$${salesData.totalRevenue.toLocaleString()}`}
          change="+8.3%"
          changeType="increase"
          gradient="from-green-500 to-emerald-600"
          delay="0.1s"
        />
        <MetricCard
          icon={<Target className="w-6 h-6" />}
          title="Average Order"
          value={`$${salesData.averageOrderValue.toFixed(0)}`}
          change="+15.2%"
          changeType="increase"
          gradient="from-purple-500 to-purple-600"
          delay="0.2s"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Sales Trend
            </h3>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <ArrowUp className="w-3 h-3 mr-1" />
                12.5%
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockSalesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
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
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <span className="ml-auto text-sm font-medium text-slate-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
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
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (insight.type) {
      case 'OPPORTUNITY':
        return 'bg-blue-50 border-blue-200';
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
            'bg-blue-100 text-blue-800'
          }`}>
            Impact: {insight.impact}
          </span>
        </div>
      </div>
    </div>
  );
}