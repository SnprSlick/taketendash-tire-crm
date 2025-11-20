// Customer Filtering and Pagination Hooks
// T063: Create pagination and filtering hooks for customer management

import { useState, useEffect, useCallback, useMemo } from 'react';
import { customerApi, CustomerFilters, CustomerSummary, CustomerListResponse, CustomerStats } from '../services/customer-api';

export interface UseCustomerFiltersState {
  customers: CustomerSummary[];
  loading: boolean;
  error: string | null;
  filters: CustomerFilters;
  pagination: {
    total: number;
    hasMore: boolean;
    offset: number;
    limit: number;
    currentPage: number;
    totalPages: number;
  };
  summary: {
    averageSpent: number;
    totalCustomers: number;
    atRiskCount: number;
  };
}

export interface UseCustomerFiltersActions {
  setFilters: (filters: Partial<CustomerFilters>) => void;
  updateFilter: (key: keyof CustomerFilters, value: any) => void;
  clearFilters: () => void;
  loadMore: () => void;
  goToPage: (page: number) => void;
  refresh: () => void;
  search: (query: string) => void;
  sortBy: (field: string, order?: 'asc' | 'desc') => void;
}

export interface UseCustomerFiltersOptions {
  initialFilters?: Partial<CustomerFilters>;
  autoLoad?: boolean;
  debounceMs?: number;
  pageSize?: number;
}

const DEFAULT_FILTERS: CustomerFilters = {
  search: '',
  offset: 0,
  limit: 25,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function useCustomerFilters(options: UseCustomerFiltersOptions = {}) {
  const {
    initialFilters = {},
    autoLoad = true,
    debounceMs = 300,
    pageSize = 25
  } = options;

  const [state, setState] = useState<UseCustomerFiltersState>({
    customers: [],
    loading: false,
    error: null,
    filters: {
      ...DEFAULT_FILTERS,
      limit: pageSize,
      ...initialFilters,
    },
    pagination: {
      total: 0,
      hasMore: false,
      offset: 0,
      limit: pageSize,
      currentPage: 1,
      totalPages: 0,
    },
    summary: {
      averageSpent: 0,
      totalCustomers: 0,
      atRiskCount: 0,
    },
  });

  // Debounced loading function
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const loadCustomers = useCallback(async (filters: CustomerFilters, append = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await customerApi.getCustomers(filters);

      if (response.success && response.data) {
        const data = response.data;
        const currentPage = Math.floor(filters.offset! / filters.limit!) + 1;
        const totalPages = Math.ceil(data.total / filters.limit!);

        setState(prev => ({
          ...prev,
          customers: append ? [...prev.customers, ...data.customers] : data.customers,
          loading: false,
          pagination: {
            total: data.total,
            hasMore: data.hasMore,
            offset: data.offset,
            limit: data.limit,
            currentPage,
            totalPages,
          },
          summary: {
            averageSpent: data.averageSpent,
            totalCustomers: data.totalCustomers,
            atRiskCount: data.atRiskCount,
          },
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to load customers',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load customers',
      }));
    }
  }, []);

  const debouncedLoad = useCallback((filters: CustomerFilters) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      loadCustomers(filters);
    }, debounceMs);

    setDebounceTimeout(timeout);
  }, [debounceTimeout, debounceMs, loadCustomers]);

  // Actions
  const setFilters = useCallback((newFilters: Partial<CustomerFilters>) => {
    setState(prev => {
      const updatedFilters = {
        ...prev.filters,
        ...newFilters,
        offset: 0, // Reset to first page when filters change
      };

      debouncedLoad(updatedFilters);

      return {
        ...prev,
        filters: updatedFilters,
      };
    });
  }, [debouncedLoad]);

  const updateFilter = useCallback((key: keyof CustomerFilters, value: any) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    const clearedFilters = {
      ...DEFAULT_FILTERS,
      limit: pageSize,
    };

    setState(prev => ({
      ...prev,
      filters: clearedFilters,
    }));

    loadCustomers(clearedFilters);
  }, [pageSize, loadCustomers]);

  const loadMore = useCallback(() => {
    if (!state.pagination.hasMore || state.loading) return;

    const nextFilters = {
      ...state.filters,
      offset: state.filters.offset! + state.filters.limit!,
    };

    setState(prev => ({
      ...prev,
      filters: nextFilters,
    }));

    loadCustomers(nextFilters, true);
  }, [state.filters, state.pagination.hasMore, state.loading, loadCustomers]);

  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > state.pagination.totalPages || state.loading) return;

    const offset = (page - 1) * state.filters.limit!;
    const nextFilters = {
      ...state.filters,
      offset,
    };

    setState(prev => ({
      ...prev,
      filters: nextFilters,
    }));

    loadCustomers(nextFilters);
  }, [state.pagination.totalPages, state.filters.limit, state.loading, loadCustomers]);

  const refresh = useCallback(() => {
    loadCustomers(state.filters);
  }, [state.filters, loadCustomers]);

  const search = useCallback((query: string) => {
    setFilters({ search: query });
  }, [setFilters]);

  const sortBy = useCallback((field: string, order: 'asc' | 'desc' = 'desc') => {
    setFilters({ sortBy: field, sortOrder: order });
  }, [setFilters]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadCustomers(state.filters);
    }

    // Cleanup debounce timeout on unmount
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, []); // Only run on mount

  const actions: UseCustomerFiltersActions = useMemo(() => ({
    setFilters,
    updateFilter,
    clearFilters,
    loadMore,
    goToPage,
    refresh,
    search,
    sortBy,
  }), [setFilters, updateFilter, clearFilters, loadMore, goToPage, refresh, search, sortBy]);

  return [state, actions] as const;
}

