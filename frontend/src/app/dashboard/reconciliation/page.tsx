'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/dashboard/dashboard-layout';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, ChevronRight, Trash2 } from 'lucide-react';

export default function ReconciliationPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ totalMatched: 0, totalUnmatched: 0, totalDiscrepancy: 0 });
  const [batches, setBatches] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, batchesRes] = await Promise.all([
        fetch('/api/v1/reconciliation/stats'),
        fetch('/api/v1/reconciliation/batches')
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (batchesRes.ok) setBatches(await batchesRes.json());
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/reconciliation/upload', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const result = await res.json();
        router.push(`/dashboard/reconciliation/${result.batchId}`);
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload error', error);
      alert('Upload error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all reconciliation data? This cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/v1/reconciliation/clear', {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchData(); // Refresh data
      } else {
        alert('Failed to clear database');
      }
    } catch (error) {
      console.error('Clear error', error);
      alert('Clear error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <DashboardLayout title="National Account Reconciliation">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">National Account Reconciliation</h1>
            <p className="text-slate-500 mt-1">Upload and reconcile national account statements</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearDatabase}
              disabled={clearing}
              className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 font-medium"
            >
              <Trash2 className="w-4 h-4" />
              {clearing ? 'Clearing...' : 'Clear Database'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".csv"
              onChange={handleUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Statement'}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Matched</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalMatched}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Discrepancies</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalDiscrepancy}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Unmatched</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalUnmatched}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Batches */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Recent Reconciliations</h3>
          </div>
          {batches.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No History</h3>
              <p className="text-slate-500 mt-2">Upload a statement to see history here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {batches.map((batch: any) => (
                <div 
                  key={batch.id}
                  onClick={() => router.push(`/dashboard/reconciliation/${batch.id}`)}
                  className="p-6 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{batch.filename}</h4>
                      <p className="text-sm text-slate-500">
                        {new Date(batch.uploadDate).toLocaleDateString()} • {batch.totalRecords} records
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {batch.matchedCount} Matched
                      </div>
                      <div className="text-xs text-slate-500">
                        {Math.round((batch.matchedCount / batch.totalRecords) * 100)}% Success Rate
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
