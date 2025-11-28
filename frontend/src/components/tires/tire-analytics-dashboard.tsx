
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import tireAnalyticsApi, { FilterOptions, TireAnalyticsFilter, TireAnalyticsResult, TireTrendResult } from '../../services/tire-analytics-api';
import { TireFilterBar } from './tire-filter-bar';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export const TireAnalyticsDashboard: React.FC = () => {
  const [filter, setFilter] = useState<TireAnalyticsFilter>({
    groupBy: 'brand'
  });
  const [data, setData] = useState<TireAnalyticsResult[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [options, setOptions] = useState<FilterOptions>({ brands: [], types: [], sizes: [], qualities: [], stores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadOptions = async () => {
    try {
      const opts = await tireAnalyticsApi.getOptions();
      // Ensure Unknown is filtered out (in case backend isn't updated yet)
      opts.brands = opts.brands.filter(b => b !== 'Unknown' && b !== '');
      setOptions(opts);
    } catch (error) {
      console.error('Failed to load options', error);
      setError('Failed to load filter options. Please try again.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [results, trends] = await Promise.all([
        tireAnalyticsApi.getAnalytics(filter),
        tireAnalyticsApi.getTrends(filter)
      ]);
      setData(results);
      processTrendData(trends);
    } catch (error) {
      console.error('Failed to load analytics', error);
      setError('Failed to load analytics data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const processTrendData = (trends: TireTrendResult[]) => {
    // Pivot data: { date: '2023-01-01', 'BrandA': 10, 'BrandB': 5 }
    const pivoted: any = {};
    
    trends.forEach(t => {
      const dateKey = new Date(t.date).toLocaleDateString();
      if (!pivoted[dateKey]) {
        pivoted[dateKey] = { date: dateKey };
      }
      
      let key = 'Unknown';
      if (filter.groupBy === 'brand') key = t.brand || 'Unknown';
      else if (filter.groupBy === 'quality') key = t.quality || 'Unknown';
      else if (filter.groupBy === 'type') key = t.type || 'Unknown';
      else if (filter.groupBy === 'size') key = t.size || 'Unknown';
      else key = t.productCode || 'Unknown';

      if (key !== 'Unknown') {
        pivoted[dateKey][key] = (pivoted[dateKey][key] || 0) + t.unitsSold;
      }
    });

    setTrendData(Object.values(pivoted).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };

  const getGroupKey = (item: TireAnalyticsResult) => {
    if (filter.groupBy === 'brand') return item.brand;
    if (filter.groupBy === 'quality') return item.quality;
    if (filter.groupBy === 'type') return item.type;
    if (filter.groupBy === 'size') return item.size;
    return item.productCode;
  };

  const chartData = data
    .filter(item => {
      const key = getGroupKey(item);
      return key && key !== 'Unknown';
    })
    .map(item => ({
    name: getGroupKey(item) || 'Unknown',
    sales: item.unitsSold,
    revenue: item.totalRevenue,
    profit: item.totalProfit,
    velocity: item.velocity.toFixed(2)
  })).slice(0, 20); // Top 20

  // Get keys for trend lines (top 10 from summary data)
  const trendKeys = chartData.map(d => d.name).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Tire Analytics</h2>
        <div className="flex space-x-2">
          <select 
            className="border rounded p-2"
            value={filter.groupBy}
            onChange={(e) => setFilter({ ...filter, groupBy: e.target.value as any })}
          >
            <option value="brand">Group by Brand</option>
            <option value="quality">Group by Quality</option>
            <option value="type">Group by Type</option>
            <option value="size">Group by Size</option>
          </select>
        </div>
      </div>

      <TireFilterBar 
        options={options} 
        filter={filter} 
        onFilterChange={setFilter} 
      />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading analytics...</div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Total Units Sold</div>
              <div className="text-2xl font-bold">{data.reduce((sum, item) => sum + item.unitsSold, 0)}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold">${data.reduce((sum, item) => sum + item.totalRevenue, 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Total Profit</div>
              <div className="text-2xl font-bold text-green-600">${data.reduce((sum, item) => sum + item.totalProfit, 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Avg Margin</div>
              <div className="text-2xl font-bold">
                {(data.reduce((sum, item) => sum + item.totalProfit, 0) / data.reduce((sum, item) => sum + item.totalRevenue, 0) * 100 || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-4">Sales Volume by {filter.groupBy}</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" label={{ value: filter.groupBy, position: 'insideBottom', offset: -10 }} />
                    <YAxis label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="sales" fill="#8884d8" name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-4">Sales Trends Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36}/>
                    {trendKeys.map((key, index) => (
                      <Line 
                        key={key}
                        type="monotone" 
                        dataKey={key} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity (Units/Day)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getGroupKey(item) || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.unitsSold}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${item.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${item.totalProfit.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.margin.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.velocity.toFixed(2)}</td>
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
