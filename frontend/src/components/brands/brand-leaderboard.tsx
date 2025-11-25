import React, { useState, useEffect } from 'react';
import { brandApi, BrandLeaderboardItem } from '../../services/brand-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const BrandLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<BrandLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'sales' | 'profit' | 'units'>('sales');

  useEffect(() => {
    loadLeaderboard();
  }, []);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const sortedData = [...leaderboard].sort((a, b) => {
    if (sortBy === 'sales') return b.totalSales - a.totalSales;
    if (sortBy === 'profit') return b.totalProfit - a.totalProfit;
    if (sortBy === 'units') return b.totalUnits - a.totalUnits;
    return 0;
  });

  const top10 = sortedData.slice(0, 10);

  if (loading) return <div className="p-12 text-center">Loading leaderboard...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Brand Leaderboard</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSortBy('sales')}
            className={`px-3 py-1 rounded ${sortBy === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Sales
          </button>
          <button
            onClick={() => setSortBy('profit')}
            className={`px-3 py-1 rounded ${sortBy === 'profit' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Profit
          </button>
          <button
            onClick={() => setSortBy('units')}
            className={`px-3 py-1 rounded ${sortBy === 'units' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
          >
            Units
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded shadow h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(val) => sortBy === 'units' ? val : `$${val/1000}k`} />
            <YAxis dataKey="brand" type="category" width={100} />
            <Tooltip formatter={(value) => sortBy === 'units' ? value : formatCurrency(Number(value))} />
            <Bar 
              dataKey={sortBy === 'sales' ? 'totalSales' : sortBy === 'profit' ? 'totalProfit' : 'totalUnits'} 
              fill={sortBy === 'sales' ? '#0088FE' : sortBy === 'profit' ? '#00C49F' : '#8884d8'} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Txns</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item, index) => (
              <tr key={item.brand} className={index < 3 ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.brand}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.totalSales)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(item.totalProfit)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalUnits}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.transactionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
