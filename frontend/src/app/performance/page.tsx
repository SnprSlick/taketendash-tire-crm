'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Filter, RefreshCw, Users, TrendingUp, BarChart3, Settings } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import PerformanceDashboard from '../../components/performance/performance-dashboard';
import PerformanceCharts from '../../components/performance/performance-charts';
import PerformanceReportGenerator from '../../components/performance/performance-report-generator';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

export default function PerformancePage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [activeView, setActiveView] = useState<'dashboard' | 'charts' | 'reports' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 'emp1', name: 'John Smith', role: 'Senior Technician' },
    { id: 'emp2', name: 'Sarah Johnson', role: 'Service Advisor' },
    { id: 'emp3', name: 'Mike Wilson', role: 'Technician' },
    { id: 'emp4', name: 'Lisa Brown', role: 'Service Advisor' },
    { id: 'emp5', name: 'David Chen', role: 'Senior Technician' }
  ]);

  const handleEmployeeSelect = (employeeId: string | null) => {
    setSelectedEmployee(employeeId);
  };

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    // Mock export functionality
    const dataToExport = {
      dateRange,
      selectedEmployee,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${dateRange.startDate}-to-${dateRange.endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Performance Analytics">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Employee Performance</h1>
              <p className="text-sm text-gray-500">Track and analyze employee productivity metrics</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                <span>Date Range:</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Employee Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                <span>Employee:</span>
              </div>
              <select
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-48"
              >
                <option value="">All Employees</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.role})
                  </option>
                ))}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <BarChart3 className="h-4 w-4" />
                <span>View:</span>
              </div>
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('charts')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'charts'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Charts
                </button>
                <button
                  onClick={() => setActiveView('reports')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'reports'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Reports
                </button>
                <button
                  onClick={() => setActiveView('both')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'both'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                <span className="text-lg font-medium text-gray-700">Loading performance data...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dashboard View */}
            {(activeView === 'dashboard' || activeView === 'both') && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span>Performance Dashboard</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Overview of employee performance metrics and key indicators
                  </p>
                </div>
                <div className="p-6">
                  <PerformanceDashboard
                    employeeId={selectedEmployee}
                    dateRange={dateRange}
                    onEmployeeSelect={handleEmployeeSelect}
                    onDateRangeChange={handleDateRangeChange}
                  />
                </div>
              </div>
            )}

            {/* Charts View */}
            {(activeView === 'charts' || activeView === 'both') && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>Performance Analytics</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Detailed charts and trend analysis for performance comparison
                  </p>
                </div>
                <div className="p-6">
                  <PerformanceCharts
                    employeeId={selectedEmployee}
                    dateRange={dateRange}
                    onEmployeeSelect={handleEmployeeSelect}
                    onDateRangeChange={handleDateRangeChange}
                  />
                </div>
              </div>
            )}

            {/* Reports View */}
            {(activeView === 'reports' || activeView === 'both') && (
              <div className="space-y-6">
                <PerformanceReportGenerator
                  employeeId={selectedEmployee}
                  dateRange={dateRange}
                  performanceData={null} // Would be populated with actual data in real implementation
                  teamData={null} // Would be populated with actual data in real implementation
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}