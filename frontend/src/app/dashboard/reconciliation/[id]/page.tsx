'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/dashboard/dashboard-layout';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function ReconciliationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [batch, setBatch] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isRescanning, setIsRescanning] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchBatchDetails(params.id as string);
    }
  }, [params]);

  const fetchBatchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/reconciliation/batches/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBatch(data.batch);
        setRecords(data.records);
      }
    } catch (error) {
      console.error('Failed to fetch batch details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async () => {
    if (!batch) return;
    setIsRescanning(true);
    try {
      const res = await fetch(`/api/v1/reconciliation/batches/${batch.id}/rescan`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchBatchDetails(batch.id);
      }
    } catch (error) {
      console.error('Failed to rescan batch', error);
    } finally {
      setIsRescanning(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesFilter = filter === 'ALL' || record.status === filter;
    const matchesSearch = search === '' || 
      record.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      record.accountName?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading) {
    return (
      <DashboardLayout title="Reconciliation Details">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) {
    return (
      <DashboardLayout title="Reconciliation Details">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-slate-900">Batch not found</h3>
          <button 
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Reconciliation: ${batch.filename}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{batch.filename}</h1>
              <p className="text-slate-500 text-sm">
                Uploaded on {new Date(batch.uploadDate).toLocaleString()} • {batch.totalRecords} records
              </p>
            </div>
          </div>
          <button
            onClick={handleRescan}
            disabled={isRescanning}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRescanning ? 'animate-spin' : ''}`} />
            {isRescanning ? 'Scanning...' : 'Rescan Matches'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['ALL', 'MATCHED', 'UNMATCHED', 'DISCREPANCY'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === status 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4 text-right">Estimated CR</th>
                  <th className="px-6 py-4 text-right">Paid Amt</th>
                  <th className="px-6 py-4 text-right">CR Comm</th>
                  <th className="px-6 py-4 text-right">Total Credit</th>
                  <th className="px-6 py-4 text-right">Difference</th>
                  <th className="px-6 py-4">Matched To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => {
                  const isExpanded = expandedRowId === record.id;
                  const hasMatch = !!record.matchedInvoice;
                  
                  return (
                    <React.Fragment key={record.id}>
                      <tr 
                        onClick={() => hasMatch && setExpandedRowId(isExpanded ? null : record.id)}
                        className={`transition-colors ${hasMatch ? 'cursor-pointer hover:bg-slate-50' : ''} ${isExpanded ? 'bg-slate-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasMatch && (
                              <button className="text-slate-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              record.status === 'MATCHED' ? 'bg-green-50 text-green-700' :
                              record.status === 'DISCREPANCY' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {record.status === 'MATCHED' && <CheckCircle className="w-3 h-3" />}
                              {record.status === 'DISCREPANCY' && <AlertCircle className="w-3 h-3" />}
                              {record.status === 'UNMATCHED' && <XCircle className="w-3 h-3" />}
                              {record.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{record.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-600">{record.accountName || '-'}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(Number(record.invoiceAmount))}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(Number(record.creditAmount))}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(Number(record.commission || 0))}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">
                          {formatCurrency(Number(record.creditAmount) + Number(record.commission || 0))}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${
                          Number(record.difference) === 0 ? 'text-slate-400' : 
                          Number(record.difference) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Number(record.difference))}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {record.matchedInvoice ? (
                            <div className="flex flex-col">
                              <span className="text-blue-600 font-medium">{record.matchedInvoice.invoiceNumber}</span>
                              <span className="text-xs text-slate-400">{record.matchedInvoice.customer?.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No match</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && record.matchedInvoice && (
                        <tr className="bg-slate-50">
                          <td colSpan={9} className="px-6 pb-6 pt-0">
                            <div className="ml-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                              <h4 className="text-sm font-medium text-slate-900 mb-3">Invoice Details: {record.matchedInvoice.invoiceNumber}</h4>
                              <div className="grid grid-cols-2 gap-8 mb-4">
                                <div>
                                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                                  <p className="text-sm font-medium text-slate-900">{record.matchedInvoice.customer?.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date</p>
                                  <p className="text-sm font-medium text-slate-900">{new Date(record.matchedInvoice.invoiceDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                              
                              <div className="border-t border-slate-100 pt-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Line Items</p>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                                      <th className="text-left py-2 font-medium">Description</th>
                                      <th className="text-right py-2 font-medium">Qty</th>
                                      <th className="text-right py-2 font-medium">Unit Price</th>
                                      <th className="text-right py-2 font-medium">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {record.matchedInvoice.lineItems?.map((item: any) => {
                                      return (
                                        <tr key={item.id}>
                                          <td className="py-2 text-slate-600">
                                            <div className="flex items-center gap-2">
                                              {item.description}
                                            </div>
                                          </td>
                                          <td className="py-2 text-right text-slate-600">{Number(item.quantity)}</td>
                                          <td className="py-2 text-right text-slate-600">{formatCurrency(Number(item.unitPrice || 0))}</td>
                                          <td className="py-2 text-right font-medium text-slate-700">
                                            {formatCurrency(Number(item.lineTotal))}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="border-t border-slate-100">
                                    <tr>
                                      <td colSpan={3} className="py-2 text-right text-slate-500 font-medium">Subtotal</td>
                                      <td className="py-2 text-right text-slate-900 font-medium">{formatCurrency(Number(record.matchedInvoice.totalAmount) - Number(record.matchedInvoice.taxAmount || 0))}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3} className="py-2 text-right text-slate-500 font-medium">Tax</td>
                                      <td className="py-2 text-right text-slate-900 font-medium">{formatCurrency(Number(record.matchedInvoice.taxAmount || 0))}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3} className="py-2 text-right text-slate-500 font-medium">Total</td>
                                      <td className="py-2 text-right text-slate-900 font-bold">{formatCurrency(Number(record.matchedInvoice.totalAmount))}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                      No records found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
