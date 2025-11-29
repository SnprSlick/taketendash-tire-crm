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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c', '#4f46e5'];

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
  salesHistory?: Array<{ date: string; quantity: number; storeName: string }>;
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
  const [historyCache, setHistoryCache] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [graphOutlook, setGraphOutlook] = useState<number>(365);
  const [smoothingWindow, setSmoothingWindow] = useState<number>(30);
  const [hoveredStore, setHoveredStore] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // Create a stable color map for stores
  const storeColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    // Sort locations by name to ensure consistent order
    const sortedLocs = [...locations].sort((a, b) => a.name.localeCompare(b.name));
    sortedLocs.forEach((loc, idx) => {
      map.set(loc.name, COLORS[idx % COLORS.length]);
    });
    return map;
  }, [locations]);

  const getStoreColor = (storeName: string) => {
    return storeColorMap.get(storeName) || '#9ca3af'; // Default gray if not found
  };

  const generateProjectionData = (currentStock: number, velocity: number, days: number) => {
    const data = [];
    // Generate points from 'days' ago up to 0 (today)
    // We want the graph to go from Left (Old/Past) to Right (Today)
    const step = Math.max(1, Math.floor(days / 10));
    
    for (let i = days; i >= 0; i -= step) {
      // i represents "days ago"
      // Stock i days ago = Current + (Velocity * i)
      const historicalStock = currentStock + (velocity * i);
      
      data.push({
        day: i === 0 ? 'Today' : `${i} Days Ago`,
        rawDay: -i, // Use this for XAxis if we want numeric scale, or just use categorical
        stock: Math.round(historicalStock)
      });
    }
    
    // Ensure 0/Today is included exactly if step skipped it
    if (data[data.length - 1].day !== 'Today') {
       data.push({
        day: 'Today',
        rawDay: 0,
        stock: Math.round(currentStock)
      });
    }
    
    // Sort by rawDay ascending (-365 -> 0)
    return data.sort((a, b) => a.rawDay - b.rawDay);
  };

  const processSalesHistory = (history: { date: string; quantity: number; storeName: string }[] | undefined, days: number, windowSize: number) => {
    if (!history) return { data: [], stores: [] };
    
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    // 1. Organize raw data by Date -> Store -> Quantity
    const rawDataMap = new Map<string, Map<string, number>>();
    const allStores = new Set<string>();

    history.forEach(h => {
      if (!rawDataMap.has(h.date)) {
        rawDataMap.set(h.date, new Map());
      }
      rawDataMap.get(h.date)!.set(h.storeName, h.quantity);
      allStores.add(h.storeName);
    });

    const sortedStores = Array.from(allStores).sort();
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const d = new Date(utcToday);
      d.setUTCDate(utcToday.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayData: any = {
        date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
        fullDate: dateStr
      };

      // Calculate Moving Average for each store
      sortedStores.forEach(store => {
        let sum = 0;
        let count = 0;
        
        // Look back 'windowSize' days from current 'd'
        for (let w = 0; w < windowSize; w++) {
            const lookbackDate = new Date(d);
            lookbackDate.setUTCDate(d.getUTCDate() - w);
            const lookbackDateStr = lookbackDate.toISOString().split('T')[0];
            
            const qty = rawDataMap.get(lookbackDateStr)?.get(store) || 0;
            sum += qty;
            count++;
        }
        
        // Simple Moving Average
        dayData[store] = count > 0 ? Number((sum / count).toFixed(2)) : 0;
      });

      data.push(dayData);
    }
    return { data, stores: sortedStores };
  };  const fetchLocations = async () => {
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

  const handleExpand = async (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(productId);

    if (!historyCache[productId]) {
      setLoadingHistory(productId);
      try {
        const res = await fetch(`/api/v1/inventory/analytics/${productId}/history?days=365`);
        if (res.ok) {
          const history = await res.json();
          setHistoryCache(prev => ({ ...prev, [productId]: history }));
        }
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoadingHistory(null);
      }
    }
  };

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
                      onClick={() => handleExpand(item.productId)}
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
                            <div className="flex flex-col lg:flex-row gap-6">
                              {/* Left Column: Store Breakdown Table */}
                              <div className="w-full lg:w-1/2">
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold text-gray-900">Store Breakdown</h4>
                                </div>
                                <div className="w-full overflow-hidden border rounded-lg">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity</th>
                                        <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Restock</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {item.inventoryBreakdown.map((loc, idx) => {
                                        const isHighlighted = (hoveredStore === loc.location) || (selectedStore === loc.location);
                                        const isDimmed = (hoveredStore || selectedStore) && !isHighlighted;
                                        
                                        return (
                                          <tr 
                                            key={idx} 
                                            className={`transition-all duration-300 ease-in-out cursor-pointer ${isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'} ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                                            onMouseEnter={() => setHoveredStore(loc.location)}
                                            onMouseLeave={() => setHoveredStore(null)}
                                            onClick={() => setSelectedStore(selectedStore === loc.location ? null : loc.location)}
                                          >
                                            <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-l-4 ${isHighlighted ? 'font-bold' : ''}`} style={{ borderLeftColor: getStoreColor(loc.location) }}>
                                              {loc.location}
                                            </td>
                                            <td className={`px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 font-medium ${isHighlighted ? 'font-bold' : ''}`}>
                                              {loc.quantity}
                                            </td>
                                            <td className={`px-4 py-2 whitespace-nowrap text-sm text-right text-gray-400 ${isHighlighted ? 'font-bold text-gray-900' : ''}`}>
                                              {loc.velocity?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-bold ${loc.suggestedRestock > 0 ? 'text-red-600' : 'text-green-600'} ${isHighlighted ? 'text-base' : ''}`}>
                                              {loc.suggestedRestock || 0}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Right Column: Sales Graph */}
                              <div className="w-full lg:w-1/2">
                                <div className="flex flex-col gap-4 mb-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-gray-900">Sales Velocity History</h4>
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                                      {[90, 180, 365].map(d => (
                                        <button
                                          key={d}
                                          onClick={() => setGraphOutlook(d)}
                                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            graphOutlook === d ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                          }`}
                                        >
                                          {d} Days
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Smoothing Control */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Smoothing:</span>
                                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                      {[1, 7, 15, 30].map(w => (
                                        <button
                                          key={w}
                                          onClick={() => setSmoothingWindow(w)}
                                          className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                                            smoothingWindow === w ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                          }`}
                                        >
                                          {w}d Avg
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="h-64 w-full border rounded-lg p-4 bg-white relative">
                                  <style>{`
                                    .recharts-line-curve {
                                      transition: stroke-width 0.3s ease, stroke-opacity 0.3s ease;
                                    }
                                  `}</style>
                                  {loadingHistory === item.productId ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                  ) : null}
                                  <ResponsiveContainer width="100%" height="100%">
                                    {(() => {
                                      const history = historyCache[item.productId] || item.salesHistory;
                                      const { data, stores } = processSalesHistory(history, graphOutlook, smoothingWindow);
                                      
                                      // Calculate max value for dynamic scaling
                                      const maxValue = data.reduce((max, point) => {
                                        const pointMax = stores.reduce((m, store) => Math.max(m, Number(point[store] || 0)), 0);
                                        return Math.max(max, pointMax);
                                      }, 0);
                                      
                                      // Start with 0-1 scale, otherwise max + 0.25
                                      const yDomainMax = Math.max(1, maxValue + 0.25);

                                      return (
                                        <LineChart data={data}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} />
                                          <YAxis 
                                            tick={{ fontSize: 10 }} 
                                            domain={[0, yDomainMax]}
                                            allowDecimals={true}
                                            tickFormatter={(val) => val.toFixed(2)}
                                          />
                                          <Tooltip 
                                            contentStyle={{ fontSize: '12px', padding: '8px 12px' }}
                                            formatter={(value: number) => [value.toFixed(2), '']}
                                          />
                                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                                          {stores.map((store, idx) => {
                                            const isHighlighted = (hoveredStore === store) || (selectedStore === store);
                                            const isDimmed = (hoveredStore || selectedStore) && !isHighlighted;
                                            
                                            return (
                                              <Line 
                                                key={store}
                                                type="monotone" 
                                                dataKey={store} 
                                                stroke={getStoreColor(store)} 
                                                strokeWidth={isHighlighted ? 4 : 2} 
                                                strokeOpacity={isDimmed ? 0.1 : 1}
                                                dot={false} 
                                                activeDot={{ r: isHighlighted ? 6 : 4 }}
                                                name={store}
                                              />
                                            );
                                          })}
                                        </LineChart>
                                      );
                                    })()}
                                  </ResponsiveContainer>
                                </div>
                              </div>
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
