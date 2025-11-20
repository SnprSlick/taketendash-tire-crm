// Customer API Client Service
// T062: Create customer API client service for frontend integration

export interface CustomerFilters {
  search?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  isAtRisk?: boolean;
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  lastOrderFrom?: string;
  lastOrderTo?: string;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  minOrderCount?: number;
  maxOrderCount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  totalSpent: number;
  orderCount: number;
  loyaltyScore: number;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  isAtRisk: boolean;
  riskScore: number;
  lastOrderDate?: string;
  averageOrderValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  totalSpent: number;
  orderCount: number;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  isAtRisk: boolean;
  lastOrderDate?: string;
  createdAt: string;
}

export interface CustomerDetail {
  customer: Customer;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  }>;
  analytics: {
    monthlySpending: Array<{
      month: string;
      amount: number;
      orderCount: number;
    }>;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    loyaltyMetrics: {
      pointsEarned: number;
      pointsRedeemed: number;
      currentPoints: number;
      tierProgress: number;
      nextTierThreshold: number;
    };
    riskFactors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
  };
}

export interface CustomerListResponse {
  customers: CustomerSummary[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
  averageSpent: number;
  totalCustomers: number;
  atRiskCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export interface CustomerStats {
  totalCustomers: number;
  atRiskCustomers: number;
  averageLoyaltyScore: number;
  totalRevenue: number;
  averageOrderValue: number;
  customerGrowthRate: number;
  loyaltyDistribution: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
  };
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

class CustomerApiService {
  private baseUrl = '/api/v1/customers';

  // Helper method for making API calls
  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Get customers with filtering and pagination
  async getCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString());
      }
    });

    const endpoint = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<CustomerListResponse>(endpoint);
  }

  // Get customer by ID
  async getCustomerById(
    id: string,
    includeAnalytics = true
  ): Promise<ApiResponse<CustomerDetail>> {
    const params = includeAnalytics ? '?includeAnalytics=true' : '';
    return this.apiCall<CustomerDetail>(`/${id}${params}`);
  }

  // Get customer by email
  async getCustomerByEmail(email: string): Promise<ApiResponse<Customer>> {
    return this.apiCall<Customer>(`/email/${encodeURIComponent(email)}`);
  }

  // Create new customer
  async createCustomer(customerData: CreateCustomerData): Promise<ApiResponse<Customer>> {
    return this.apiCall<Customer>('', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  // Update customer
  async updateCustomer(
    id: string,
    updateData: UpdateCustomerData
  ): Promise<ApiResponse<Customer>> {
    return this.apiCall<Customer>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Delete customer
  async deleteCustomer(id: string): Promise<ApiResponse<{ deleted: boolean; reason?: string }>> {
    return this.apiCall(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Search customers for autocomplete
  async searchCustomers(
    query: string,
    limit = 10
  ): Promise<ApiResponse<Array<{ id: string; name: string; email?: string; phone?: string }>>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());

    return this.apiCall(`/search/autocomplete?${params.toString()}`);
  }

  // Check email availability
  async checkEmailAvailability(
    email: string,
    excludeId?: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    const params = new URLSearchParams({ email });
    if (excludeId) params.append('excludeId', excludeId);

    return this.apiCall(`/check/email-availability?${params.toString()}`);
  }

  // Get customer statistics
  async getCustomerStatistics(): Promise<ApiResponse<CustomerStats>> {
    return this.apiCall('/analytics/statistics');
  }

  // Get customer invoices
  async getCustomerInvoices(
    customerId: string,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.apiCall(`/${customerId}/invoices?${params.toString()}`);
  }

  // Get customer loyalty metrics
  async getCustomerLoyaltyMetrics(customerId: string): Promise<ApiResponse<any>> {
    return this.apiCall(`/${customerId}/loyalty`);
  }

  // Get customer risk assessment
  async getCustomerRiskAssessment(customerId: string): Promise<ApiResponse<{
    riskScore: number;
    isAtRisk: boolean;
    riskFactors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    recommendations: string[];
  }>> {
    return this.apiCall(`/${customerId}/risk-assessment`);
  }

  // Bulk import customers
  async bulkImportCustomers(customersData: any[]): Promise<ApiResponse<any>> {
    return this.apiCall('/bulk/import', {
      method: 'POST',
      body: JSON.stringify(customersData),
    });
  }

  // Get customers by loyalty tier
  async getCustomersByLoyaltyTier(
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM',
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams({ loyaltyTier: tier });
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return this.apiCall(`/loyalty/${tier}?${params.toString()}`);
  }

  // Get at-risk customers
  async getAtRiskCustomers(
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams({ isAtRisk: 'true' });
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return this.apiCall(`/at-risk?${params.toString()}`);
  }

  // Get top customers by spending
  async getTopCustomers(
    limit?: number,
    dateFrom?: string,
    dateTo?: string,
    sortBy: 'totalSpent' | 'orderCount' | 'averageOrderValue' = 'totalSpent'
  ): Promise<ApiResponse<CustomerSummary[]>> {
    const params = new URLSearchParams({ sortBy });
    if (limit) params.append('limit', limit.toString());
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    return this.apiCall(`/analytics/top-customers?${params.toString()}`);
  }

  // Advanced filtering methods

  // Get customers by spending range
  async getCustomersBySpendingRange(
    minSpent: number,
    maxSpent: number,
    additionalFilters?: Partial<CustomerFilters>
  ): Promise<ApiResponse<CustomerListResponse>> {
    const filters: CustomerFilters = {
      minTotalSpent: minSpent,
      maxTotalSpent: maxSpent,
      ...additionalFilters,
    };

    return this.getCustomers(filters);
  }

  // Get customers by activity period
  async getCustomersByActivityPeriod(
    period: 'active' | 'inactive',
    daysThreshold = 90,
    additionalFilters?: Partial<CustomerFilters>
  ): Promise<ApiResponse<CustomerListResponse>> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

    let filters: CustomerFilters = {
      ...additionalFilters,
    };

    if (period === 'active') {
      filters.lastOrderFrom = thresholdDate.toISOString().split('T')[0];
    } else {
      filters.lastOrderTo = thresholdDate.toISOString().split('T')[0];
    }

    return this.getCustomers(filters);
  }

  // Get customer trends
  async getCustomerTrends(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    dateFrom: string,
    dateTo: string
  ): Promise<ApiResponse<Array<{
    period: string;
    newCustomers: number;
    totalCustomers: number;
    averageSpent: number;
    atRiskCount: number;
  }>>> {
    const params = new URLSearchParams({
      period,
      dateFrom,
      dateTo,
    });

    return this.apiCall(`/analytics/trends?${params.toString()}`);
  }

  // Get customer lifetime value distribution
  async getCustomerLTVDistribution(): Promise<ApiResponse<Array<{
    range: string;
    count: number;
    percentage: number;
    totalValue: number;
  }>>> {
    return this.apiCall('/analytics/ltv-distribution');
  }

  // Get customer segmentation
  async getCustomerSegmentation(): Promise<ApiResponse<{
    segments: Array<{
      name: string;
      customerCount: number;
      totalRevenue: number;
      averageOrderValue: number;
      description: string;
    }>;
    recommendations: Array<{
      segment: string;
      action: string;
      expectedImpact: string;
    }>;
  }>> {
    return this.apiCall('/analytics/segmentation');
  }

  // Update customer loyalty tier manually
  async updateCustomerLoyaltyTier(
    customerId: string,
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM',
    reason?: string
  ): Promise<ApiResponse<Customer>> {
    return this.apiCall(`/${customerId}/loyalty/tier`, {
      method: 'PUT',
      body: JSON.stringify({ tier, reason }),
    });
  }

  // Add customer note
  async addCustomerNote(
    customerId: string,
    note: string
  ): Promise<ApiResponse<{ id: string; note: string; createdAt: string }>> {
    return this.apiCall(`/${customerId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  // Get customer notes
  async getCustomerNotes(
    customerId: string,
    limit = 20,
    offset = 0
  ): Promise<ApiResponse<Array<{
    id: string;
    note: string;
    createdAt: string;
    updatedAt: string;
  }>>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.apiCall(`/${customerId}/notes?${params.toString()}`);
  }

  // Export customers to CSV
  async exportCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<{ downloadUrl: string }>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString());
      }
    });

    const endpoint = params.toString() ? `/export/csv?${params.toString()}` : '/export/csv';
    return this.apiCall(endpoint);
  }

  // Merge customers
  async mergeCustomers(
    primaryCustomerId: string,
    secondaryCustomerId: string,
    mergeData?: Partial<UpdateCustomerData>
  ): Promise<ApiResponse<Customer>> {
    return this.apiCall(`/${primaryCustomerId}/merge`, {
      method: 'POST',
      body: JSON.stringify({
        secondaryCustomerId,
        mergeData: mergeData || {},
      }),
    });
  }
}

// Export singleton instance
export const customerApi = new CustomerApiService();
export default customerApi;