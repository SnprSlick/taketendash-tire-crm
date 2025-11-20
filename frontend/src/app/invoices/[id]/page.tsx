'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Printer, Download, Edit3 } from 'lucide-react';
import InvoiceDetail from '../../../components/invoices/invoice-detail';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const handleBack = () => {
    router.push('/invoices');
  };

  const handleEdit = () => {
    // TODO: Navigate to edit page or open edit modal
    console.log('Edit invoice:', invoiceId);
  };

  const handlePrint = () => {
    // TODO: Implement print functionality
    console.log('Print invoice:', invoiceId);
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    console.log('Download invoice:', invoiceId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      #{invoiceId}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    View and manage invoice information
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>

                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </button>

                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors duration-200"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <InvoiceDetail
            invoiceId={invoiceId}
            onBack={handleBack}
            className=""
          />
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .bg-white {
            background: white !important;
          }

          .shadow-sm,
          .shadow-lg,
          .shadow-xl {
            box-shadow: none !important;
          }

          .border-b {
            border-bottom: 1px solid #e5e7eb !important;
          }

          .rounded-lg {
            border-radius: 0 !important;
          }

          /* Hide navigation and action buttons when printing */
          button,
          .print\\:hidden {
            display: none !important;
          }

          /* Optimize text for print */
          .text-gray-900 {
            color: #000 !important;
          }

          .text-gray-600,
          .text-gray-700 {
            color: #374151 !important;
          }

          .text-gray-500 {
            color: #6b7280 !important;
          }
        }
      `}</style>
    </div>
  );
}