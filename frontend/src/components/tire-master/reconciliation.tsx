import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Upload, FileText, RefreshCw, Trash2, CheckCircle, AlertCircle, XCircle, ArrowLeft } from 'lucide-react';

interface ReconciliationBatch {
  id: string;
  filename: string;
  uploadDate: string;
  status: string;
  totalRecords: number;
  matchedCount: number;
}

interface ReconciliationStats {
  totalBatches: number;
  totalRecords: number;
  matchedRecords: number;
  matchRate: number;
}

interface ReconciliationCenterProps {
  onBackToOverview?: () => void;
}

export default function ReconciliationCenter({ onBackToOverview }: ReconciliationCenterProps) {
  const { token } = useAuth();
  const [batches, setBatches] = useState<ReconciliationBatch[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [batchesRes, statsRes] = await Promise.all([
        fetch('/api/v1/reconciliation/batches', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/v1/reconciliation/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!batchesRes.ok || !statsRes.ok) throw new Error('Failed to fetch data');

      const batchesData = await batchesRes.json();
      const statsData = await statsRes.json();

      setBatches(batchesData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/v1/reconciliation/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      await fetchData();
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('recon-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRescan = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/reconciliation/batches/${id}/rescan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Rescan failed');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rescan failed');
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all reconciliation data? This cannot be undone.')) return;
    
    try {
      const response = await fetch('/api/v1/reconciliation/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Clear failed');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    }
  };

  return (
    <div className="space-y-6">
      {onBackToOverview && (
        <button
          onClick={onBackToOverview}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Overview
        </button>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Batches</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.totalBatches || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Records</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.totalRecords || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Matched Records</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{stats?.matchedRecords || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Match Rate</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">
              {stats?.matchRate ? `${(stats.matchRate * 100).toFixed(1)}%` : '0%'}
            </dd>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Upload Reconciliation File</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Upload a CSV file containing reconciliation data. The system will attempt to match records against existing invoices.</p>
          </div>
          <div className="mt-5 sm:flex sm:items-center">
            <div className="w-full sm:max-w-xs">
              <input
                type="file"
                id="recon-file-upload"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="-ml-1 mr-2 h-5 w-5" />
                  Upload
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-auto sm:w-auto sm:text-sm"
            >
              <Trash2 className="-ml-1 mr-2 h-5 w-5" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Batches</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {batches.map((batch) => (
            <li key={batch.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-sm font-medium text-blue-600 truncate">{batch.filename}</p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      batch.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Records: {batch.totalRecords}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      Matched: {batch.matchedCount}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      Date: {new Date(batch.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm sm:mt-0">
                    <button
                      onClick={() => handleRescan(batch.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Rescan
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {batches.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No reconciliation batches found. Upload a file to get started.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
