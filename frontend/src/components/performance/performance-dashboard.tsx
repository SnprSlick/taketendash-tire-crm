'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  User,
  Star,
  ArrowUp,
  ArrowDown,
  Calendar,
  Target,
  Activity,
  Award,
  BarChart3,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react';

interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  totalRevenue: number;
  totalLaborHours: number;
  revenuePerLaborHour: number;
  totalServices: number;
  averageServiceValue: number;
  laborCost: number;
  partsCost: number;
  profitMargin: number;
  serviceBreakdown: Record<string, {
    count: number;
    totalRevenue: number;
    totalHours: number;
  }>;
  trendData: {
    weeklyRevenue: Array<{
      week: string;
      revenue: number;
      hours: number;
    }>;
  };
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
}

interface PerformanceAnalytics {
  performanceData: EmployeePerformance[];
  totalRevenue: number;
  totalLaborHours: number;
  overallRevenuePerLaborHour: number;
  totalEmployees: number;
  periodStart: string;
  periodEnd: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PerformanceDashboardProps {
  employeeId?: string | null;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  onEmployeeSelect?: (employeeId: string | null) => void;
  onDateRangeChange?: (newDateRange: { startDate: string; endDate: string }) => void;
}

export default function PerformanceDashboard({
  employeeId,
  dateRange,
  onEmployeeSelect,
  onDateRangeChange
}: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeId || '');

  const loadPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for now - in real app, this would be an API call
      const mockData: PerformanceAnalytics = {
        performanceData: [
          {
            employeeId: '1',
            employeeName: 'John Smith',
            totalRevenue: 15750.00,
            totalLaborHours: 85.5,
            revenuePerLaborHour: 184.21,
            totalServices: 32,
            averageServiceValue: 492.19,
            laborCost: 2565.00,
            partsCost: 8950.00,
            profitMargin: 4235.00,
            serviceBreakdown: {
              'Tire Installation': { count: 12, totalRevenue: 8400.00, totalHours: 36.0 },
              'Oil Change': { count: 15, totalRevenue: 1875.00, totalHours: 22.5 },
              'Brake Service': { count: 5, totalRevenue: 5475.00, totalHours: 27.0 }
            },
            trendData: {
              weeklyRevenue: [
                { week: '2024-01-08', revenue: 3200.00, hours: 18.5 },
                { week: '2024-01-15', revenue: 4100.00, hours: 22.0 },
                { week: '2024-01-22', revenue: 3850.00, hours: 20.5 },
                { week: '2024-01-29', revenue: 4600.00, hours: 24.5 }
              ]
            },
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31',
            lastUpdated: new Date().toISOString()
          },
          {
            employeeId: '2',
            employeeName: 'Sarah Johnson',
            totalRevenue: 12350.00,
            totalLaborHours: 78.0,
            revenuePerLaborHour: 158.33,
            totalServices: 28,
            averageServiceValue: 441.07,
            laborCost: 2340.00,
            partsCost: 6200.00,
            profitMargin: 3810.00,
            serviceBreakdown: {
              'Oil Change': { count: 18, totalRevenue: 2250.00, totalHours: 27.0 },
              'Tire Rotation': { count: 8, totalRevenue: 1200.00, totalHours: 12.0 },
              'General Maintenance': { count: 2, totalRevenue: 8900.00, totalHours: 39.0 }
            },
            trendData: {
              weeklyRevenue: [
                { week: '2024-01-08', revenue: 2800.00, hours: 17.0 },
                { week: '2024-01-15', revenue: 3200.00, hours: 19.5 },
                { week: '2024-01-22', revenue: 3050.00, hours: 20.0 },
                { week: '2024-01-29', revenue: 3300.00, hours: 21.5 }
              ]
            },
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31',
            lastUpdated: new Date().toISOString()
          }
        ],
        totalRevenue: 28100.00,
        totalLaborHours: 163.5,
        overallRevenuePerLaborHour: 171.87,
        totalEmployees: 2,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31'
      };

