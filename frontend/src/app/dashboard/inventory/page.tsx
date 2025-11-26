'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/dashboard/dashboard-layout';
import { Search, Filter, Package, MapPin, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  tireMasterSku: string;
  description: string;
  size: string;
  brand: string;
  type: string;
  inventory: {
    quantity: number;
    location: {
      name: string;
    };
  }[];
}

interface Location {
  id: string;
  name: string;
  tireMasterCode: string;
}

export default function InventoryPage() {
  const [stats, setStats] = useState({ totalProducts: 0, totalQuantity: 0, locationsCount: 0 });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    search: string;
    locationId: string;
    size: string;
    inStock: boolean;
    page: number;
    limit: number;
    isTire?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>({
    search: '',
    locationId: '',
    size: '',
    inStock: false,
    page: 1,
    limit: 50,
    isTire: undefined,
    sortBy: 'tireMasterSku',
    sortOrder: 'asc'
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    fetchStats();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [filters]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/inventory/stats');
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/v1/inventory/locations');
      if (res.ok) setLocations(await res.json());
    } catch (error) {
      console.error('Failed to fetch locations', error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.locationId && { locationId: filters.locationId }),
        ...(filters.size && { size: filters.size }),
        ...(filters.inStock && { inStock: 'true' }),
        ...(filters.isTire !== undefined && { isTire: filters.isTire.toString() }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });
      
      const res = await fetch(`/api/v1/inventory?${query}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setMeta(data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const getTotalQuantity = (item: InventoryItem) => {
    return item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  };

  const formatType = (type: string) => {
    if (!type) return '';
    return type.replace(/_/g, ' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
            <p className="text-slate-500 mt-1">Track products and stock levels across locations</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Products</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalProducts.toLocaleString()}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Quantity</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalQuantity.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Locations</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.locationsCount}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setFilters(prev => ({ ...prev, isTire: undefined, page: 1 }))}
              className={`${
                filters.isTire === undefined
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Inventory
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, isTire: true, page: 1 }))}
              className={`${
                filters.isTire === true
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Tires
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, isTire: false, page: 1 }))}
              className={`${
                filters.isTire === false
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Other Items
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 relative w-full">
              <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by SKU, Description, Brand..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-slate-500 mb-1">Size</label>
              <input
                type="text"
                placeholder="e.g. 205/55R16"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.size}
                onChange={(e) => setFilters(prev => ({ ...prev, size: e.target.value, page: 1 }))}
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
              <select
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.locationId}
                onChange={(e) => setFilters(prev => ({ ...prev, locationId: e.target.value, page: 1 }))}
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  checked={filters.inStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked, page: 1 }))}
                />
                <span className="text-sm font-medium text-slate-700">In Stock Only</span>
              </label>
            </div>
          </form>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('tireMasterSku')}>
                    SKU {filters.sortBy === 'tireMasterSku' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('description')}>
                    Description {filters.sortBy === 'description' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('brand')}>
                    Brand {filters.sortBy === 'brand' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('type')}>
                    Type {filters.sortBy === 'type' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('size')}>
                    Size {filters.sortBy === 'size' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-700 text-right">Total Qty</th>
                  <th className="px-6 py-4 font-semibold text-slate-700">Location Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No inventory items found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{item.tireMasterSku}</td>
                      <td className="px-6 py-4 text-slate-600">{item.description}</td>
                      <td className="px-6 py-4 text-slate-600">{item.brand}</td>
                      <td className="px-6 py-4 text-slate-600">{formatType(item.type)}</td>
                      <td className="px-6 py-4 text-slate-600">{item.size}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {getTotalQuantity(item)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {item.inventory.map((inv, idx) => (
                            inv.quantity > 0 && (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
                                {inv.location.name}: {inv.quantity}
                              </span>
                            )
                          ))}
                          {item.inventory.every(i => i.quantity === 0) && (
                            <span className="text-slate-400 italic text-xs">Out of stock</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, meta.total)} of {meta.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= meta.totalPages}
                className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
