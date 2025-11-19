import { format } from 'date-fns';

interface EmployeePerformanceData {
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
  serviceBreakdown: Record<string, { count: number; revenue: number; hours: number }>;
  trendData: {
    weeklyRevenue: Array<{
      week: string;
      revenue: number;
      hours: number;
    }>;
  };
  periodStart: string;
  periodEnd: string;
}

interface TeamPerformanceData {
  employees: EmployeePerformanceData[];
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

interface ReportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeDetailedBreakdown: boolean;
  includeTrendAnalysis: boolean;
  includeTeamComparison: boolean;
  customTitle?: string;
  logoUrl?: string;
}

export class PerformanceReportGenerator {
  private static instance: PerformanceReportGenerator;

  public static getInstance(): PerformanceReportGenerator {
    if (!PerformanceReportGenerator.instance) {
      PerformanceReportGenerator.instance = new PerformanceReportGenerator();
    }
    return PerformanceReportGenerator.instance;
  }

  private constructor() {}

  /**
   * Generate a comprehensive performance report
   */
  async generateReport(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): Promise<Blob> {
    switch (options.format) {
      case 'pdf':
        return this.generatePDFReport(data, options);
      case 'excel':
        return this.generateExcelReport(data, options);
      case 'csv':
        return this.generateCSVReport(data, options);
      case 'json':
        return this.generateJSONReport(data, options);
      default:
        throw new Error(`Unsupported report format: ${options.format}`);
    }
  }

  /**
   * Generate PDF report using HTML/CSS and browser print capabilities
   */
  private async generatePDFReport(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): Promise<Blob> {
    const htmlContent = this.generateHTMLReport(data, options);

    // Create a temporary iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '8.5in';
    iframe.style.height = '11in';

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Cannot access iframe document');

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Note: In a real implementation, you would use a library like jsPDF or Puppeteer
    // For now, we'll return the HTML as a blob
    const blob = new Blob([htmlContent], { type: 'text/html' });

    document.body.removeChild(iframe);
    return blob;
  }

