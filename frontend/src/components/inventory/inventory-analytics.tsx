'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download
} from 'lucide-react';

interface InventoryItem {
  productId: string;
  sku: string;
  name: string;
  size: string;
  brand: string;
  totalSold: number;
  dailyVelocity: number;
  currentStock: number;
  daysOfSupply: number;
  suggestedRestock: number;
  inventoryBreakdown: Array<{ 
    location: string; 
    quantity: number;
    velocity: number;
    suggestedRestock: number;
  }>;
}

interface Location {
  id: string;
  name: string;
  tireMasterCode: string;
}

export default function InventoryAnalytics() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [size, setSize] = useState('');
  const [storeId, setStoreId] = useState('');
  const [minVelocity, setMinVelocity] = useState<number>(0);
  const [days, setDays] = useState<number>(30);
  const [outlook, setOutlook] = useState<number>(30);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('dailyVelocity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true); // Simple check if we got full page
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/v1/inventory/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error('Failed to fetch locations', err);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (size) params.append('size', size);
      if (storeId) params.append('storeId', storeId);
      if (minVelocity > 0) params.append('minVelocity', minVelocity.toString());
      if (days) params.append('days', days.toString());
      if (outlook) params.append('outlook', outlook.toString());
      
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`/api/v1/inventory/analytics?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await res.json();
      setItems(data);
      setHasMore(data.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [search, size, storeId, minVelocity, days, outlook, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to desc for new field
    }
    setPage(1); // Reset to first page on sort change
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Inventory Analytics</h2>
          <div className="flex gap-2">
            <button 
              onClick={fetchAnalytics}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search SKU, Brand..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Size Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by Size..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Store Filter */}
          <select
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Stores</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          {/* Days Filter */}
          <select
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          {/* Outlook Filter */}
          <select
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={outlook}
            onChange={(e) => {
              setOutlook(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={30}>30 Day Outlook</option>
            <option value={60}>60 Day Outlook</option>
            <option value={90}>90 Day Outlook</option>
            <option value={120}>120 Day Outlook</option>
            <option value={180}>180 Day Outlook</option>
          </select>

          {/* Min Velocity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Min Velocity:</span>
            <input
              type="number"
              min="0"
              step="0.1"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={minVelocity}
              onChange={(e) => {
                setMinVelocity(Number(e.target.value));
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th 
                  className="px-6 py-3 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center gap-2">SKU <SortIcon field="sku" /></div>
                </th>
                <th 
                  className="px-6 py-3 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">Description <SortIcon field="name" /></div>
                </th>
                <th className="px-6 py-3 whitespace-nowrap">Size</th>
                <th className="px-6 py-3 whitespace-nowrap">Brand</th>
                <th 
                  className="px-6 py-3 whitespace-nowrap text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalSold')}
                >
                  <div className="flex items-center justify-end gap-2">Sold <SortIcon field="totalSold" /></div>
                </th>
                <th 
                  className="px-6 py-3 whitespace-nowrap text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dailyVelocity')}
                >
                  <div className="flex items-center justify-end gap-2">Velocity <SortIcon field="dailyVelocity" /></div>
                </th>
                <th 
                  className="px-6 py-3 whitespace-nowrap text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('currentStock')}
                >
                  <div className="flex items-center justify-end gap-2">Stock <SortIcon field="currentStock" /></div>
                </th>
                <th 
                  className="px-6 py-3 whitespace-nowrap text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('daysOfSupply')}
                >
                  <div className="flex items-center justify-end gap-2">Days Supply <SortIcon field="daysOfSupply" /></div>
                </th>
                <th 
                  className="px-6 py-3 whitespace-nowrap text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('suggestedRestock')}
                >
                  <div className="flex items-center justify-end gap-2">Restock ({outlook}d) <SortIcon field="suggestedRestock" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Loading data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No items found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <React.Fragment key={item.productId}>
                    <tr 
                      onClick={() => setExpandedProductId(expandedProductId === item.productId ? null : item.productId)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${expandedProductId === item.productId ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.size}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.brand}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">{item.totalSold}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{item.dailyVelocity.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">{item.currentStock}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${
                        item.daysOfSupply < 15 ? 'text-red-600' : 
                        item.daysOfSupply > 60 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.daysOfSupply.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {item.suggestedRestock > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {item.suggestedRestock}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    {expandedProductId === item.productId && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="bg-white rounded-lg border shadow-sm p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Store Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {item.inventoryBreakdown.map((loc, idx) => (
                                <div key={idx} className="flex flex-col p-3 bg-gray-50 rounded border">
                                  <span className="font-medium text-gray-900 mb-2">{loc.location}</span>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-gray-500">Stock:</div>
                                    <div className="text-right font-medium">{loc.quantity}</div>
                                    <div className="text-gray-500">Velocity:</div>
                                    <div className="text-right">{loc.velocity?.toFixed(2) || '0.00'}</div>
                                    <div className="text-gray-500">Restock:</div>
                                    <div className={`text-right font-bold ${loc.suggestedRestock > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {loc.suggestedRestock || 0}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              className="border rounded p-1 text-sm"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Page {page}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore || loading}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
