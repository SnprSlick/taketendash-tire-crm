'use client';

import React, { useState } from 'react';
import { Plus, Users, Filter, Download, AlertTriangle } from 'lucide-react';
import CustomerList from '../../components/customers/customer-list';

export default function CustomersPage() {
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
                <Users className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage customer relationships and track loyalty
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
                      ? 'bg-green-50 border-green-300 text-green-700'
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
                    console.log('Export customers');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </button>
              </div>
            </div>

            {/* Summary Stats Bar */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Customers</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <Users className="h-8 w-8 text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Avg Spending</p>
                    <p className="text-2xl font-bold">$-</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 font-bold">$</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">At Risk</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Avg Loyalty Score</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="h-8 w-8 bg-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-purple-800 font-bold">★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Tier Overview */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-amber-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-amber-800">Bronze</span>
                </div>
                <p className="text-xl font-bold text-amber-900 mt-1">-</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-gray-400 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-800">Silver</span>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-1">-</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-yellow-800">Gold</span>
                </div>
                <p className="text-xl font-bold text-yellow-900 mt-1">-</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-indigo-800">Platinum</span>
                </div>
                <p className="text-xl font-bold text-indigo-900 mt-1">-</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <CustomerList
            showFilters={showFilters}
            onFilterToggle={() => setShowFilters(!showFilters)}
            onCreateCustomer={() => setShowCreateModal(true)}
            className=""
          />
        </div>
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Customer</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Customer creation form will be implemented here.</p>
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