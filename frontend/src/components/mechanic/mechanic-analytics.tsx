import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface MechanicAnalyticsData {
  mechanicName: string;
  totalLabor: number;
  totalGrossProfit: number;
  totalBilledHours: number;
  firstSeen: string;
  lastSeen: string;
  businessHoursAvailable: number;
  laborPerHour: number;
  profitPerHour: number;
  efficiency: number;
}

type SortKey = 'mechanicName' | 'businessHoursAvailable' | 'totalBilledHours' | 'efficiency' | 'laborPerHour' | 'profitPerHour';
type SortDirection = 'asc' | 'desc';

export default function MechanicAnalytics() {
  const [data, setData] = useState<MechanicAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('profitPerHour');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/mechanic/analytics')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue) || 0;
      const numB = Number(bValue) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [data, sortKey, sortDirection]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-indigo-600" />
      : <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Top 10: Profit per Business Hour</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={[...data].sort((a, b) => b.profitPerHour - a.profitPerHour).slice(0, 10)} 
                layout="vertical" 
                margin={{ left: 40, right: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="mechanicName" type="category" width={140} tick={{fontSize: 11}} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit/Hr']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="profitPerHour" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Top 10: Labor Revenue per Business Hour</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={[...data].sort((a, b) => b.laborPerHour - a.laborPerHour).slice(0, 10)} 
                layout="vertical" 
                margin={{ left: 40, right: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="mechanicName" type="category" width={140} tick={{fontSize: 11}} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Labor/Hr']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="laborPerHour" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h3>
          <p className="text-sm text-gray-500 mt-1">
            Metrics calculated based on business hours (M-F 7am-5pm, Sat 7am-12pm) during the mechanic's active period.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('mechanicName')}
                >
                  <div className="flex items-center">
                    Mechanic
                    <SortIcon column="mechanicName" />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Active Period</th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('businessHoursAvailable')}
                >
                  <div className="flex items-center justify-end">
                    Business Hours
                    <SortIcon column="businessHoursAvailable" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalBilledHours')}
                >
                  <div className="flex items-center justify-end">
                    Billed Hours
                    <SortIcon column="totalBilledHours" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('efficiency')}
                >
                  <div className="flex items-center justify-end">
                    Efficiency
                    <SortIcon column="efficiency" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('laborPerHour')}
                >
                  <div className="flex items-center justify-end">
                    Labor / Hr
                    <SortIcon column="laborPerHour" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('profitPerHour')}
                >
                  <div className="flex items-center justify-end">
                    Profit / Hr
                    <SortIcon column="profitPerHour" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item) => (
                <tr key={item.mechanicName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.mechanicName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {new Date(item.firstSeen).toLocaleDateString()} - {new Date(item.lastSeen).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.businessHoursAvailable}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.totalBilledHours.toFixed(1)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.efficiency > 100 ? 'bg-green-100 text-green-800' : 
                      item.efficiency > 75 ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.efficiency.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${item.laborPerHour.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">${item.profitPerHour.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