  /**
   * Generate Excel report (mock implementation)
   */
  private async generateExcelReport(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): Promise<Blob> {
    const csvContent = this.generateCSVContent(data, options);

    // In a real implementation, you would use a library like SheetJS
    // For now, we'll return CSV content with Excel MIME type
    return new Blob([csvContent], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): Promise<Blob> {
    const csvContent = this.generateCSVContent(data, options);
    return new Blob([csvContent], { type: 'text/csv' });
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): Promise<Blob> {
    const reportData = {
      ...data,
      reportOptions: options,
      generatedAt: new Date().toISOString(),
      reportVersion: '1.0'
    };

    return new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * Generate HTML report content
   */
  private generateHTMLReport(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): string {
    const isTeamReport = 'employees' in data;
    const title = options.customTitle || (isTeamReport ? 'Team Performance Report' : 'Employee Performance Report');
    const currentDate = format(new Date(), 'MMMM dd, yyyy');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            max-height: 60px;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 10px 0;
        }
        .subtitle {
            color: #6b7280;
            font-size: 14px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        .metric-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
        }
        .section {
            margin: 30px 0;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #f9fafb;
            font-weight: bold;
        }
        .trend-positive {
            color: #10b981;
        }
        .trend-negative {
            color: #ef4444;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
        @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        ${options.logoUrl ? `<img src="${options.logoUrl}" alt="Company Logo" class="logo">` : ''}
        <div class="title">${title}</div>
        <div class="subtitle">Generated on ${currentDate}</div>
        <div class="subtitle">Period: ${data.periodStart} to ${data.periodEnd}</div>
    </div>

    ${isTeamReport ? this.generateTeamReportContent(data as TeamPerformanceData, options) : this.generateIndividualReportContent(data as EmployeePerformanceData, options)}

    <div class="footer">
        <p>Report generated by TakeTenDash Performance Analytics</p>
        <p>Data as of ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate team report content
   */
  private generateTeamReportContent(data: TeamPerformanceData, options: ReportOptions): string {
    return `
    <div class="section">
        <div class="section-title">Team Summary</div>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">$${data.teamAverages.revenuePerLaborHour.toFixed(2)}</div>
                <div class="metric-label">Avg Revenue/Hour</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${data.teamAverages.totalRevenue.toFixed(0)}</div>
                <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.teamAverages.totalServices}</div>
                <div class="metric-label">Total Services</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${data.teamAverages.averageServiceValue.toFixed(2)}</div>
                <div class="metric-label">Avg Service Value</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Top Performer</div>
        <p><strong>${data.topPerformer.employeeName}</strong> leads in ${data.topPerformer.metric} with a value of <strong>$${data.topPerformer.value.toFixed(2)}</strong></p>
    </div>

    <div class="section">
        <div class="section-title">Individual Performance</div>
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Revenue/Hour</th>
                    <th>Total Revenue</th>
                    <th>Services</th>
                    <th>Avg Service Value</th>
                    <th>Profit Margin</th>
                </tr>
            </thead>
            <tbody>
                ${data.employees.map(emp => `
                    <tr>
                        <td>${emp.employeeName}</td>
                        <td>$${emp.revenuePerLaborHour.toFixed(2)}</td>
                        <td>$${emp.totalRevenue.toFixed(0)}</td>
                        <td>${emp.totalServices}</td>
                        <td>$${emp.averageServiceValue.toFixed(2)}</td>
                        <td>${(emp.profitMargin * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
  }

  /**
   * Generate individual report content
   */
  private generateIndividualReportContent(data: EmployeePerformanceData, options: ReportOptions): string {
    return `
    <div class="section">
        <div class="section-title">Employee: ${data.employeeName}</div>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-value">$${data.revenuePerLaborHour.toFixed(2)}</div>
                <div class="metric-label">Revenue per Labor Hour</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${data.totalRevenue.toFixed(0)}</div>
                <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.totalServices}</div>
                <div class="metric-label">Total Services</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(data.profitMargin * 100).toFixed(1)}%</div>
                <div class="metric-label">Profit Margin</div>
            </div>
        </div>
    </div>

    ${options.includeDetailedBreakdown ? `
    <div class="section">
        <div class="section-title">Service Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Service Type</th>
                    <th>Count</th>
                    <th>Revenue</th>
                    <th>Hours</th>
                    <th>Revenue/Hour</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.serviceBreakdown).map(([service, breakdown]) => `
                    <tr>
                        <td>${service}</td>
                        <td>${breakdown.count}</td>
                        <td>$${breakdown.revenue.toFixed(0)}</td>
                        <td>${breakdown.hours.toFixed(1)}</td>
                        <td>$${(breakdown.revenue / breakdown.hours || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>` : ''}

    ${options.includeTrendAnalysis ? `
    <div class="section">
        <div class="section-title">Weekly Trend Analysis</div>
        <table>
            <thead>
                <tr>
                    <th>Week</th>
                    <th>Revenue</th>
                    <th>Hours</th>
                    <th>Revenue/Hour</th>
                </tr>
            </thead>
            <tbody>
                ${data.trendData.weeklyRevenue.map(week => `
                    <tr>
                        <td>${week.week}</td>
                        <td>$${week.revenue.toFixed(0)}</td>
                        <td>${week.hours.toFixed(1)}</td>
                        <td>$${(week.revenue / week.hours || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>` : ''}`;
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(
    data: EmployeePerformanceData | TeamPerformanceData,
    options: ReportOptions
  ): string {
    const isTeamReport = 'employees' in data;

    if (isTeamReport) {
      const teamData = data as TeamPerformanceData;
      const headers = ['Employee Name', 'Revenue per Hour', 'Total Revenue', 'Total Services', 'Average Service Value', 'Profit Margin'];
      const rows = teamData.employees.map(emp => [
        emp.employeeName,
        emp.revenuePerLaborHour.toFixed(2),
        emp.totalRevenue.toFixed(0),
        emp.totalServices.toString(),
        emp.averageServiceValue.toFixed(2),
        (emp.profitMargin * 100).toFixed(1) + '%'
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    } else {
      const empData = data as EmployeePerformanceData;
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Employee Name', empData.employeeName],
        ['Revenue per Labor Hour', `$${empData.revenuePerLaborHour.toFixed(2)}`],
        ['Total Revenue', `$${empData.totalRevenue.toFixed(0)}`],
        ['Total Labor Hours', empData.totalLaborHours.toFixed(1)],
        ['Total Services', empData.totalServices.toString()],
        ['Average Service Value', `$${empData.averageServiceValue.toFixed(2)}`],
        ['Labor Cost', `$${empData.laborCost.toFixed(0)}`],
        ['Parts Cost', `$${empData.partsCost.toFixed(0)}`],
        ['Profit Margin', `${(empData.profitMargin * 100).toFixed(1)}%`]
      ];

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Download a generated report
   */
  downloadReport(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get suggested filename for report
   */
  getReportFilename(
    data: EmployeePerformanceData | TeamPerformanceData,
    fileFormat: string
  ): string {
    const isTeamReport = 'employees' in data;
    const reportType = isTeamReport ? 'team' : 'individual';
    const employeeName = isTeamReport ? 'team' : (data as EmployeePerformanceData).employeeName.replace(/\s+/g, '-').toLowerCase();
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    return `performance-report-${reportType}-${employeeName}-${dateStr}.${fileFormat}`;
  }
}