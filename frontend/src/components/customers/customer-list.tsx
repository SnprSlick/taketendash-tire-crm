'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  RefreshCw,
  Plus,
  Building2,
  DollarSign
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerListProps {
  showFilters?: boolean;
  onFilterToggle?: () => void;
  onCreateCustomer?: () => void;
  className?: string;
}

interface CustomerFilters {
  search?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  offset?: number;
  limit?: number;
}

export default function CustomerList({
  showFilters = true,
  onFilterToggle,
  onCreateCustomer,
  className = ''
}: CustomerListProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    offset: 0,
    limit: 25,
  });

  // Quick filters
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load customers
  const loadCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, value.toString());
        }
      });

      if (selectedContactFilter) {
        if (selectedContactFilter === 'email') params.append('hasEmail', 'true');
        if (selectedContactFilter === 'phone') params.append('hasPhone', 'true');
      }

      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/v1/customers?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to load customers: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setCustomers(result.data.customers || []);
        setTotal(result.data.total || 0);
      } else {
        throw new Error(result.message || 'Failed to load customers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load customers on mount and filter changes
  useEffect(() => {
    loadCustomers();
  }, [filters, selectedContactFilter, selectedDateRange, sortBy, sortOrder]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setFilters(prev => ({
      ...prev,
      offset: (page - 1) * pageSize,
    }));
  };

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      offset: 0,
    }));
    setCurrentPage(1);
  };

  // Handle quick date filters
  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range);

    let createdAfter = '';
    let createdBefore = '';
    const now = new Date();

    switch (range) {
      case 'today':
        createdAfter = now.toISOString().split('T')[0];
        createdBefore = now.toISOString().split('T')[0];
        break;
      case 'this_week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        createdAfter = weekStart.toISOString().split('T')[0];
        createdBefore = weekEnd.toISOString().split('T')[0];
        break;
      case 'this_month':
        createdAfter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        createdBefore = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        createdAfter = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        createdBefore = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
    }

    setFilters(prev => ({
      ...prev,
      createdAfter,
      createdBefore,
      offset: 0,
    }));
    setCurrentPage(1);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Contact Info Component
  const ContactInfo = ({ customer }: { customer: Customer }) => (
    <div className="space-y-1">
      {customer.email && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Mail className="h-3 w-3" />
          <a
            href={`mailto:${customer.email}`}
            className="hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {customer.email}
          </a>
        </div>
      )}
      {customer.phone && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Phone className="h-3 w-3" />
          <a
            href={`tel:${customer.phone}`}
            className="hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {customer.phone}
          </a>
        </div>
      )}
      {customer.address && (
        <div className="flex items-start gap-1 text-sm text-gray-600">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="truncate">{customer.address}</span>
        </div>
      )}
    </div>
  );

  // Calculate pagination
  const totalPages = Math.ceil(total / pageSize);
  const hasMore = total > currentPage * pageSize;
  const startItem = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
            <p className="text-sm text-gray-500">
              {total > 0 ? `Showing ${startItem} to ${endItem} of ${total} customers` : 'No customers found'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* Create Customer */}
            <button
              onClick={onCreateCustomer || (() => router.push('/customers/new'))}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Customer</span>
            </button>

            {/* Filter Toggle */}
            {showFilters && (
              <button
                onClick={onFilterToggle}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={loadCustomers}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Contact Filter */}
          <select
            value={selectedContactFilter}
            onChange={(e) => setSelectedContactFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Customers</option>
            <option value="email">Has Email</option>
            <option value="phone">Has Phone</option>
            <option value="both">Has Email & Phone</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={selectedDateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Time</option>
            <option value="today">Added Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              const newPageSize = parseInt(e.target.value);
              setPageSize(newPageSize);
              setFilters(prev => ({ ...prev, limit: newPageSize, offset: 0 }));
              setCurrentPage(1);
            }}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading customers...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">Error loading customers</div>
              <div className="text-sm text-gray-500 mb-4">{error}</div>
              <button
                onClick={loadCustomers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div className="mb-2">No customers found</div>
              <div className="text-sm mb-4">Get started by adding your first customer</div>
              <button
                onClick={onCreateCustomer || (() => router.push('/customers/new'))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Customer
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Customer
                        {sortBy === 'name' && (
                          <span className="text-blue-500">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Information
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Code
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Added
                        {sortBy === 'createdAt' && (
                          <span className="text-blue-500">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ContactInfo customer={customer} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.customerCode || (
                            <span className="text-gray-400 italic">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(customer.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/customers/${customer.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Customer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/customers/${customer.id}/edit`);
                            }}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {startItem} to {endItem} of {total} results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}