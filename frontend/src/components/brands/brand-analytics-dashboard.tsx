import React, { useState, useEffect } from 'react';
import { brandApi, Brand, BrandAnalytics, BrandLeaderboardItem, BrandSizeComparisonItem } from '../../services/brand-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658', '#8dd1e1'];

type Tab = 'analytics' | 'leaderboard' | 'size-comparison';

export const BrandAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [analytics, setAnalytics] = useState<BrandAnalytics | null>(null);
  const [leaderboard, setLeaderboard] = useState<BrandLeaderboardItem[]>([]);
  const [sizeComparison, setSizeComparison] = useState<BrandSizeComparisonItem[]>([]);
  const [searchSize, setSearchSize] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && selectedBrand) {
      loadAnalytics(selectedBrand);
    } else if (activeTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [activeTab, selectedBrand]);

  const loadBrands = async () => {
    try {
      const data = await brandApi.getBrands();
      setBrands(data);
      if (data.length > 0) {
        setSelectedBrand(data[0].name);
      }
    } catch (err) {
      console.error('Failed to load brands', err);
      setError('Failed to load brands');
    }
  };

  const loadAnalytics = async (brand: string) => {
    setLoading(true);
    try {
      const data = await brandApi.getBrandAnalytics(brand);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load analytics', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await brandApi.getBrandLeaderboard();
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSizeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSize) return;
    
    setLoading(true);
    try {
      const data = await brandApi.getBrandsBySize(searchSize);
      setSizeComparison(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load size comparison', err);
      setError('Failed to load size comparison');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Brand Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('size-comparison')}
            className={`px-4 py-2 rounded ${activeTab === 'size-comparison' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Size Comparison
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && (
        <>
          <div className="flex justify-end">
            <select
              className="border rounded p-2"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              {brands.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.productCount} products)
                </option>
              ))}
            </select>
          </div>

          {loading || !analytics ? (
            <div className="flex justify-center p-12">Loading...</div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-gray-500 text-sm">Inventory Count</h3>
                  <p className="text-2xl font-bold text-blue-600">{analytics.overview.inventoryCount}</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-gray-500 text-sm">Total Sales</h3>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.overview.totalSales)}</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-gray-500 text-sm">Total Profit</h3>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.overview.totalProfit)}</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-gray-500 text-sm">Units Sold</h3>
                  <p className="text-2xl font-bold">{analytics.overview.totalUnits}</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-gray-500 text-sm">Transactions</h3>
                  <p className="text-2xl font-bold">{analytics.overview.transactionCount}</p>
                </div>
              </div>

              {analytics.overview.totalSales === 0 && analytics.overview.inventoryCount > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                  <p className="text-blue-700">
                    No sales data found for this brand in the selected period, but inventory exists.
                  </p>
                </div>
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-lg font-semibold mb-4">Monthly Sales Trend</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="profit" name="Profit" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Size Distribution */}
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-lg font-semibold mb-4">Top Sizes by Units</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.sizeDistribution.slice(0, 10)}
                          dataKey="units"
                          nameKey="size"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analytics.sizeDistribution.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Top SKUs Table */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-4">Top Performing SKUs</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.topSkus.map((sku) => (
                        <tr key={sku.productCode}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sku.productCode}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sku.product?.size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sku.product?.description || sku.product?.pattern || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{sku.totalUnits}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(sku.totalSales)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(sku.totalProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Brand Leaderboard</h3>
          {loading ? (
            <div className="flex justify-center p-12">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((item, index) => (
                    <tr key={item.brand}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.brand}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.totalSales)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(item.totalProfit)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalUnits}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'size-comparison' && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Size Comparison</h3>
          <form onSubmit={handleSizeSearch} className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Enter tire size (e.g., 205/55R16)"
              className="border rounded p-2 flex-grow"
              value={searchSize}
              onChange={(e) => setSearchSize(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Compare
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center p-12">Loading...</div>
          ) : sizeComparison.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sizeComparison.map((item) => (
                    <tr key={item.brand}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.brand}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalUnits}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.totalSales)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(item.totalProfit)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.averagePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              {searchSize ? 'No data found for this size' : 'Enter a size to compare brands'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
