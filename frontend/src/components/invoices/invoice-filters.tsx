'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  User,
  Building2,
  Filter,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface InvoiceFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onFiltersChange: (filters: any) => void;
  initialFilters?: any;
  className?: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function InvoiceFilters({
  isOpen,
  onClose,
  onFiltersChange,
  initialFilters = {},
  className = ''
}: InvoiceFiltersProps) {
  const [filters, setFilters] = useState({
    search: '',
    customerId: '',
    customerName: '',
    salesperson: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    importBatchId: '',
    ...initialFilters
  });

  // Customers for autocomplete
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Salespeople for autocomplete
  const [salespeople, setSalespeople] = useState<string[]>([]);
  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    customer: true,
    amount: true,
    date: true,
    status: true,
    advanced: false
  });

  // Load customers for autocomplete
  const loadCustomers = async (search: string) => {
    try {
      const response = await fetch(`/api/v1/customers/search/autocomplete?q=${encodeURIComponent(search)}&limit=20`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCustomers(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  // Load salespeople for autocomplete
  const loadSalespeople = async () => {
    try {
      const response = await fetch('/api/v1/invoices/analytics/salespeople');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSalespeople(result.data.map((sp: any) => sp.salesperson));
        }
      }
    } catch (error) {
      console.error('Failed to load salespeople:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSalespeople();
    }
  }, [isOpen]);

  // Handle customer search
  const handleCustomerSearch = (search: string) => {
    setCustomerSearch(search);
    if (search.length > 2) {
      loadCustomers(search);
      setShowCustomerDropdown(true);
    } else {
      setShowCustomerDropdown(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  // Apply filters
  const applyFilters = () => {
    // Clean up empty values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    );

    onFiltersChange(cleanFilters);
    onClose();
  };

  // Reset filters
  const resetFilters = () => {
    const resetState = {
      search: '',
      customerId: '',
      customerName: '',
      salesperson: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      importBatchId: '',
    };
    setFilters(resetState);
    onFiltersChange(resetState);
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Quick date presets
  const setQuickDate = (preset: string) => {
    const now = new Date();
    let dateFrom = '';
    let dateTo = '';

    switch (preset) {
      case 'today':
        dateFrom = now.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;
      case 'this_week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        dateFrom = weekStart.toISOString().split('T')[0];
        dateTo = weekEnd.toISOString().split('T')[0];
        break;
      case 'this_month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'last_3_months':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
        dateTo = new Date().toISOString().split('T')[0];
        break;
      case 'this_year':
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
    }

    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
  };

  // Section header component
  const SectionHeader = ({ title, section, icon: Icon }: { title: string; section: string; icon: any }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-600" />
        <span>{title}</span>
      </div>
      {expandedSections[section as keyof typeof expandedSections] ? (
        <ChevronUp className="h-4 w-4 text-gray-400" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filter Invoices</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Filters Content */}
          <div className="flex-1 overflow-y-auto">
            {/* General Search */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            {/* Customer Filters */}
            <div className="border-b border-gray-200">
              <SectionHeader title="Customer" section="customer" icon={User} />
              {expandedSections.customer && (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search customers..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={customerSearch}
                        onChange={(e) => handleCustomerSearch(e.target.value)}
                        onFocus={() => customerSearch.length > 2 && setShowCustomerDropdown(true)}
                      />
                      {showCustomerDropdown && customers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {customers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => {
                                handleFilterChange('customerId', customer.id);
                                handleFilterChange('customerName', customer.name);
                                setCustomerSearch(customer.name);
                                setShowCustomerDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                            >
                              {customer.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Amount Filters */}
            <div className="border-b border-gray-200">
              <SectionHeader title="Amount Range" section="amount" icon={DollarSign} />
              {expandedSections.amount && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Amount
                      </label>
                      <input
                        type="number"
                        placeholder="9999.99"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick amount ranges */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Ranges
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          handleFilterChange('minAmount', '0');
                          handleFilterChange('maxAmount', '100');
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        $0 - $100
                      </button>
                      <button
                        onClick={() => {
                          handleFilterChange('minAmount', '100');
                          handleFilterChange('maxAmount', '500');
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        $100 - $500
                      </button>
                      <button
                        onClick={() => {
                          handleFilterChange('minAmount', '500');
                          handleFilterChange('maxAmount', '1000');
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        $500 - $1K
                      </button>
                      <button
                        onClick={() => {
                          handleFilterChange('minAmount', '1000');
                          handleFilterChange('maxAmount', '');
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        $1K+
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Date Filters */}
            <div className="border-b border-gray-200">
              <SectionHeader title="Date Range" section="date" icon={Calendar} />
              {expandedSections.date && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateTo}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick date presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Dates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setQuickDate('today')}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setQuickDate('this_week')}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        This Week
                      </button>
                      <button
                        onClick={() => setQuickDate('this_month')}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        This Month
                      </button>
                      <button
                        onClick={() => setQuickDate('last_month')}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Last Month
                      </button>
                      <button
                        onClick={() => setQuickDate('last_3_months')}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Last 3 Months
                      </button>
                      <button
                        onClick={() => setQuickDate('this_year')}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        This Year
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Filters */}
            <div className="border-b border-gray-200">
              <SectionHeader title="Status & Details" section="status" icon={Building2} />
              {expandedSections.status && (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="VOIDED">Voided</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salesperson
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search salespeople..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={salespersonSearch}
                        onChange={(e) => setSalespersonSearch(e.target.value)}
                        onFocus={() => setShowSalespersonDropdown(true)}
                      />
                      {showSalespersonDropdown && salespeople.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {salespeople
                            .filter(sp => sp.toLowerCase().includes(salespersonSearch.toLowerCase()))
                            .map((salesperson) => (
                              <button
                                key={salesperson}
                                onClick={() => {
                                  handleFilterChange('salesperson', salesperson);
                                  setSalespersonSearch(salesperson);
                                  setShowSalespersonDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                              >
                                {salesperson}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            <div className="border-b border-gray-200">
              <SectionHeader title="Advanced" section="advanced" icon={Filter} />
              {expandedSections.advanced && (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Import Batch ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter batch ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.importBatchId}
                      onChange={(e) => handleFilterChange('importBatchId', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Filters</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}