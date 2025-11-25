'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { 
  FileText, 
  Download, 
  ArrowUp, 
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface InvoiceLineItem {
  line: number;
  productCode: string;
  description: string;
  quantity: number;
  partsCost: number;
  laborCost: number;
  lineTotal: number;
  grossProfit: number;
  grossProfitMargin: number;
}

interface InvoiceReport {
  id: string;
  invoiceDate: string;
  invoiceNumber: string;
  customerName: string;
  customerId: string;
  salesperson: string;
  totalAmount: number;
  grossProfit: number;
  profitMargin: number;
  lineItems: InvoiceLineItem[];
}

export default function InvoicesPage() {
  const router = useRouter();
  const { selectedStoreId } = useStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InvoiceReport[]>([]);
  const [period, setPeriod] = useState('365'); // Default to last year
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
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
  }, [period, page, debouncedSearch, sortField, sortDirection, selectedStoreId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
      
      const dateParams = `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const sortParams = `sortBy=${sortField}&sortOrder=${sortDirection}`;
      const searchParams = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const storeParam = selectedStoreId ? `&storeId=${selectedStoreId}` : '';

      const url = `/api/v1/invoices?${dateParams}&limit=${limit}&page=${page}&${sortParams}${searchParams}${storeParam}`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success) {
        setData(result.data.invoices);
        if (result.data.pagination) {
          setTotalRecords(result.data.pagination.total);
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

  const totalPages = Math.ceil(totalRecords / limit);

  return (
    <DashboardLayout title="Invoices">
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
              <p className="text-slate-500">Invoice history and details</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search invoices..."
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
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <SortableHeader field="invoiceDate" label="Date" />
                      <SortableHeader field="invoiceNumber" label="Invoice #" />
                      <SortableHeader field="customerName" label="Customer" />
                      <SortableHeader field="salesperson" label="Salesperson" />
                      <SortableHeader field="totalAmount" label="Amount" align="right" />
                      <th className="px-6 py-4 font-semibold text-slate-700 text-right">Gross Profit</th>
                      <th className="px-6 py-4 font-semibold text-slate-700 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          No invoices found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      data.map((row, index) => (
                        <React.Fragment key={row.id || index}>
                          <tr 
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRowId === row.id ? 'bg-slate-50' : ''}`}
                            onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                          >
                            <td className="px-6 py-4 text-slate-600">
                              {new Date(row.invoiceDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-blue-600">
                              {row.invoiceNumber}
                            </td>
                            <td className="px-6 py-4 text-slate-900">
                              <span 
                                className="hover:text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/customers?search=${encodeURIComponent(row.customerName)}`);
                                }}
                              >
                                {row.customerName}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <span 
                                className="hover:text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/salespeople?search=${encodeURIComponent(row.salesperson)}`);
                                }}
                              >
                                {row.salesperson}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                              {formatCurrency(row.totalAmount)}
                            </td>
                            <td className="px-6 py-4 text-right text-green-600">
                              {formatCurrency(row.grossProfit)}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-600">
                              {formatPercent(row.profitMargin)}
                            </td>
                          </tr>
                          {expandedRowId === row.id && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                  <h4 className="font-semibold text-slate-800 mb-3">Invoice Details</h4>
                                  <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left">Product</th>
                                        <th className="px-4 py-2 text-left">Description</th>
                                        <th className="px-4 py-2 text-right">Qty</th>
                                        <th className="px-4 py-2 text-right">Unit Price</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                        <th className="px-4 py-2 text-right">Margin</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.lineItems?.map((item, i) => (
                                        <tr key={i}>
                                          <td className="px-4 py-2 font-medium text-slate-700">{item.productCode}</td>
                                          <td className="px-4 py-2 text-slate-600">{item.description}</td>
                                          <td className="px-4 py-2 text-right text-slate-600">{item.quantity}</td>
                                          <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(item.lineTotal / (item.quantity || 1))}</td>
                                          <td className="px-4 py-2 text-right font-medium text-slate-900">{formatCurrency(item.lineTotal)}</td>
                                          <td className="px-4 py-2 text-right text-slate-600">{formatPercent(item.grossProfitMargin)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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
                  <span className="text-sm font-medium text-slate-700">
                    Page {page} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}