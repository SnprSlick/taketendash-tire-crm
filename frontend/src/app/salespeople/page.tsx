'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboard/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { 
  Users, 
  Download, 
  ArrowUp, 
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SalespersonReport {
  salesperson: string;
  invoice_count: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  avg_ticket: number;
}

export default function SalespeoplePage() {
  const { selectedStoreId } = useStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SalespersonReport[]>([]);
  const [period, setPeriod] = useState('365'); // Default to last year
  
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('total_revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchReport();
  }, [period, debouncedSearch, sortField, sortDirection, selectedStoreId]);

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

      const url = `/api/v1/invoices/reports/salespeople?${dateParams}&${sortParams}${searchParams}${storeParam}`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
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
    <DashboardLayout title="Salespeople Stats">
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Salespeople Stats</h1>
              <p className="text-slate-500">Performance metrics by salesperson</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search salespeople..."
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <SortableHeader field="salesperson" label="Salesperson" />
                    <SortableHeader field="invoice_count" label="Invoices" align="right" />
                    <SortableHeader field="total_revenue" label="Revenue" align="right" />
                    <SortableHeader field="total_profit" label="Gross Profit" align="right" />
                    <SortableHeader field="profit_margin" label="Margin" align="right" />
                    <SortableHeader field="avg_ticket" label="Avg Ticket" align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No salespeople found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>{row.salesperson}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">{row.invoice_count}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(row.total_revenue)}</td>
                        <td className="px-6 py-4 text-right text-green-600">{formatCurrency(row.total_profit)}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatPercent(row.profit_margin)}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.avg_ticket)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
