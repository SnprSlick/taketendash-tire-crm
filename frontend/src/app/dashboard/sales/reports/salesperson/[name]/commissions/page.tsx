'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../../../../components/dashboard/dashboard-layout';
import { 
  ArrowLeft,
  DollarSign,
  Download,
  Filter
} from 'lucide-react';

export default function SalespersonCommissionsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    if (params?.name) {
      fetchCommissions();
    }
  }, [params?.name, year, page]);

  const fetchCommissions = async () => {
    if (!params?.name) return;
    setLoading(true);
    try {
      const encodedName = encodeURIComponent(params.name as string);
      const res = await fetch(`/api/v1/invoices/reports/salespeople/${encodedName}/commissions?year=${year}&page=${page}&limit=${limit}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch commissions', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
  };

  if (loading && !data) {
    return (
      <DashboardLayout title="Reconciliation Report">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Reconciliation Report">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-slate-700">No data found</h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const { salesperson, data: invoices, meta } = data;
  const totalCommission = meta?.totalCommission || 0;

  return (
    <DashboardLayout title={`Reconciliation Report: ${salesperson}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Reconciliation Summary</h2>
              <p className="text-slate-500 text-sm mt-1">Showing {invoices.length} invoices with reconciliation</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 uppercase font-medium">Reconciliation (Year)</div>
              <div className="text-3xl font-bold text-indigo-600">{formatCurrency(totalCommission)}</div>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Profit</th>
                  <th className="px-6 py-4 text-right">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice: any) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/sales/invoices/${encodeURIComponent(invoice.invoiceNumber)}`)}
                  >
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {invoice.customer?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      <div>{formatCurrency(invoice.totalAmount)}</div>
                      {invoice.reconDifference !== 0 && (
                        <>
                          <div className={`text-xs mt-1 ${invoice.reconDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Diff: {formatCurrency(invoice.reconDifference)}
                          </div>
                          <div className="text-xs font-bold text-slate-700 mt-1 border-t border-slate-200 pt-1">
                            Total: {formatCurrency(invoice.totalWithRecon)}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600">
                      <div>{formatCurrency(invoice.grossProfit)}</div>
                      {invoice.reconDifference !== 0 && (
                        <div className="text-xs font-bold text-emerald-700 mt-1" title="Adjusted Profit (Profit + Recon Difference)">
                          Adj: {formatCurrency(invoice.adjustedProfit)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-indigo-600 font-bold">
                      {formatCurrency(invoice.commission || 0)}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No reconciliation records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
