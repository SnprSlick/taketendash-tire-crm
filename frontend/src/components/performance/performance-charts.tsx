'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  LineChart,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Award,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface PerformanceDataPoint {
  period: string;
  revenue: number;
  laborHours: number;
  revenuePerLaborHour: number;
  servicesCompleted: number;
}

interface EmployeeComparison {
  employeeId: string;
  employeeName: string;
  revenuePerLaborHour: number;
  totalRevenue: number;
  totalServices: number;
  averageServiceValue: number;
  ranking: number;
  percentileRanking: number;
}

interface TeamComparison {
  employees: EmployeeComparison[];
  teamAverages: {
    revenuePerLaborHour: number;
    totalRevenue: number;
    totalServices: number;
    averageServiceValue: number;
  };
  topPerformer: {
    employeeId: string;
    employeeName: string;
    metric: string;
    value: number;
  };
  metricName: string;
  periodStart: string;
  periodEnd: string;
}

interface PerformanceChartsProps {
  employeeId?: string | null;
  employeeIds?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  onEmployeeSelect?: (employeeId: string | null) => void;
  onDateRangeChange?: (newDateRange: { startDate: string; endDate: string }) => void;
  chartType?: 'trends' | 'comparison' | 'both';
  metric?: 'revenuePerLaborHour' | 'totalRevenue' | 'totalServices' | 'averageServiceValue';
}

