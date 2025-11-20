'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Package,
  Download,
  Printer,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface LineItem {
  id: string;
  productName: string;
  productSku?: string;
  category: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  laborCost?: number;
  description?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  salesperson?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  laborCost?: number;
  partsCost?: number;
  environmentalFee?: number;
  status: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
  importBatchId?: string;
}

interface InvoiceDetail {
  invoice: Invoice;
  lineItems: LineItem[];
  customer: Customer;
}

interface InvoiceDetailProps {
  invoiceId: string;
  onBack?: () => void;
  className?: string;
}

export default function InvoiceDetail({
  invoiceId,
  onBack,
  className = ''
}: InvoiceDetailProps) {
  const router = useRouter();
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load invoice detail
  const loadInvoiceDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}?includeLineItems=true`);

      if (!response.ok) {
        throw new Error(`Failed to load invoice: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setInvoiceDetail(result.data);
      } else {
        throw new Error(result.message || 'Failed to load invoice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setInvoiceDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceDetail();
  }, [invoiceId]);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/invoices');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      PENDING: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertCircle,
      },
      PAID: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
      },
      VOIDED: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
      },
      OVERDUE: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: AlertCircle,
    };

    const Icon = config.icon;

    return (
      <span className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading invoice details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoiceDetail) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error loading invoice</div>
            <div className="text-sm text-gray-500 mb-4">{error}</div>
            <button
              onClick={loadInvoiceDetail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { invoice, lineItems, customer } = invoiceDetail;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Invoice {invoice.invoiceNumber}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(invoice.invoiceDate)}</span>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>

            <button
              onClick={() => {
                // Handle download
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>

            <button
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{customer.name}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-gray-600">{customer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.productName}
                              </div>
                              {item.productSku && (
                                <div className="text-sm text-gray-500">
                                  SKU: {item.productSku}
                                </div>
                              )}
                              {item.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {item.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Category: {item.category}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-gray-900">{item.quantity}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(item.unitPrice)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Invoice Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Basic Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
                </div>
                {invoice.salesperson && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Salesperson:</span>
                    <span className="font-medium">{invoice.salesperson}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Amount Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                  </div>

                  {invoice.laborCost && invoice.laborCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Labor:</span>
                      <span className="font-medium">{formatCurrency(invoice.laborCost)}</span>
                    </div>
                  )}

                  {invoice.partsCost && invoice.partsCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Parts:</span>
                      <span className="font-medium">{formatCurrency(invoice.partsCost)}</span>
                    </div>
                  )}

                  {invoice.environmentalFee && invoice.environmentalFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Environmental Fee:</span>
                      <span className="font-medium">{formatCurrency(invoice.environmentalFee)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items Count:</span>
                    <span className="font-medium">{lineItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {formatDate(invoice.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium">
                      {formatDate(invoice.updatedAt)}
                    </span>
                  </div>
                  {invoice.importBatchId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Import Batch:</span>
                      <span className="font-medium text-xs font-mono">
                        {invoice.importBatchId.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <button
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>View Customer</span>
                </button>

                {invoice.status !== 'VOIDED' && (
                  <button
                    onClick={() => {
                      // Handle void action
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Void Invoice</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}