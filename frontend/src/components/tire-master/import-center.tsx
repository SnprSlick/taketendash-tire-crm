import React, { useState } from 'react';
import { FileText, Package, Tag, Upload } from 'lucide-react';
import CsvImportClientPage from '../../app/csv-import/csv-import-client';

type ImportType = 'invoices' | 'inventory' | 'brands';

export default function ImportCenter() {
  const [activeTab, setActiveTab] = useState<ImportType>('invoices');

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`${
              activeTab === 'invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Invoice Import
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Package className="h-4 w-4 mr-2" />
            Inventory Import
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`${
              activeTab === 'brands'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Tag className="h-4 w-4 mr-2" />
            Brand Import
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'invoices' && (
          <div className="-m-6">
            {/* Wrapper to reset some styles if needed, or just render directly */}
            <CsvImportClientPage />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inventory Import</h3>
            <p className="mt-1 text-sm text-gray-500">Upload inventory CSV files to update stock levels and product details.</p>
            <div className="mt-6">
              <button
                type="button"
                disabled
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Coming Soon
              </button>
            </div>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brand Import</h3>
            <p className="mt-1 text-sm text-gray-500">Upload brand mapping CSV files to standardize manufacturer names.</p>
            <div className="mt-6">
              <button
                type="button"
                disabled
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Coming Soon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