export default function PerformanceCharts({
  employeeId,
  employeeIds = [],
  dateRange,
  onEmployeeSelect,
  onDateRangeChange,
  chartType = 'both',
  metric = 'revenuePerLaborHour'
}: PerformanceChartsProps) {
  const [trendData, setTrendData] = useState<Record<string, PerformanceDataPoint[]>>({});
  const [comparisonData, setComparisonData] = useState<TeamComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const loadChartData = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for trend charts
      const mockTrendData: Record<string, PerformanceDataPoint[]> = {
        '1': [
          { period: '2024-01-08', revenue: 3200, laborHours: 18.5, revenuePerLaborHour: 173.0, servicesCompleted: 8 },
          { period: '2024-01-15', revenue: 4100, laborHours: 22.0, revenuePerLaborHour: 186.4, servicesCompleted: 10 },
          { period: '2024-01-22', revenue: 3850, laborHours: 20.5, revenuePerLaborHour: 187.8, servicesCompleted: 9 },
          { period: '2024-01-29', revenue: 4600, laborHours: 24.5, revenuePerLaborHour: 187.8, servicesCompleted: 12 },
          { period: '2024-02-05', revenue: 4200, laborHours: 23.0, revenuePerLaborHour: 182.6, servicesCompleted: 11 },
          { period: '2024-02-12', revenue: 5100, laborHours: 26.5, revenuePerLaborHour: 192.5, servicesCompleted: 13 }
        ],
        '2': [
          { period: '2024-01-08', revenue: 2800, laborHours: 17.0, revenuePerLaborHour: 164.7, servicesCompleted: 7 },
          { period: '2024-01-15', revenue: 3200, laborHours: 19.5, revenuePerLaborHour: 164.1, servicesCompleted: 8 },
          { period: '2024-01-22', revenue: 3050, laborHours: 20.0, revenuePerLaborHour: 152.5, servicesCompleted: 9 },
          { period: '2024-01-29', revenue: 3300, laborHours: 21.5, revenuePerLaborHour: 153.5, servicesCompleted: 10 },
          { period: '2024-02-05', revenue: 3450, laborHours: 22.0, revenuePerLaborHour: 156.8, servicesCompleted: 9 },
          { period: '2024-02-12', revenue: 3750, laborHours: 24.0, revenuePerLaborHour: 156.3, servicesCompleted: 11 }
        ]
      };

      // Mock data for comparison
      const mockComparisonData: TeamComparison = {
        employees: [
          {
            employeeId: '1',
            employeeName: 'John Smith',
            revenuePerLaborHour: 184.21,
            totalRevenue: 25350,
            totalServices: 63,
            averageServiceValue: 402.38,
            ranking: 1,
            percentileRanking: 95
          },
          {
            employeeId: '2',
            employeeName: 'Sarah Johnson',
            revenuePerLaborHour: 158.33,
            totalRevenue: 19550,
            totalServices: 54,
            averageServiceValue: 362.04,
            ranking: 2,
            percentileRanking: 75
          },
          {
            employeeId: '3',
            employeeName: 'Mike Wilson',
            revenuePerLaborHour: 145.67,
            totalRevenue: 17200,
            totalServices: 48,
            averageServiceValue: 358.33,
            ranking: 3,
            percentileRanking: 60
          },
          {
            employeeId: '4',
            employeeName: 'Lisa Chen',
            revenuePerLaborHour: 132.45,
            totalRevenue: 15800,
            totalServices: 52,
            averageServiceValue: 303.85,
            ranking: 4,
            percentileRanking: 45
          }
        ],
        teamAverages: {
          revenuePerLaborHour: 155.17,
          totalRevenue: 19475,
          totalServices: 54.25,
          averageServiceValue: 356.65
        },
        topPerformer: {
          employeeId: '1',
          employeeName: 'John Smith',
          metric: selectedMetric,
          value: 184.21
        },
        metricName: selectedMetric,
        periodStart: '2024-01-01',
        periodEnd: '2024-02-12'
      };

      setTrendData(mockTrendData);
      setComparisonData(mockComparisonData);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeIds, dateRange, selectedMetric, granularity]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

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

  const getMetricValue = (employee: EmployeeComparison, metricName: string) => {
    switch (metricName) {
      case 'revenuePerLaborHour': return employee.revenuePerLaborHour;
      case 'totalRevenue': return employee.totalRevenue;
      case 'totalServices': return employee.totalServices;
      case 'averageServiceValue': return employee.averageServiceValue;
      default: return employee.revenuePerLaborHour;
    }
  };

  const getMetricLabel = (metricName: string) => {
    switch (metricName) {
      case 'revenuePerLaborHour': return 'Revenue per Labor Hour';
      case 'totalRevenue': return 'Total Revenue';
      case 'totalServices': return 'Total Services';
      case 'averageServiceValue': return 'Average Service Value';
      default: return 'Revenue per Labor Hour';
    }
  };

  const formatMetricValue = (value: number, metricName: string) => {
    switch (metricName) {
      case 'revenuePerLaborHour':
      case 'totalRevenue':
      case 'averageServiceValue':
        return formatCurrency(value);
      case 'totalServices':
        return Math.round(value).toString();
      default:
        return formatCurrency(value);
    }
  };

  const calculateTrend = (data: PerformanceDataPoint[], metricName: string) => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };

    const first = data[0];
    const last = data[data.length - 1];

    let firstValue, lastValue;
    switch (metricName) {
      case 'revenuePerLaborHour':
        firstValue = first.revenuePerLaborHour;
        lastValue = last.revenuePerLaborHour;
        break;
      case 'totalRevenue':
        firstValue = first.revenue;
        lastValue = last.revenue;
        break;
      case 'totalServices':
        firstValue = first.servicesCompleted;
        lastValue = last.servicesCompleted;
        break;
      default:
        firstValue = first.revenuePerLaborHour;
        lastValue = last.revenuePerLaborHour;
    }

    if (firstValue === 0) return { direction: 'stable', percentage: 0 };

    const percentage = ((lastValue - firstValue) / firstValue) * 100;
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';

    return { direction, percentage: Math.abs(percentage) };
  };

  const renderTrendChart = (employeeId: string, data: PerformanceDataPoint[], employeeName: string) => {
    const trend = calculateTrend(data, selectedMetric);
    const maxValue = Math.max(...data.map(d => {
      switch (selectedMetric) {
        case 'revenuePerLaborHour': return d.revenuePerLaborHour;
        case 'totalRevenue': return d.revenue;
        case 'totalServices': return d.servicesCompleted;
        default: return d.revenuePerLaborHour;
      }
    }));

    return (
      <div key={employeeId} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{employeeName}</h3>
            <p className="text-sm text-gray-500">{getMetricLabel(selectedMetric)} Trend</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.direction === 'up' ? 'bg-green-50 text-green-700' :
              trend.direction === 'down' ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-700'
            }`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              <span>{formatNumber(trend.percentage, 1)}%</span>
            </div>
            <button
              onClick={() => setExpandedChart(expandedChart === employeeId ? null : employeeId)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expandedChart === employeeId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Simple Chart Visualization */}
        <div className="space-y-2">
          {data.map((point, index) => {
            let value;
            switch (selectedMetric) {
              case 'revenuePerLaborHour':
                value = point.revenuePerLaborHour;
                break;
              case 'totalRevenue':
                value = point.revenue;
                break;
              case 'totalServices':
                value = point.servicesCompleted;
                break;
              default:
                value = point.revenuePerLaborHour;
            }

            const barWidth = (value / maxValue) * 100;
            const date = new Date(point.period).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });

            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-12 text-xs text-gray-500 text-right">{date}</div>
                <div className="flex-1 relative">
                  <div className="w-full bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        trend.direction === 'up' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        trend.direction === 'down' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        'bg-gradient-to-r from-blue-400 to-blue-600'
                      }`}
                      style={{ width: `${Math.max(barWidth, 5)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white drop-shadow">
                        {formatMetricValue(value, selectedMetric)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {expandedChart === employeeId && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Performance Metrics</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Revenue/Hour:</span>
                    <span className="font-medium">{formatCurrency(data.reduce((sum, d) => sum + d.revenuePerLaborHour, 0) / data.length)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-medium">{formatNumber(data.reduce((sum, d) => sum + d.laborHours, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Services:</span>
                    <span className="font-medium">{data.reduce((sum, d) => sum + d.servicesCompleted, 0)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Trend Analysis</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Best Week:</span>
                    <span className="font-medium">
                      {new Date(data.reduce((best, current) =>
                        current.revenuePerLaborHour > best.revenuePerLaborHour ? current : best
                      ).period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consistency:</span>
                    <span className="font-medium">
                      {trend.percentage < 10 ? 'High' : trend.percentage < 20 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Growth:</span>
                    <span className={`font-medium ${
                      trend.direction === 'up' ? 'text-green-600' :
                      trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {trend.direction === 'up' ? 'Improving' :
                       trend.direction === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComparisonChart = () => {
    if (!comparisonData) return null;

    const maxValue = Math.max(...comparisonData.employees.map(emp => getMetricValue(emp, selectedMetric)));

    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Team Performance Comparison</h3>
            <p className="text-sm text-gray-500">{getMetricLabel(selectedMetric)} Rankings</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              <div className="flex items-center space-x-1">
                <Award className="h-3 w-3" />
                <span>Top: {comparisonData.topPerformer.employeeName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Average */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Team Average</h4>
              <p className="text-lg font-bold text-blue-700">
                {formatMetricValue(getMetricValue(comparisonData.teamAverages as any, selectedMetric), selectedMetric)}
              </p>
            </div>
            <Target className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        {/* Employee Rankings */}
        <div className="space-y-3">
          {comparisonData.employees.map((employee, index) => {
            const value = getMetricValue(employee, selectedMetric);
            const barWidth = (value / maxValue) * 100;
            const teamAverage = getMetricValue(comparisonData.teamAverages as any, selectedMetric);
            const isAboveAverage = value > teamAverage;

            return (
              <div key={employee.employeeId} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-gold text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-300 text-orange-900' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{employee.employeeName}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                        isAboveAverage ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {employee.percentileRanking}th percentile
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatMetricValue(value, selectedMetric)}
                    </div>
                    <div className={`text-xs ${
                      isAboveAverage ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {isAboveAverage ? '+' : ''}{formatNumber(((value - teamAverage) / teamAverage) * 100, 1)}% vs avg
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="w-full bg-gray-100 rounded-full h-4 relative overflow-hidden">
                    {/* Team average indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10"
                      style={{ left: `${(teamAverage / maxValue) * 100}%` }}
                    />

                    {/* Performance bar */}
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        index === 0 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        isAboveAverage ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}
                      style={{ width: `${Math.max(barWidth, 5)}%` }}
                    />
                  </div>

                  {/* Percentile indicator */}
                  <div className="flex justify-end mt-1">
                    <div className="text-xs text-gray-400">
                      Ranking: #{employee.ranking} of {comparisonData.employees.length}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span>Team Average</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-green-500 rounded"></div>
              <span>Above Average</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-gray-400 rounded"></div>
              <span>Below Average</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="revenuePerLaborHour">Revenue per Labor Hour</option>
                <option value="totalRevenue">Total Revenue</option>
                <option value="totalServices">Total Services</option>
                <option value="averageServiceValue">Average Service Value</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Granularity</label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
            <button className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      {(chartType === 'trends' || chartType === 'both') && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
            <div className="flex items-center space-x-1 text-gray-400">
              <Info className="h-4 w-4" />
              <span className="text-xs">Click to expand details</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(trendData).map(([employeeId, data]) => {
              const employee = comparisonData?.employees.find(e => e.employeeId === employeeId);
              return renderTrendChart(employeeId, data, employee?.employeeName || `Employee ${employeeId}`);
            })}
          </div>
        </div>
      )}

      {(chartType === 'comparison' || chartType === 'both') && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Team Comparison</h2>
          </div>
          {renderComparisonChart()}
        </div>
      )}
    </div>
  );
}