'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import StoreStats from '@/components/stores/store-stats';
import StoreEmployeeList from '@/components/stores/store-employee-list';
import StoreAnalyticsCharts from '@/components/stores/store-analytics-charts';
import DateRangePicker from '@/components/shared/date-range-picker';
import { Store as StoreIcon, ArrowLeft } from 'lucide-react';

interface Store {
  id: string;
  code: string;
  name: string;
}

interface StoreStatsData {
  period: string;
  totalRevenue: number;
  totalGrossProfit: number;
  invoiceCount: number;
  averageTicket: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isMechanic: boolean;
  status: string;
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<StoreStatsData | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date Range State
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });

  useEffect(() => {
    if (!id || !token) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch Store Details (only if not already loaded)
        if (!store) {
          const storeRes = await fetch(`http://localhost:3001/api/v1/stores/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const storeData = await storeRes.json();
          if (!storeData.success) throw new Error(storeData.error);
          setStore(storeData.data);
        }

        // Build query params for stats
        const params = new URLSearchParams();
        if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
        if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());

        // Fetch Stats
        const statsRes = await fetch(`http://localhost:3001/api/v1/stores/${id}/stats?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);

        // Fetch Analytics
        const analyticsRes = await fetch(`http://localhost:3001/api/v1/stores/${id}/analytics?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) setAnalytics(analyticsData.data);

        // Fetch Employees (only if not already loaded)
        if (employees.length === 0) {
          const empRes = await fetch(`http://localhost:3001/api/v1/stores/${id}/employees`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const empData = await empRes.json();
          if (empData.success) setEmployees(empData.data);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load store data');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, dateRange, token]); // Re-fetch when dateRange or token changes

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !store) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error || 'Store not found'}</span>
          </div>
          <button
            onClick={() => router.push('/stores')}
            className="mt-4 flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stores
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/stores')}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <StoreIcon className="w-8 h-8 mr-3 text-indigo-600" />
              {store.name}
            </h1>
            <p className="text-sm text-gray-500 ml-11">Store #{store.code}</p>
          </div>
          
          <div className="ml-auto">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              presets={[
                {
                  label: 'Month to Date',
                  value: {
                    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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
                  label: 'Last Month',
                  value: {
                    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                    endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
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

        {stats && <StoreStats stats={stats} />}

        {analytics && <StoreAnalyticsCharts data={analytics} />}

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staffing</h2>
          <StoreEmployeeList employees={employees} />
        </div>
      </div>
    </DashboardLayout>
  );
}
