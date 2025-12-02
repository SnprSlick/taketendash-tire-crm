import React, { useState } from 'react';
import { FileText, Package, Tag, Upload, Trash2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import CsvImportClientPage from '../../app/csv-import/csv-import-client';
import { useAuth } from '../../contexts/auth-context';

type ImportType = 'invoices' | 'inventory' | 'brands' | 'employees';

export default function ImportCenter() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<ImportType>('invoices');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'inventory' | 'brands' | 'employees') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      let endpoint = '';
      if (type === 'inventory') endpoint = '/api/v1/csv-import/inventory';
      else if (type === 'brands') endpoint = '/api/v1/csv-import/brands';
      else if (type === 'employees') endpoint = '/api/v1/csv-import/employees';

      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setMessage({ type: 'success', text: `${type.charAt(0).toUpperCase() + type.slice(1)} imported successfully! Processed: ${data.processed}` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleClearDatabase = async (type: 'inventory' | 'brands') => {
    if (!confirm(`Are you sure you want to clear all ${type} data? This cannot be undone.`)) return;

    setLoading(true);
    setMessage(null);

    try {
      const endpoint = type === 'inventory' ? '/api/v1/csv-import/inventory' : '/api/v1/csv-import/brands';
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Clear failed');

      setMessage({ type: 'success', text: `${type === 'inventory' ? 'Inventory' : 'Brands'} database cleared successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Clear failed' });
    } finally {
      setLoading(false);
    }
  };

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
          <button
            onClick={() => setActiveTab('employees')}
            className={`${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Users className="h-4 w-4 mr-2" />
            Employee Import
          </button>
        </nav>
      </div>

      <div className="p-6">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
            {message.text}
          </div>
        )}

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
            
            <div className="mt-6 flex justify-center space-x-4">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                {loading ? 'Uploading...' : 'Upload Inventory CSV'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  onChange={(e) => handleFileUpload(e, 'inventory')} 
                  disabled={loading}
                />
              </label>

              <button
                type="button"
                onClick={() => handleClearDatabase('inventory')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Clear Database
              </button>
            </div>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brand Import</h3>
            <p className="mt-1 text-sm text-gray-500">Upload brand mapping CSV files to standardize manufacturer names.</p>
            
            <div className="mt-6 flex justify-center space-x-4">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                {loading ? 'Uploading...' : 'Upload Brand CSV'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  onChange={(e) => handleFileUpload(e, 'brands')} 
                  disabled={loading}
                />
              </label>

              <button
                type="button"
                onClick={() => handleClearDatabase('brands')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Clear Database
              </button>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Employee Import</h3>
            <p className="mt-1 text-sm text-gray-500">Upload employee list CSV to update roles and statuses.</p>
            
            <div className="mt-6 flex justify-center space-x-4">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                {loading ? 'Uploading...' : 'Upload Employee CSV'}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  onChange={(e) => handleFileUpload(e, 'employees')} 
                  disabled={loading}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
