'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { AlertCircle, RefreshCw, Search, Package, Truck, Database, Settings, Upload, FileText } from 'lucide-react';
import TireMasterProductSearch from '@/components/tire-master/product-search';
import TireMasterRefreshCwStatus from '@/components/tire-master/sync-status';
import TireMasterInventory from '@/components/tire-master/inventory';
import ImportCenter from '@/components/tire-master/import-center';
import ReconciliationCenter from '@/components/tire-master/reconciliation';

type ViewType = 'overview' | 'search' | 'sync' | 'inventory' | 'settings' | 'import' | 'reconciliation';

interface IntegrationHealth {
  healthScore: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  lastSuccessfulRefreshCw: string;
  recentFailures: number;
  activeMappings: number;
  totalProducts: number;
  checks: {
    connectivity: boolean;
    dataRefreshCw: boolean;
    mappings: boolean;
  };
}

export default function TireMasterIntegrationPage() {
  const [view, setView] = useState<ViewType>('overview');
  const [integrationHealth, setIntegrationHealth] = useState<IntegrationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrationHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/tire-master/sync/status');
      if (!response.ok) throw new Error('Failed to fetch sync status');

      const data = await response.json();
      setIntegrationHealth(data.integrationHealth);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch integration health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrationHealth();
  }, [fetchIntegrationHealth]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    if (status === 'HEALTHY') return 'bg-green-100 text-green-800';
    if (status === 'WARNING') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  Error loading Tire Master integration: {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Tire Master Integration">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tire Master Integration</h1>
              <p className="text-gray-600 mt-1">
                Manage product sync, inventory, and integration with Tire Master POS system
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setView('overview')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                  view === 'overview'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setView('search')}
                className={`hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                  view === 'search'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Search className="h-4 w-4 mr-1" />
                Search
              </button>
              <button
                onClick={() => setView('import')}
                className={`hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                  view === 'import'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </button>
              <button
                onClick={() => setView('reconciliation')}
                className={`hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                  view === 'reconciliation'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4 mr-1" />
                Reconciliation
              </button>
              <button
                onClick={() => setView('sync')}
                className={`hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                  view === 'sync'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                RefreshCw
              </button>
              <button
                onClick={() => setView('inventory')}
                className={`hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                  view === 'inventory'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 mr-1" />
                Inventory
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            <button
              onClick={() => setView('search')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'search'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Search className="h-4 w-4 mr-1" />
              Search
            </button>
            <button
              onClick={() => setView('sync')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'sync'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              RefreshCw
            </button>
            <button
              onClick={() => setView('inventory')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'inventory'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Package className="h-4 w-4 mr-1" />
              Inventory
            </button>
            <button
              onClick={() => setView('settings')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'settings'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </button>
          </div>

          {/* Overview Content */}
          {view === 'overview' && integrationHealth && (
            <>
              {/* Health Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">Integration Health</h3>
                    <Database className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="pt-2">
                    <div className={`text-2xl font-bold ${getHealthColor(integrationHealth.healthScore)}`}>
                      {integrationHealth.healthScore}%
                    </div>
                    <span
                      className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integrationHealth.status)}`}
                    >
                      {integrationHealth.status}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">Total Products</h3>
                    <Package className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="pt-2">
                    <div className="text-2xl font-bold">{integrationHealth.totalProducts.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">
                      {integrationHealth.activeMappings} active mappings
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">Last RefreshCw</h3>
                    <RefreshCw className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="pt-2">
                    <div className="text-sm font-medium">
                      {formatDate(integrationHealth.lastSuccessfulRefreshCw)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {integrationHealth.recentFailures} recent failures
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">System Checks</h3>
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Connectivity</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          integrationHealth.checks.connectivity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {integrationHealth.checks.connectivity ? 'OK' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Data RefreshCw</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          integrationHealth.checks.dataRefreshCw ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {integrationHealth.checks.dataRefreshCw ? 'OK' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Mappings</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          integrationHealth.checks.mappings ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {integrationHealth.checks.mappings ? 'OK' : 'FAIL'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView('search')}>
                  <div className="mb-4">
                    <h3 className="flex items-center text-lg font-medium text-gray-900">
                      <Search className="h-5 w-5 mr-2 text-blue-600" />
                      Product Search
                    </h3>
                    <p className="text-sm text-gray-600">
                      Search and browse Tire Master product catalog
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      Find products, check availability, and view pricing from Tire Master inventory
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView('sync')}>
                  <div className="mb-4">
                    <h3 className="flex items-center text-lg font-medium text-gray-900">
                      <RefreshCw className="h-5 w-5 mr-2 text-green-600" />
                      Data Sync
                    </h3>
                    <p className="text-sm text-gray-600">
                      Sync products, inventory, and pricing data
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      Manage automatic sync schedules and run manual sync operations
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView('inventory')}>
                  <div className="mb-4">
                    <h3 className="flex items-center text-lg font-medium text-gray-900">
                      <Truck className="h-5 w-5 mr-2 text-purple-600" />
                      Inventory Management
                    </h3>
                    <p className="text-sm text-gray-600">
                      View and manage inventory across locations
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      Monitor stock levels, reserved quantities, and location-based inventory
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView('import')}>
                  <div className="mb-4">
                    <h3 className="flex items-center text-lg font-medium text-gray-900">
                      <Upload className="h-5 w-5 mr-2 text-orange-600" />
                      Data Import
                    </h3>
                    <p className="text-sm text-gray-600">
                      Import data from CSV files
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      Upload invoices, inventory updates, and brand mappings
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Component Views */}
          {view === 'search' && (
            <TireMasterProductSearch onBackToOverview={() => setView('overview')} />
          )}

          {view === 'sync' && (
            <TireMasterRefreshCwStatus onBackToOverview={() => setView('overview')} />
          )}

          {view === 'inventory' && (
            <TireMasterInventory onBackToOverview={() => setView('overview')} />
          )}

          {view === 'import' && (
            <ImportCenter />
          )}

          {view === 'settings' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
                <p className="text-sm text-gray-600">
                  Configure Tire Master integration settings
                </p>
              </div>
              <div>
                <p className="text-gray-500">Settings panel coming soon...</p>
              </div>
            </div>
          )}

          {view === 'reconciliation' && (
            <ReconciliationCenter onBackToOverview={() => setView('overview')} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}