// Specialized hook for customer search/autocomplete
export function useCustomerSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; email?: string; phone?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await customerApi.searchCustomers(searchQuery, 10);

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      search(searchQuery);
    }, debounceMs);

    setDebounceTimeout(timeout);
  }, [debounceTimeout, debounceMs, search]);

  useEffect(() => {
    debouncedSearch(query);

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    loading,
    search: debouncedSearch,
  };
}

// Hook for customer statistics
export function useCustomerStats() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await customerApi.getCustomerStatistics();

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load statistics');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  };
}

// Hook for customer trends
export function useCustomerTrends(
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  dateFrom: string,
  dateTo: string
) {
  const [trends, setTrends] = useState<Array<{
    period: string;
    newCustomers: number;
    totalCustomers: number;
    averageSpent: number;
    atRiskCount: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    try {
      setLoading(true);
      setError(null);

      const response = await customerApi.getCustomerTrends(period, dateFrom, dateTo);

      if (response.success && response.data) {
        setTrends(response.data);
      } else {
        setError(response.error || 'Failed to load trends');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return {
    trends,
    loading,
    error,
    refresh: loadTrends,
  };
}

// Hook for at-risk customers
export function useAtRiskCustomers(autoLoad = true) {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAtRiskCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await customerApi.getAtRiskCustomers(50, 0);

      if (response.success && response.data) {
        setCustomers(response.data.customers);
      } else {
        setError(response.error || 'Failed to load at-risk customers');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load at-risk customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadAtRiskCustomers();
    }
  }, [autoLoad, loadAtRiskCustomers]);

  return {
    customers,
    loading,
    error,
    refresh: loadAtRiskCustomers,
  };
}

// Hook for top customers
export function useTopCustomers(
  limit = 10,
  sortBy: 'totalSpent' | 'orderCount' | 'averageOrderValue' = 'totalSpent',
  autoLoad = true
) {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTopCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await customerApi.getTopCustomers(limit, undefined, undefined, sortBy);

      if (response.success && response.data) {
        setCustomers(response.data);
      } else {
        setError(response.error || 'Failed to load top customers');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load top customers');
    } finally {
      setLoading(false);
    }
  }, [limit, sortBy]);

  useEffect(() => {
    if (autoLoad) {
      loadTopCustomers();
    }
  }, [autoLoad, loadTopCustomers]);

  return {
    customers,
    loading,
    error,
    refresh: loadTopCustomers,
  };
}

// Hook for customer loyalty distribution
export function useCustomersByLoyaltyTier(autoLoad = true) {
  const [distribution, setDistribution] = useState<{
    BRONZE: CustomerSummary[];
    SILVER: CustomerSummary[];
    GOLD: CustomerSummary[];
    PLATINUM: CustomerSummary[];
  }>({
    BRONZE: [],
    SILVER: [],
    GOLD: [],
    PLATINUM: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLoyaltyDistribution = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const tiers: ('BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM')[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
      const tierData: typeof distribution = {
        BRONZE: [],
        SILVER: [],
        GOLD: [],
        PLATINUM: [],
      };

      // Load customers for each tier
      await Promise.all(
        tiers.map(async (tier) => {
          const response = await customerApi.getCustomersByLoyaltyTier(tier, 25, 0);
          if (response.success && response.data) {
            tierData[tier] = response.data.customers;
          }
        })
      );

      setDistribution(tierData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load loyalty distribution');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadLoyaltyDistribution();
    }
  }, [autoLoad, loadLoyaltyDistribution]);

  return {
    distribution,
    loading,
    error,
    refresh: loadLoyaltyDistribution,
  };
}