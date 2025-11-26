'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/dashboard/dashboard-layout';
import { useStore } from '../../../../contexts/store-context';
import { 
  Users, 
  User, 
  Calendar, 
  TrendingUp, 
  Download, 
  ArrowUp, 
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';

// Interfaces
interface SalespersonReport {
  salesperson: string;
  invoice_count: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  avg_ticket: number;
  avg_profit_per_unit: number;
}

interface CustomerReport {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  invoice_count: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  last_purchase_date: string;
}

interface MonthlyReport {
  month_key: string;
  month_name: string;
  invoice_count: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
}

export default function SalesReportsPage() {
  const router = useRouter();
  const { selectedStoreId } = useStore();
  const [activeTab, setActiveTab] = useState('salespeople');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [period, setPeriod] = useState('365'); // Default to last year
  
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('total_revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination for customers
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchReport();
  }, [activeTab, period, page, debouncedSearch, sortField, sortDirection, selectedStoreId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '';
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
      
      const dateParams = `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const sortParams = `sortBy=${sortField}&sortOrder=${sortDirection}`;
      const searchParams = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const storeParam = selectedStoreId ? `&storeId=${selectedStoreId}` : '';

      if (activeTab === 'salespeople') {
        url = `/api/v1/invoices/reports/salespeople?${dateParams}&${sortParams}${searchParams}${storeParam}`;
      } else if (activeTab === 'customers') {
        const offset = (page - 1) * limit;
        url = `/api/v1/invoices/reports/customers?${dateParams}&limit=${limit}&offset=${offset}&${sortParams}${searchParams}${storeParam}`;
      } else if (activeTab === 'invoices') {
        url = `/api/v1/invoices?${dateParams}&limit=${limit}&page=${page}&${sortParams}${searchParams}${storeParam}`;
      } else if (activeTab === 'monthly') {
        url = `/api/v1/invoices/reports/monthly?year=${new Date().getFullYear()}${storeParam}`;
      }

      const res = await fetch(url);
      const result = await res.json();

      if (result.success) {
        if (activeTab === 'invoices') {
          setData(result.data.invoices);
          if (result.data.pagination) {
            setTotalRecords(result.data.pagination.total);
          }
        } else {
          setData(result.data);
          if (activeTab === 'customers' && result.meta) {
            setTotalRecords(result.meta.total);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const SortableHeader = ({ field, label, align = 'left' }: { field: string, label: string, align?: 'left' | 'right' }) => (
    <th 
      className={`px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
  };

  const formatPercent = (val: number | string) => {
    return `${Number(val).toFixed(1)}%`;
  };

  return (
    <DashboardLayout title="Detailed Sales Reports">
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Detailed Reports</h1>
              <p className="text-slate-500">Granular analysis of your business performance</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 6 Months</option>
                <option value="365">Last Year</option>
              </select>
              
              <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-8 border-b border-slate-200">
            <button
              onClick={() => { setActiveTab('salespeople'); setPage(1); setSortField('total_revenue'); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'salespeople' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Salespeople
              </div>
            </button>
            <button
              onClick={() => { setActiveTab('customers'); setPage(1); setSortField('total_revenue'); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'customers' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Customers
              </div>
            </button>
            <button
              onClick={() => { setActiveTab('invoices'); setPage(1); setSortField('invoiceDate'); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Invoices
              </div>
            </button>
            <button
              onClick={() => { setActiveTab('monthly'); setPage(1); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'monthly' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Monthly Breakdown
              </div>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {activeTab === 'salespeople' && (
                      <>
                        <SortableHeader field="salesperson" label="Salesperson" />
                        <SortableHeader field="invoice_count" label="Invoices" align="right" />
                        <SortableHeader field="total_revenue" label="Revenue" align="right" />
                        <SortableHeader field="total_profit" label="Gross Profit" align="right" />
                        <SortableHeader field="profit_margin" label="Margin" align="right" />
                        <SortableHeader field="avg_ticket" label="Avg Ticket" align="right" />
                        <SortableHeader field="avg_profit_per_unit" label="Avg Profit/Unit" align="right" />
                      </>
                    )}
                    {activeTab === 'customers' && (
                      <>
                        <SortableHeader field="customer_name" label="Customer" />
                        <SortableHeader field="invoice_count" label="Invoices" align="right" />
                        <SortableHeader field="total_revenue" label="Revenue" align="right" />
                        <SortableHeader field="total_profit" label="Gross Profit" align="right" />
                        <SortableHeader field="profit_margin" label="Margin" align="right" />
                        <SortableHeader field="last_purchase_date" label="Last Purchase" align="right" />
                      </>
                    )}
                    {activeTab === 'invoices' && (
                      <>
                        <SortableHeader field="invoiceDate" label="Date" />
                        <SortableHeader field="invoiceNumber" label="Invoice #" />
                        <SortableHeader field="customerName" label="Customer" />
                        <SortableHeader field="salesperson" label="Salesperson" />
                        <SortableHeader field="totalAmount" label="Amount" align="right" />
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Gross Profit</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Avg Profit/Unit</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Items</th>
                      </>
                    )}
                    {activeTab === 'monthly' && (
                      <>
                        <th className="px-6 py-4 font-semibold text-slate-700">Month</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Invoices</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Revenue</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Gross Profit</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 text-right">Margin</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50 transition-colors ${activeTab !== 'monthly' ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (activeTab === 'salespeople') {
                          router.push(`/dashboard/sales/reports/salesperson/${encodeURIComponent(row.salesperson)}`);
                        } else if (activeTab === 'customers') {
                          router.push(`/dashboard/sales/reports/customer/${row.customer_id}`);
                        } else if (activeTab === 'invoices') {
                          router.push(`/dashboard/sales/invoices/${row.invoiceNumber}`);
                        }
                      }}
                    >
                      {activeTab === 'salespeople' && (
                        <>
                          <td className="px-6 py-4 font-medium text-slate-900">{row.salesperson}</td>
                          <td className="px-6 py-4 text-right text-slate-600">{row.invoice_count}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(row.total_revenue)}</td>
                          <td className="px-6 py-4 text-right text-green-600">{formatCurrency(row.total_profit)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.profit_margin >= 20 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {formatPercent(row.profit_margin)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.avg_ticket)}</td>
                          <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.avg_profit_per_unit)}</td>
                        </>
                      )}
                      {activeTab === 'customers' && (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{row.customer_name}</div>
                            <div className="text-xs text-slate-500">{row.customer_code}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">{row.invoice_count}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(row.total_revenue)}</td>
                          <td className="px-6 py-4 text-right text-green-600">{formatCurrency(row.total_profit)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.profit_margin >= 20 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {formatPercent(row.profit_margin)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">
                            {new Date(row.last_purchase_date).toLocaleDateString()}
                          </td>
                        </>
                      )}
                      {activeTab === 'invoices' && (
                        <>
                          <td className="px-6 py-4 text-slate-600">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-medium text-blue-600">{row.invoiceNumber}</td>
                          <td className="px-6 py-4 text-slate-900">{row.customerName}</td>
                          <td className="px-6 py-4 text-slate-600">{row.salesperson}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-6 py-4 text-right text-green-600">{formatCurrency(row.grossProfit)}</td>
                          <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.avgProfitPerUnit)}</td>
                          <td className="px-6 py-4 text-right text-slate-600">{row.lineItemsCount}</td>
                        </>
                      )}
                      {activeTab === 'monthly' && (
                        <>
                          <td className="px-6 py-4 font-medium text-slate-900">{row.month_name}</td>
                          <td className="px-6 py-4 text-right text-slate-600">{row.invoice_count}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(row.total_revenue)}</td>
                          <td className="px-6 py-4 text-right text-green-600">{formatCurrency(row.total_profit)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.profit_margin >= 20 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {formatPercent(row.profit_margin)}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No data available for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {(activeTab === 'customers' || activeTab === 'invoices') && totalRecords > limit && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= totalRecords}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}