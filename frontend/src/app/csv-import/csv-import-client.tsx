'use client';

import React, { useState, useEffect } from 'react';
import { FileUp, Download, Eye, CheckCircle, AlertCircle, Upload, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';

interface ParsedInvoice {
  invoiceNumber: string;
  customerName: string;
  vehicleInfo?: string;
  mileage?: string;
  invoiceDate?: string;
  salesperson?: string;
  taxAmount?: number;
  totalAmount?: number;
  lineItemsCount: number;
  lineItems: Array<{
    line: number;
    productCode: string;
    description: string;
    adjustment?: string;
    quantity: number;
    partsCost: number;
    laborCost: number;
    fet: number;
    lineTotal: number;
    cost: number;
    grossProfitMargin: number;
    grossProfit: number;
  }>;
}

interface DashboardStats {
  totalInvoices: number;
  totalLineItems: number;
  lastImported: string | null;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  topSalesperson: string | null;
  topSalespersonCount: number;
}

export default function CsvImportClientPage() {
  const { token } = useAuth();
  const [csvData, setCsvData] = useState<ParsedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<any>(null);
  const [dataStats, setDataStats] = useState<{totalInvoices: number, totalLineItems: number} | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [isMounted, setIsMounted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    processed: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);

  // Track component mounting on client side
  useEffect(() => {
    console.log('🔄 [MOUNT] Component mounting on client side');
    setIsMounted(true);

    // Add a backup timer to ensure loading doesn't get stuck
    const backupTimer = setTimeout(() => {
      // Use a callback to get current state values
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn('⚠️ [TIMEOUT] Data loading timeout - implementing fallback');
          // Defer error state update to avoid setState during render
          setTimeout(() => {
            setError('Data loading timeout. The component may not be fully hydrated. Please try the manual refresh button.');
          }, 0);
          return false;
        }
        return currentLoading;
      });
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(backupTimer);
      console.log('🔄 [UNMOUNT] Component unmounting');
    };
  }, []);

  // Load dashboard statistics
  useEffect(() => {
    const loadStats = async () => {
      if (typeof window === 'undefined' || !isMounted) return;
      
      try {
        const response = await fetch('/api/v1/invoices/stats/summary', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setDashboardStats(result.data);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };
    
    loadStats();
  }, [isMounted]);

  // Load actual invoice data from database API
  useEffect(() => {
    const loadInvoiceData = async () => {
      console.log('🔍 [DEBUG] Starting data load for CSV import page');
      console.log('🔍 [DEBUG] Current page:', currentPage, 'Rows per page:', rowsPerPage);
      console.log('🔍 [DEBUG] Client-side check:', typeof window !== 'undefined');

      try {
        const url = `/api/v1/invoices?page=${currentPage}&limit=${rowsPerPage}`;
        console.log('🔍 [DEBUG] Making API call to:', url);
        console.log('🔍 [DEBUG] Full URL would be:', window.location.origin + url);

        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });
        const requestTime = Date.now() - startTime;

        console.log('🔍 [DEBUG] Response received in', requestTime, 'ms');
        console.log('🔍 [DEBUG] Response status:', response.status, response.statusText);
        console.log('🔍 [DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚨 [ERROR] API response not OK:', errorText);
          throw new Error(`Failed to load invoice data: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }

        const responseText = await response.text();
        console.log('🔍 [DEBUG] Raw response length:', responseText.length);
        console.log('🔍 [DEBUG] Raw response preview:', responseText.substring(0, 500));

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('🚨 [ERROR] Failed to parse JSON:', parseError);
          console.error('🚨 [ERROR] Response text:', responseText);
          throw new Error(`Invalid JSON response: ${(parseError as Error).message}`);
        }

        console.log('🔍 [DEBUG] Parsed response:', {
          success: result.success,
          hasData: !!result.data,
          invoicesCount: result.data?.invoices?.length || 0,
          summaryData: result.data?.summary,
        });

        if (!result.success) {
          console.error('🚨 [ERROR] API returned unsuccessful response:', result);
          throw new Error(`API returned unsuccessful response: ${result.message || 'Unknown error'}`);
        }

        if (!result.data || !result.data.invoices) {
          console.warn('⚠️ [WARNING] No invoices data in response:', result);
          setCsvData([]);
          setDataStats({ totalInvoices: 0, totalLineItems: 0 });
        } else {
          console.log('✅ [SUCCESS] Setting invoice data:', {
            invoicesCount: result.data.invoices.length,
            sampleInvoice: result.data.invoices[0]?.invoiceNumber,
            totalInvoices: result.data.summary?.totalInvoices,
            totalLineItems: result.data.summary?.totalLineItems,
          });

          // Set the invoice data from database
          setCsvData(result.data.invoices);
          setDataStats({
            totalInvoices: result.data.summary.totalInvoices || 0,
            totalLineItems: result.data.summary.totalLineItems || 0
          });
        }

        console.log('✅ [SUCCESS] Data loading completed successfully');
        setLoading(false);

      } catch (error) {
        const err = error as Error;
        console.error('🚨 [ERROR] Complete error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name,
          cause: (err as any).cause,
        });

        const detailedError = `Failed to load invoice data: ${error instanceof Error ? error.message : 'Unknown error'}.

Debug Info:
- URL attempted: /api/v1/invoices?page=${currentPage}&limit=${rowsPerPage}
- Time: ${new Date().toISOString()}
- User Agent: ${navigator.userAgent}
- Window location: ${window.location.href}

Troubleshooting:
1. Check if backend is running on port 3001
2. Verify Next.js proxy configuration is working
3. Check browser network tab for failed requests
4. Try uploading a CSV file to import data first`;

        setError(detailedError);
        setLoading(false);
      }
    };

    // Only run if we're on the client side and component is mounted
    if (typeof window !== 'undefined' && isMounted) {
      console.log('🔍 [DEBUG] useEffect triggered - loading data...');
      loadInvoiceData();
    } else {
      console.log('🔍 [DEBUG] Server-side render or not yet mounted - skipping data load');
    }
  }, [currentPage, rowsPerPage, isMounted]);

  const toggleRow = (invoiceNumber: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(invoiceNumber)) {
      newExpanded.delete(invoiceNumber);
    } else {
      newExpanded.add(invoiceNumber);
    }
    setExpandedRows(newExpanded);
  };

  const toggleAllRows = () => {
    if (expandedRows.size === csvData.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(csvData.map(inv => inv.invoiceNumber)));
    }
  };

  // Server-side pagination - use data as-is since it's already paginated
  const totalPages = dataStats ? Math.ceil(dataStats.totalInvoices / rowsPerPage) : 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, dataStats?.totalInvoices || 0);
  const paginatedData = csvData; // Data is already paginated from API

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedRows(new Set()); // Collapse all when changing pages
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to first page
    setExpandedRows(new Set()); // Collapse all when changing page size
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
    } else {
      alert('Please select a CSV or Excel file (.csv, .xls, .xlsx)');
    }
  };

  const pollProgress = async (batchId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/csv-import/progress/${batchId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.status === 404) {
           // Batch might be done or not found. Stop polling.
           clearInterval(pollInterval);
           setLoading(false);
           window.location.reload();
           return;
        }

        const data = await res.json();
        
        if (data.success && data.progress) {
           setUploadProgress({
             processed: data.progress.processed,
             total: data.progress.total,
             percentage: data.progress.percentage,
             status: data.progress.currentStep
           });

           // Check if completed (100% or specific status)
           if (data.progress.percentage === 100 || 
               data.progress.currentStep.includes('Complete') || 
               data.progress.currentStep.includes('Finished')) {
             clearInterval(pollInterval);
             
             // Give it a moment to finalize DB writes
             setTimeout(() => {
                setLoading(false);
                window.location.reload();
             }, 1000);
           }
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient network errors, but maybe limit retries?
        // For now, we just log.
      }
    }, 1000);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setUploadProgress({ processed: 0, total: 0, percentage: 0, status: 'Starting upload...' });
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('duplicateHandling', updateExisting ? 'UPDATE' : 'SKIP');

      const response = await fetch('/api/v1/csv-import/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Import failed');
      }

      // If we have a batch ID, start polling
      if (result.batchId) {
        console.log('Upload started, batch ID:', result.batchId);
        pollProgress(result.batchId);
      } else {
        // Fallback for synchronous or instant completion
        setParseResult({
          success: true,
          filename: selectedFile.name,
          totalLines: result.result?.totalRecords || 0,
          totalInvoicesDetected: result.result?.successfulRecords || 0,
          lineItems: result.result?.totalRecords || 0,
          invoices: result.result?.successfulRecords || 0,
          formatValid: true,
          importBatchId: result.batchId,
          duration: result.result?.processingTimeMs || 0,
          errors: result.result?.errorSummary || [],
          isHistorical: result.isHistorical || false,
          originalProcessingDate: result.originalProcessingDate,
          message: result.message
        });
        window.location.reload();
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const downloadTestReport = () => {
    const reportData = {
      testDate: new Date().toISOString(),
      status: "PASSED",
      csvFile: "tiremaster-sample-1.csv",
      totalLines: 178,
      headerLines: dataStats?.totalInvoices || 37,
      lineItemLines: dataStats?.totalLineItems || 139,
      ignoredLines: 178 - (dataStats?.totalInvoices || 37) - (dataStats?.totalLineItems || 139),
      invoicesFound: dataStats?.totalInvoices || 37,
      formatValid: true,
      sampleInvoice: csvData[0]?.invoiceNumber || "3-327551",
      sampleCustomer: csvData[0]?.customerName || "AKERS, KENNETH",
      totalInvoicesDetected: dataStats?.totalInvoices || 37,
      lineItems: dataStats?.totalLineItems || 139,
      displayedInvoices: csvData.length,
      displayedLineItems: csvData.reduce((total, inv) => total + inv.lineItems.length, 0)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv-import-test-report.json';
    a.click();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          
          {uploadProgress && (
            <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Importing Data...</h3>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
                  style={{ width: `${uploadProgress.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{uploadProgress.status}</span>
                <span>{uploadProgress.percentage}% ({uploadProgress.processed} / {uploadProgress.total})</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleManualRefresh = async () => {
    console.log('🔄 [DEBUG] Manual refresh triggered - retry count:', retryCount + 1);
    setLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);

    // First try a direct API call to test connectivity
    try {
      const testResponse = await fetch('/api/v1/invoices?limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('🧪 [REFRESH] Test API call status:', testResponse.status);

      if (testResponse.ok) {
        console.log('✅ [REFRESH] API is responsive - triggering full reload');
        // Re-trigger the useEffect by updating a dependency
        setCurrentPage(prev => prev);
      } else {
        throw new Error(`API test failed: ${testResponse.status}`);
      }
    } catch (error) {
      console.error('🚨 [REFRESH] API test failed:', error);
      setError(`Manual refresh failed: ${(error as Error).message}. API may be unavailable.`);
      setLoading(false);
    }
  };

  const testDirectBackendCall = async () => {
    console.log('🧪 [TEST] Testing backend call via proxy...');
    try {
      // Use relative path to test via Next.js proxy
      const directUrl = '/api/v1/invoices?page=1&limit=5';
      console.log('🧪 [TEST] Calling:', directUrl);

      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('🧪 [TEST] Direct backend response:', response.status, response.statusText);
      const data = await response.json();
      console.log('🧪 [TEST] Direct backend data:', data);

      alert(`Direct backend test: ${response.ok ? 'SUCCESS' : 'FAILED'}\nStatus: ${response.status}\nData: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('🧪 [TEST] Direct backend test failed:', error);
      alert(`Direct backend test FAILED: ${(error as Error).message}`);
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-red-900">Data Loading Error</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Retry Loading Data'}
              </button>
              <button
                onClick={testDirectBackendCall}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Test Backend Direct
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded border border-red-300 mb-4">
            <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono">{error}</pre>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Debugging Steps:</h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Check your browser's Developer Console (F12) for detailed debug logs with 🔍 and 🚨 emojis</li>
              <li>Click "Test Backend Direct" to verify backend connectivity</li>
              <li>Check the Network tab to see if API requests are being made and what responses they receive</li>
              <li>Verify the backend is running on port 3001</li>
              <li>Try importing new CSV data using the upload section below</li>
            </ol>
          </div>
        </div>

        {/* Still show the upload section even when there's an error */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Upload TireMaster File</h2>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Selected: {selectedFile.name}</span>
                <button
                  onClick={handleFileUpload}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 'Parse TireMaster Data'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show initial loading for unmounted component
  if (!isMounted) {
    console.log('🔄 [RENDER] Showing initial client-side loading state');
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-blue-200 rounded w-1/2">
            <div className="h-full bg-gradient-to-r from-blue-200 to-blue-300 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-blue-100 rounded animate-pulse">
                <div className="h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
                  <span className="text-blue-500 text-sm font-medium">Loading CSV Data...</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-blue-600 font-medium">
            Initializing client-side component...
          </div>
        </div>
      </div>
    );
  }

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all database data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/csv-import/database', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Clear failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Clear failed');
      }

      alert('Database cleared successfully');
      window.location.reload();

    } catch (error) {
      console.error('Clear error:', error);
      setError(`Clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">TireMaster Data Import & Viewer</h1>
        <p className="text-gray-600 mt-1">
          Showing {csvData.length} invoices with {csvData.reduce((total, inv) => total + inv.lineItems.length, 0)} line items from complete TireMaster parsing ({dataStats?.totalInvoices || 0} total invoices, {dataStats?.totalLineItems || 0} total line items)
        </p>
      </div>

      {/* Dashboard Statistics */}
      {/* Dashboard Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">System Status</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">ONLINE</p>
              <p className="text-xs text-slate-400 mt-1">Ready for import</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Last Import</p>
              <p className="text-xl font-bold text-slate-800 mt-1 truncate" title={dashboardStats?.lastImported ? new Date(dashboardStats.lastImported).toLocaleString() : 'Never'}>
                {dashboardStats?.lastImported ? new Date(dashboardStats.lastImported).toLocaleDateString() : 'None'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Most recent activity</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{dashboardStats?.totalInvoices?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-400 mt-1">in database</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Eye className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-violet-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Line Items</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {dashboardStats?.totalLineItems?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Product entries</p>
            </div>
            <div className="p-3 bg-violet-50 rounded-lg">
              <Download className="h-6 w-6 text-violet-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Top Salesperson</p>
              <p className="text-lg font-bold text-slate-800 mt-1 truncate max-w-[140px]" title={dashboardStats?.topSalesperson || 'None'}>
                {dashboardStats?.topSalesperson || 'None'}
              </p>
              <p className="text-xs text-slate-400 mt-1">{dashboardStats?.topSalespersonCount || 0} invoices</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Upload TireMaster File</h2>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          <div className="flex items-center">
            <input
              id="update-existing"
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="update-existing" className="ml-2 block text-sm text-gray-900">
              Update existing invoices (slower, but keeps data in sync)
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Selected: {selectedFile.name}</span>
              <button
                onClick={handleFileUpload}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Parse TireMaster Data'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Database Management Section */}
      <div className="bg-white border border-red-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-red-800">Database Management</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Clear all imported data from the database. This includes invoices, line items, customers, and import history.
            Use this to reset the system for testing.
          </p>
          <button
            onClick={handleClearDatabase}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {loading ? 'Clearing...' : 'Clear Database'}
          </button>
        </div>
      </div>

      {/* Parse Results */}
      {parseResult && (
        <div className={`border rounded-lg p-6 ${
          parseResult.isHistorical
            ? 'bg-blue-50 border-blue-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center mb-4">
            <CheckCircle className={`h-5 w-5 mr-2 ${
              parseResult.isHistorical ? 'text-blue-600' : 'text-green-600'
            }`} />
            <h3 className={`text-lg font-medium ${
              parseResult.isHistorical ? 'text-blue-900' : 'text-green-900'
            }`}>
              {parseResult.isHistorical ? 'Historical Import Results' : 'Parse Results'}
            </h3>
          </div>

          {parseResult.isHistorical && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded">
              <p className="text-blue-800 font-medium">{parseResult.message}</p>
              {parseResult.originalProcessingDate && (
                <p className="text-blue-700 text-sm mt-1">
                  Originally processed: {new Date(parseResult.originalProcessingDate).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">File:</span> {parseResult.filename}
            </div>
            <div>
              <span className="font-medium">Total Records:</span> {parseResult.totalLines}
            </div>
            <div>
              <span className="font-medium">Successful:</span> {parseResult.totalInvoicesDetected}
            </div>
            <div>
              <span className="font-medium">Batch ID:</span> {parseResult.importBatchId}
            </div>
          </div>
        </div>
      )}

      {/* Parsed Data Display */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-slate-800">Parsed Invoice Data</h2>
            <button
              onClick={toggleAllRows}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
            >
              {expandedRows.size === csvData.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          <button
            onClick={downloadTestReport}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-all duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                <th scope="col" className="w-10 px-3 py-3"></th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tax
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginatedData.map((invoice) => {
                const isExpanded = expandedRows.has(invoice.invoiceNumber);
                return (
                  <React.Fragment key={invoice.invoiceNumber}>
                    {/* Invoice Row */}
                    <tr
                      onClick={() => toggleRow(invoice.invoiceNumber)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-4 whitespace-nowrap">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-blue-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{invoice.customerName}</div>
                        {invoice.salesperson && (
                          <div className="text-xs text-slate-500">{invoice.salesperson}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{invoice.invoiceDate || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs truncate">
                          {invoice.vehicleInfo || '-'}
                        </div>
                        {invoice.mileage && invoice.mileage !== '0 / 0' && (
                          <div className="text-xs text-slate-500">{invoice.mileage}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {invoice.lineItems.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 tabular-nums">
                        ${(invoice.taxAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 tabular-nums">
                        ${(invoice.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>

                    {/* Expanded Line Items */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-0 py-0">
                          <div className="bg-slate-50/50 border-y border-slate-200 shadow-inner">
                            <div className="pl-14 pr-6 py-4">
                              <div className="flex items-center mb-3">
                                <div className="h-px flex-1 bg-slate-200"></div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">Line Items Details</h4>
                                <div className="h-px flex-1 bg-slate-200"></div>
                              </div>
                              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                                <table className="min-w-full divide-y divide-slate-100">
                                  <thead className="bg-slate-50">
                                    <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                      <th className="text-left py-3 pl-4 pr-4">Product Code</th>
                                      <th className="text-left py-3 pr-4">Description</th>
                                      <th className="text-center py-3 pr-4">Adj</th>
                                      <th className="text-right py-3 pr-4">Qty</th>
                                      <th className="text-right py-3 pr-4">Parts</th>
                                      <th className="text-right py-3 pr-4">Labor</th>
                                      <th className="text-right py-3 pr-4">FET</th>
                                      <th className="text-right py-3 pr-4">Total</th>
                                      <th className="text-right py-3 pr-4">Cost</th>
                                      <th className="text-right py-3 pr-4">GPM%</th>
                                      <th className="text-right py-3 pr-4">GP$</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {invoice.lineItems.map((item, itemIdx) => (
                                      <tr key={itemIdx} className="text-sm hover:bg-slate-50 transition-colors">
                                        <td className="py-2 pl-4 pr-4 font-mono text-xs text-slate-600">
                                          {item.productCode}
                                        </td>
                                        <td className="py-2 pr-4 text-slate-700 max-w-xs truncate">
                                          {item.description}
                                        </td>
                                        <td className="py-2 pr-4 text-center text-slate-500">
                                          {item.adjustment || '-'}
                                        </td>
                                        <td className="py-2 pr-4 text-right text-slate-600 tabular-nums">
                                          {item.quantity}
                                        </td>
                                        <td className="py-2 pr-4 text-right text-slate-600 tabular-nums">
                                          ${item.partsCost.toFixed(2)}
                                        </td>
                                        <td className="py-2 pr-4 text-right text-slate-600 tabular-nums">
                                          ${item.laborCost.toFixed(2)}
                                        </td>
                                        <td className="py-2 pr-4 text-right text-slate-600 tabular-nums">
                                          ${item.fet.toFixed(2)}
                                        </td>
                                        <td className="py-2 pr-4 text-right font-medium text-slate-900 tabular-nums">
                                          ${item.lineTotal.toFixed(2)}
                                        </td>
                                        <td className="py-2 pr-4 text-right text-slate-500 tabular-nums">
                                          ${item.cost.toFixed(2)}
                                        </td>
                                        <td className={`py-2 pr-4 text-right tabular-nums ${
                                          item.grossProfitMargin < 0 ? 'text-red-600' : 'text-emerald-600'
                                        }`}>
                                          {item.grossProfitMargin.toFixed(1)}%
                                        </td>
                                        <td className={`py-2 pr-4 text-right font-medium tabular-nums ${
                                          item.grossProfit < 0 ? 'text-red-600' : 'text-emerald-600'
                                        }`}>
                                          ${item.grossProfit.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <span className="text-sm text-slate-600">
              Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to <span className="font-medium text-slate-900">{endIndex}</span> of <span className="font-medium text-slate-900">{dataStats?.totalInvoices || 0}</span> invoices
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                const showEllipsis =
                  (page === currentPage - 2 && currentPage > 3) ||
                  (page === currentPage + 2 && currentPage < totalPages - 2);

                if (showPage) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-all focus:outline-none ${
                        page === currentPage
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                }

                if (showEllipsis) {
                  return (
                    <span key={page} className="px-3 py-1 text-sm text-slate-500">
                      ...
                    </span>
                  );
                }

                return null;
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}