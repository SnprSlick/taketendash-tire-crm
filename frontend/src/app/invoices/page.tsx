'use client';

import React, { useState } from 'react';
import { Plus, FileText, Filter, Download } from 'lucide-react';
import InvoiceList from '../../components/invoices/invoice-list';
import InvoiceFilters from '../../components/invoices/invoice-filters';

export default function InvoicesPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage and track customer invoices
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${showFilters
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>

                <button
                  onClick={() => {
                    // TODO: Implement export functionality
                    console.log('Export invoices');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </button>
              </div>
            </div>

            {/* Summary Stats Bar */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Invoices</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold">$-</p>
                  </div>
                  <div className="h-8 w-8 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-green-800 font-bold">$</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Pending</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="h-8 w-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-yellow-800 font-bold">!</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Average Amount</p>
                    <p className="text-2xl font-bold">$-</p>
                  </div>
                  <div className="h-8 w-8 bg-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-purple-800 font-bold">Ø</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <InvoiceFilters
                isOpen={true}
                onClose={() => setShowFilters(false)}
                onFiltersChange={(filters) => {
                  console.log('Filters changed:', filters);
                  // TODO: Apply filters to invoice list
                }}
                className="sticky top-6"
              />
            </div>
          )}

          {/* Invoice List */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm">
              <InvoiceList
                showFilters={false}
                onFilterToggle={() => setShowFilters(!showFilters)}
                className=""
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Invoice</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Invoice creation form will be implemented here.</p>
              <p className="text-sm mt-2">Coming soon...</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}