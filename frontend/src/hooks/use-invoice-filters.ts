// Invoice Filtering and Pagination Hooks
// T063: Create pagination and filtering hooks for state management

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoiceApi, InvoiceFilters, InvoiceSummary, InvoiceListResponse } from '../services/invoice-api';

export interface UseInvoiceFiltersState {
  invoices: InvoiceSummary[];
  loading: boolean;
  error: string | null;
  filters: InvoiceFilters;
  pagination: {
    total: number;
    hasMore: boolean;
    offset: number;
    limit: number;
    currentPage: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    averageAmount: number;
  };
}

export interface UseInvoiceFiltersActions {
  setFilters: (filters: Partial<InvoiceFilters>) => void;
  updateFilter: (key: keyof InvoiceFilters, value: any) => void;
  clearFilters: () => void;
  loadMore: () => void;
  goToPage: (page: number) => void;
  refresh: () => void;
  search: (query: string) => void;
  sortBy: (field: string, order?: 'asc' | 'desc') => void;
}

export interface UseInvoiceFiltersOptions {
  initialFilters?: Partial<InvoiceFilters>;
  autoLoad?: boolean;
  debounceMs?: number;
  pageSize?: number;
}

const DEFAULT_FILTERS: InvoiceFilters = {
  search: '',
  offset: 0,
  limit: 25,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function useInvoiceFilters(options: UseInvoiceFiltersOptions = {}) {
  const {
    initialFilters = {},
    autoLoad = true,
    debounceMs = 300,
    pageSize = 25
  } = options;

  const [state, setState] = useState<UseInvoiceFiltersState>({
    invoices: [],
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
      totalAmount: 0,
      averageAmount: 0,
    },
  });

  // Debounced loading function
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const loadInvoices = useCallback(async (filters: InvoiceFilters, append = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await invoiceApi.getInvoices(filters);

      if (response.success && response.data) {
        const data = response.data;
        const currentPage = Math.floor(filters.offset! / filters.limit!) + 1;
        const totalPages = Math.ceil(data.total / filters.limit!);

        setState(prev => ({
          ...prev,
          invoices: append ? [...prev.invoices, ...data.invoices] : data.invoices,
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
            totalAmount: data.totalAmount,
            averageAmount: data.averageAmount,
          },
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to load invoices',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load invoices',
      }));
    }
  }, []);

  const debouncedLoad = useCallback((filters: InvoiceFilters) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      loadInvoices(filters);
    }, debounceMs);

    setDebounceTimeout(timeout);
  }, [debounceTimeout, debounceMs, loadInvoices]);

  // Actions
  const setFilters = useCallback((newFilters: Partial<InvoiceFilters>) => {
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

  const updateFilter = useCallback((key: keyof InvoiceFilters, value: any) => {
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

    loadInvoices(clearedFilters);
  }, [pageSize, loadInvoices]);

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

    loadInvoices(nextFilters, true);
  }, [state.filters, state.pagination.hasMore, state.loading, loadInvoices]);

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

    loadInvoices(nextFilters);
  }, [state.pagination.totalPages, state.filters.limit, state.loading, loadInvoices]);

  const refresh = useCallback(() => {
    loadInvoices(state.filters);
  }, [state.filters, loadInvoices]);

  const search = useCallback((query: string) => {
    setFilters({ search: query });
  }, [setFilters]);

  const sortBy = useCallback((field: string, order: 'asc' | 'desc' = 'desc') => {
    setFilters({ sortBy: field, sortOrder: order });
  }, [setFilters]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadInvoices(state.filters);
    }

    // Cleanup debounce timeout on unmount
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, []); // Only run on mount

  const actions: UseInvoiceFiltersActions = useMemo(() => ({
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

// Specialized hook for invoice search/autocomplete
export function useInvoiceSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; invoiceNumber: string; totalAmount: number; customerName?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await invoiceApi.searchInvoices(searchQuery, 10);

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Invoice search failed:', error);
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

// Hook for invoice statistics
export function useInvoiceStats(customerId?: string) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await invoiceApi.getInvoiceStatistics(customerId);

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
  }, [customerId]);

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

// Hook for invoice trends
export function useInvoiceTrends(
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  dateFrom: string,
  dateTo: string,
  customerId?: string
) {
  const [trends, setTrends] = useState<Array<{
    period: string;
    invoiceCount: number;
    totalAmount: number;
    averageAmount: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    try {
      setLoading(true);
      setError(null);

      const response = await invoiceApi.getInvoiceTrends(period, dateFrom, dateTo, customerId);

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
  }, [period, dateFrom, dateTo, customerId]);

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