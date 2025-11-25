'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../../components/dashboard/dashboard-layout';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Truck, 
  DollarSign,
  Printer,
  Download
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.invoiceNumber) {
      fetchInvoice();
    }
  }, [params?.invoiceNumber]);

  const fetchInvoice = async () => {
    if (!params?.invoiceNumber) return;
    setLoading(true);
    try {
      // The invoice number might contain special characters, so we encode it
      const encodedNumber = encodeURIComponent(params.invoiceNumber as string);
      const res = await fetch(`/api/v1/invoices/${encodedNumber}`);
      
      if (!res.ok) {
        if (res.status === 404) throw new Error('Invoice not found');
        throw new Error('Failed to fetch invoice');
      }

      const result = await res.json();
      if (result.success) {
        setInvoice(result.data.invoice);
      } else {
        throw new Error(result.message || 'Failed to load invoice');
      }
    } catch (err: any) {
      console.error('Error fetching invoice:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
  };

  const formatPercent = (val: number | string) => {
    return `${Number(val).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            {error || 'Invoice not found'}
          </h2>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Invoice #${invoice.invoiceNumber}`}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between print:hidden">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
          {/* Invoice Header */}
          <div className="p-8 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between gap-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">INVOICE</h1>
                <div className="text-slate-500 font-medium">#{invoice.invoiceNumber}</div>
                <div className="mt-4 flex items-center text-slate-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {invoice.invoiceDate}
                </div>
                <div className="mt-1 flex items-center text-slate-600">
                  <User className="w-4 h-4 mr-2" />
                  Salesperson: <span className="font-medium ml-1">{invoice.salesperson}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Bill To</div>
                <div className="text-xl font-bold text-slate-800">{invoice.customerName}</div>
                {invoice.vehicleInfo && (
                  <div className="mt-4 inline-block text-left bg-white px-4 py-2 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Vehicle Info</div>
                    <div className="flex items-center text-slate-700 font-medium">
                      <Truck className="w-4 h-4 mr-2 text-slate-400" />
                      {invoice.vehicleInfo}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Mileage: {invoice.mileage}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">#</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right w-24">Qty</th>
                  <th className="px-6 py-4 text-right w-32">Unit Price</th>
                  <th className="px-6 py-4 text-right w-32">Total</th>
                  <th className="px-6 py-4 text-right w-32 text-green-600 bg-green-50/30">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lineItems.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-center text-slate-400">{item.line}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.description}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{item.productCode}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(item.lineTotal / (item.quantity || 1))}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600 bg-green-50/30">
                      {formatCurrency(item.grossProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-8 bg-slate-50/50 border-t border-slate-200">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.totalAmount - invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                </div>
                
                <div className="pt-6 mt-6 border-t border-dashed border-slate-300 space-y-2">
                  <div className="flex justify-between text-sm font-medium text-green-700">
                    <span>Total Profit</span>
                    <span>
                      {formatCurrency(invoice.lineItems.reduce((sum: number, item: any) => sum + item.grossProfit, 0))}
                    </span>
                  </div>
                  
                  {invoice.reconDifference !== 0 && invoice.reconDifference !== undefined && (
                    <>
                      <div className={`flex justify-between text-sm font-medium ${invoice.reconDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>Recon Difference</span>
                        <span>{formatCurrency(invoice.reconDifference)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-emerald-800 pt-2 border-t border-slate-200">
                        <span>Adjusted Profit</span>
                        <span>{formatCurrency(invoice.adjustedProfit)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