      setPerformanceData(mockData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, selectedPeriod, dateRange]);

  // Load performance data
  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const getPerformanceGrade = (revenuePerHour: number) => {
    if (revenuePerHour >= 200) return { grade: 'A+', color: 'text-emerald-600 bg-emerald-50' };
    if (revenuePerHour >= 180) return { grade: 'A', color: 'text-green-600 bg-green-50' };
    if (revenuePerHour >= 160) return { grade: 'B+', color: 'text-blue-600 bg-blue-50' };
    if (revenuePerHour >= 140) return { grade: 'B', color: 'text-yellow-600 bg-yellow-50' };
    if (revenuePerHour >= 120) return { grade: 'C+', color: 'text-orange-600 bg-orange-50' };
    return { grade: 'C', color: 'text-red-600 bg-red-50' };
  };

  const getMostProfitableService = (employee: EmployeePerformance) => {
    const services = Object.entries(employee.serviceBreakdown);
    if (services.length === 0) return null;

    const mostProfitable = services.reduce((best, [serviceName, data]) => {
      const revenuePerHour = data.totalHours > 0 ? data.totalRevenue / data.totalHours : 0;
      const bestRevenuePerHour = best.data.totalHours > 0 ? best.data.totalRevenue / best.data.totalHours : 0;

      return revenuePerHour > bestRevenuePerHour
        ? { name: serviceName, data }
        : best;
    }, { name: services[0][0], data: services[0][1] });

    const revenuePerHour = mostProfitable.data.totalHours > 0 ? mostProfitable.data.totalRevenue / mostProfitable.data.totalHours : 0;

    return {
      service: mostProfitable.name,
      revenuePerHour
    };
  };

  if (!performanceData) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
            <p className="text-gray-600">Monitor employee productivity and efficiency metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={loadPerformanceData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(performanceData.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Avg Revenue/Hour</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(performanceData.overallRevenuePerLaborHour)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Hours</p>
                <p className="text-2xl font-bold text-purple-900">{formatNumber(performanceData.totalLaborHours)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Active Employees</p>
                <p className="text-2xl font-bold text-orange-900">{performanceData.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {performanceData.performanceData.map((employee) => {
          const performanceGrade = getPerformanceGrade(employee.revenuePerLaborHour);
          const mostProfitable = getMostProfitableService(employee);
          const profitMarginPercent = employee.totalRevenue > 0 ? (employee.profitMargin / employee.totalRevenue) * 100 : 0;

          return (
            <div
              key={employee.employeeId}
              className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onEmployeeSelect && onEmployeeSelect(employee.employeeId)}
            >
              {/* Employee Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{employee.employeeName}</h3>
                    <p className="text-sm text-gray-500">Service Advisor</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${performanceGrade.color}`}>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>{performanceGrade.grade}</span>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Revenue/Hour</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(employee.revenuePerLaborHour)}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Total Revenue</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(employee.totalRevenue)}</p>
                    </div>
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Services</p>
                      <p className="text-xl font-bold text-gray-900">{employee.totalServices}</p>
                    </div>
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Profit Margin</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(profitMarginPercent)}%</p>
                    </div>
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Most Profitable Service */}
              {mostProfitable && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">Best Service</p>
                      <p className="text-sm font-semibold text-green-900">{mostProfitable.service}</p>
                      <p className="text-xs text-green-600">{formatCurrency(mostProfitable.revenuePerHour)}/hour</p>
                    </div>
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              )}

              {/* Service Breakdown Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Service Breakdown</h4>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </div>
                <div className="space-y-1">
                  {Object.entries(employee.serviceBreakdown).slice(0, 3).map(([serviceName, data]) => (
                    <div key={serviceName} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{serviceName}</span>
                      <span className="font-medium text-gray-900">{data.count} services</span>
                    </div>
                  ))}
                  {Object.keys(employee.serviceBreakdown).length > 3 && (
                    <div className="text-xs text-gray-400 text-center">
                      +{Object.keys(employee.serviceBreakdown).length - 3} more services
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex space-x-2">
                  <button className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                    View Details
                  </button>
                  <button className="flex-1 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                    Performance Trends
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date(performanceData.performanceData[0]?.lastUpdated || new Date()).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}