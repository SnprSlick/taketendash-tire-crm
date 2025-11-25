import React, { useState } from 'react';
import { brandApi, SizeComparisonItem } from '../../services/brand-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const SizeComparison: React.FC = () => {
  const [size, setSize] = useState('');
  const [comparison, setComparison] = useState<SizeComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!size.trim()) return;

    setLoading(true);
    try {
      const data = await brandApi.getSizeComparison(size);
      setComparison(data);
      setSearched(true);
    } catch (err) {
      console.error('Failed to load size comparison', err);
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Head-to-Head by Size</h2>
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Enter tire size (e.g., 205/55R16)"
            className="flex-1 border rounded px-4 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Compare'}
          </button>
        </form>
      </div>

      {searched && comparison.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No sales data found for size "{size}"
        </div>
      )}

      {comparison.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Share Chart */}
            <div className="bg-white p-4 rounded shadow h-80">
              <h3 className="text-lg font-semibold mb-4">Sales Share by Brand</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="brand" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="totalSales" fill="#0088FE" name="Sales" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Avg Price Chart */}
            <div className="bg-white p-4 rounded shadow h-80">
              <h3 className="text-lg font-semibold mb-4">Average Price by Brand</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="brand" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="avgPrice" fill="#82ca9d" name="Avg Price" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded shadow overflow-hidden">
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
                {comparison.map((item) => (
                  <tr key={item.brand}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalUnits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.totalSales)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(item.totalProfit)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
