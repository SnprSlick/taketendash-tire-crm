'use client';

import { useState, useEffect, useCallback } from 'react';

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface SalesInsight {
  type: string;
  title: string;
  description: string;
  impact: string;
}

interface KPI {
  name: string;
  value: string | number;
  trend: string;
}

interface AnalyticsResponse {
  basicAnalytics: SalesData;
  insights: SalesInsight[];
  kpis: KPI[];
}

interface UseSalesUpdatesReturn {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

export function useSalesUpdates(refreshInterval: number = 30000): UseSalesUpdatesReturn {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const query = `
        query {
          enhancedAnalytics {
            basicAnalytics {
              totalSales
              totalRevenue
              averageOrderValue
            }
            insights {
              type
              title
              description
              impact
            }
            kpis {
              name
              value
              trend
            }
          }
        }
      `;

      const response = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      setData(result.data.enhancedAnalytics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch sales data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sales data');

      // Set fallback data on error
      if (!data) {
        setData({
          basicAnalytics: {
            totalSales: 50,
            totalRevenue: 125000,
            averageOrderValue: 2500,
          },
          insights: [
            {
              type: 'OPPORTUNITY',
              title: 'Demo Data Active',
              description: 'Backend connection failed, showing fallback data',
              impact: 'INFO',
            },
          ],
          kpis: [
            { name: 'Demo Mode', value: 'Active', trend: 'stable' },
          ],
        });
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [data]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchData, refreshInterval);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, [fetchData, refreshInterval]);

  // Listen for window focus to refresh data
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loading, refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated,
  };
}