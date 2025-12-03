'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import StoreCard from '@/components/stores/store-card';
import StoreComparisonCharts from '@/components/stores/store-comparison-charts';
import DateRangePicker from '@/components/shared/date-range-picker';
import { Store as StoreIcon } from 'lucide-react';

interface Store {
  id: string;
  code: string;
  name: string;
  _count?: {
    employees: number;
  };
  stats?: {
    revenueYTD: number;
    grossProfitYTD: number;
  };
}

export default function StoresPage() {
  const { token } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Range State (Default to Year to Date)
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date()
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        
        // Fetch Stores (only once ideally, but okay here)
        const res = await fetch('/api/v1/stores', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (data.success) {
          setStores(data.data);
        } else {
          setError(data.error || 'Failed to fetch stores');
        }

        // Fetch Comparison Data
        const params = new URLSearchParams();
        if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
        if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());

        const compRes = await fetch(`/api/v1/stores/analytics/comparison?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const compData = await compRes.json();
        
        if (compData.success) {
          setComparisonData(compData.data);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('An error occurred while fetching data');
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, token]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <StoreIcon className="w-8 h-8 mr-3 text-indigo-600" />
              Store Dashboard
            </h1>
            <p className="text-gray-500 mt-1 ml-11">Overview of all store locations</p>
          </div>
          
          <div>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              presets={[
                {
                  label: 'Last 30 Days',
                  value: {
                    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
                    endDate: new Date()
                  }
                },
                {
                  label: 'Last 90 Days',
                  value: {
                    startDate: new Date(new Date().setDate(new Date().getDate() - 90)),
                    endDate: new Date()
                  }
                },
                {
                  label: 'Year to Date',
                  value: {
                    startDate: new Date(new Date().getFullYear(), 0, 1),
                    endDate: new Date()
                  }
                },
                {
                  label: 'Last Year',
                  value: {
                    startDate: new Date(new Date().getFullYear() - 1, 0, 1),
                    endDate: new Date(new Date().getFullYear() - 1, 11, 31)
                  }
                }
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <>
            <StoreComparisonCharts 
              data={comparisonData} 
              storeNames={stores.map(s => s.name)} 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
