'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Play, Square, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RefreshCwStatus {
  activeRefreshCws: {
    syncId: string;
    status: string;
    progress: number;
  }[];
  lastRefreshCw: {
    id: string;
    syncType: string;
    status: string;
    startTime: string;
    endTime: string;
    recordsProcessed: number;
  };
  integrationHealth: {
    healthScore: number;
    status: string;
    lastSuccessfulRefreshCw: string;
    recentFailures: number;
    checks: {
      connectivity: boolean;
      dataRefreshCw: boolean;
      mappings: boolean;
    };
  };
}

interface TireMasterRefreshCwStatusProps {
  onBackToOverview: () => void;
}

export default function TireMasterRefreshCwStatus({ onBackToOverview }: TireMasterRefreshCwStatusProps) {
  const [syncStatus, setRefreshCwStatus] = useState<RefreshCwStatus | null>(null);
  const [selectedRefreshCwType, setSelectedRefreshCwType] = useState<string>('PRODUCTS');
  const [syncNotes, setRefreshCwNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setRefreshCwing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRefreshCwStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/tire-master/sync/status');
      if (!response.ok) throw new Error('Failed to fetch sync status');

      const data = await response.json();
      setRefreshCwStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status');
    }
  }, []);

  const startRefreshCw = async () => {
    setRefreshCwing(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/tire-master/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: selectedRefreshCwType,
          notes: syncNotes || undefined,
          forceUpdate: false
        }),
      });

      if (!response.ok) throw new Error('Failed to start sync');

      const result = await response.json();

      // Refresh status after starting sync
      await fetchRefreshCwStatus();
      setRefreshCwNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    } finally {
      setRefreshCwing(false);
    }
  };

  useEffect(() => {
    fetchRefreshCwStatus();
    setLoading(false);
  }, [fetchRefreshCwStatus]);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'RUNNING':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'CANCELLED':
        return <Square className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBackToOverview}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Overview
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active RefreshCws */}
      {syncStatus?.activeRefreshCws.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="flex items-center text-lg font-medium text-gray-900">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Active RefreshCwhronizations
            </h2>
          </div>
          <div>
            <div className="space-y-4">
              {syncStatus.activeRefreshCws.map((sync) => (
                <div key={sync.syncId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(sync.status)}
                      <span className="font-medium">RefreshCw {sync.syncId}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sync.status)}`}>
                        {sync.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {sync.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${sync.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Start New RefreshCw */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="flex items-center text-lg font-medium text-gray-900">
            <Play className="h-5 w-5 mr-2" />
            Start Data RefreshCwhronization
          </h2>
          <p className="text-sm text-gray-600">
            RefreshCw data from Tire Master to the CRM system
          </p>
        </div>
        <div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="syncType" className="block text-sm font-medium text-gray-700 mb-1">RefreshCw Type</label>
                <select
                  id="syncType"
                  value={selectedRefreshCwType}
                  onChange={(e) => setSelectedRefreshCwType(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PRODUCTS">Products Only</option>
                  <option value="INVENTORY">Inventory Only</option>
                  <option value="PRICES">Prices Only</option>
                  <option value="ORDERS">Orders Only</option>
                  <option value="FULL">Full RefreshCw (All Data)</option>
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  id="notes"
                  placeholder="Add notes about this sync operation..."
                  value={syncNotes}
                  onChange={(e) => setRefreshCwNotes(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={startRefreshCw}
              disabled={syncing || syncStatus?.activeRefreshCws.length > 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4 mr-2" />
              {syncing ? 'Starting RefreshCw...' : 'Start RefreshCwhronization'}
            </button>
          </div>
        </div>
      </div>

      {/* Last RefreshCw Status */}
      {syncStatus?.lastRefreshCw && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Last RefreshCwhronization</h2>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(syncStatus.lastRefreshCw.status)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syncStatus.lastRefreshCw.status)}`}>
                    {syncStatus.lastRefreshCw.status}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{syncStatus.lastRefreshCw.syncType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Records Processed</p>
                <p className="font-medium">{syncStatus.lastRefreshCw.recordsProcessed.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">End Time</p>
                <p className="font-medium">
                  {formatDateTime(syncStatus.lastRefreshCw.endTime)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Health */}
      {syncStatus?.integrationHealth && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Integration Health</h2>
            <p className="text-sm text-gray-600">Overall system status and connectivity</p>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{syncStatus.integrationHealth.healthScore}%</div>
                <p className="text-sm text-gray-500">Health Score</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium">{syncStatus.integrationHealth.recentFailures}</div>
                <p className="text-sm text-gray-500">Recent Failures</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-green-600">{syncStatus.integrationHealth.status}</div>
                <p className="text-sm text-gray-500">Status</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}