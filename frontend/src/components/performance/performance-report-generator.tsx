'use client';

import { useState, useMemo } from 'react';
import { Download, FileText, Table, File, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PerformanceReportGenerator as ReportGeneratorService } from '../../lib/performance-reports';

interface PerformanceReportGeneratorProps {
  employeeId?: string | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  performanceData?: any;
  teamData?: any;
}

interface ReportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeDetailedBreakdown: boolean;
  includeTrendAnalysis: boolean;
  includeTeamComparison: boolean;
  customTitle?: string;
  logoUrl?: string;
}

export default function PerformanceReportGenerator({
  employeeId,
  dateRange,
  performanceData,
  teamData
}: PerformanceReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    format: 'pdf',
    includeCharts: false,
    includeDetailedBreakdown: true,
    includeTrendAnalysis: true,
    includeTeamComparison: !employeeId,
    customTitle: '',
    logoUrl: ''
  });
  const [lastGeneratedReport, setLastGeneratedReport] = useState<{
    filename: string;
    timestamp: Date;
  } | null>(null);

  const reportGenerator = useMemo(() => ReportGeneratorService.getInstance(), []);

  const handleGenerateReport = async () => {
    if (!performanceData && !teamData) {
      alert('No performance data available for report generation');
      return;
    }

    setIsGenerating(true);

    try {
      // Use team data if available, otherwise individual data
      const dataToUse = teamData || performanceData;

      // Mock data structure for demonstration
      const mockData = {
        ...dataToUse,
        periodStart: dateRange.startDate,
        periodEnd: dateRange.endDate,
        // Add mock service breakdown if not present
        serviceBreakdown: dataToUse.serviceBreakdown || {
          'Oil Changes': { count: 25, revenue: 1250, hours: 12.5 },
          'Tire Installation': { count: 15, revenue: 3000, hours: 22.5 },
          'Brake Service': { count: 8, revenue: 2400, hours: 16 },
          'General Maintenance': { count: 12, revenue: 1800, hours: 18 }
        },
        // Add mock trend data if not present
        trendData: dataToUse.trendData || {
          weeklyRevenue: [
            { week: '2024-W01', revenue: 2100, hours: 35 },
            { week: '2024-W02', revenue: 2350, hours: 38 },
            { week: '2024-W03', revenue: 2200, hours: 36 },
            { week: '2024-W04', revenue: 2500, hours: 40 }
          ]
        }
      };

      const blob = await reportGenerator.generateReport(mockData, reportOptions);
      const filename = reportGenerator.getReportFilename(mockData, reportOptions.format);

      reportGenerator.downloadReport(blob, filename);

      setLastGeneratedReport({
        filename,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Professional formatted report' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: Table, description: 'Data analysis format' },
    { value: 'csv', label: 'CSV File', icon: File, description: 'Raw data export' },
    { value: 'json', label: 'JSON Data', icon: File, description: 'Structured data format' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <span>Performance Report Generator</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Generate comprehensive performance reports in various formats
            </p>
          </div>

          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Options</span>
          </button>
        </div>

        {lastGeneratedReport && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Last report generated: {lastGeneratedReport.filename}
              </span>
              <span className="text-xs text-green-600">
                {lastGeneratedReport.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {showOptions && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Report Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setReportOptions(prev => ({ ...prev, format: format.value as any }))}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      reportOptions.format === format.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <format.icon className="h-4 w-4" />
                      <span className="font-medium">{format.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{format.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Content Options
              </label>
              <div className="space-y-3">
                {[
                  {
                    key: 'includeDetailedBreakdown',
                    label: 'Include Service Breakdown',
                    description: 'Detailed analysis of service types and performance'
                  },
                  {
                    key: 'includeTrendAnalysis',
                    label: 'Include Trend Analysis',
                    description: 'Weekly/monthly performance trends and patterns'
                  },
                  {
                    key: 'includeTeamComparison',
                    label: 'Include Team Comparison',
                    description: 'Compare performance against team averages'
                  },
                  {
                    key: 'includeCharts',
                    label: 'Include Charts',
                    description: 'Visual charts and graphs (PDF only)'
                  }
                ].map((option) => (
                  <label key={option.key} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={reportOptions[option.key as keyof ReportOptions] as boolean}
                      onChange={(e) => setReportOptions(prev => ({
                        ...prev,
                        [option.key]: e.target.checked
                      }))}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Title */}
            <div>
              <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Report Title (optional)
              </label>
              <input
                type="text"
                id="customTitle"
                value={reportOptions.customTitle || ''}
                onChange={(e) => setReportOptions(prev => ({ ...prev, customTitle: e.target.value }))}
                placeholder="Enter custom title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo URL (optional)
              </label>
              <input
                type="url"
                id="logoUrl"
                value={reportOptions.logoUrl || ''}
                onChange={(e) => setReportOptions(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {employeeId ? 'Individual' : 'Team'} performance report for{' '}
            <span className="font-medium">
              {dateRange.startDate} to {dateRange.endDate}
            </span>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {isGenerating ? 'Generating...' : `Generate ${reportOptions.format.toUpperCase()}`}
            </span>
          </button>
        </div>

        {!performanceData && !teamData && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                No performance data available. Load performance data to generate reports.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}