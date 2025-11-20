// Invoice API Client Service
// T061: Create invoice API client service for frontend integration

export interface InvoiceFilters {
  search?: string;
  customerId?: string;
  customerName?: string;
  invoiceNumber?: string;
  salesperson?: string;
  status?: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  importBatchId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  salesperson?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  laborCost?: number;
  partsCost?: number;
  environmentalFee?: number;
  status: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
  importBatchId?: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  salesperson?: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  lineItemCount: number;
  createdAt: string;
}

export interface LineItem {
  id: string;
  productName: string;
  productSku?: string;
  category: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  laborCost?: number;
  description?: string;
}

export interface InvoiceDetail {
  invoice: Invoice;
  lineItems: LineItem[];
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface InvoiceListResponse {
  invoices: InvoiceSummary[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
  totalAmount: number;
  averageAmount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface CreateInvoiceData {
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  salesperson?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  laborCost?: number;
  partsCost?: number;
  environmentalFee?: number;
  status?: 'PENDING' | 'PAID' | 'VOIDED' | 'OVERDUE';
  importBatchId?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {}

export interface CreateLineItemData {
  productName: string;
  productSku?: string;
  category: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  laborCost?: number;
  description?: string;
}

class InvoiceApiService {
  private baseUrl = '/api/v1/invoices';

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

  // Get invoices with filtering and pagination
  async getInvoices(filters: InvoiceFilters = {}): Promise<ApiResponse<InvoiceListResponse>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString());
      }
    });

    const endpoint = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<InvoiceListResponse>(endpoint);
  }

  // Get invoice by ID
  async getInvoiceById(
    id: string,
    includeLineItems = true
  ): Promise<ApiResponse<InvoiceDetail>> {
    const params = includeLineItems ? '?includeLineItems=true' : '';
    return this.apiCall<InvoiceDetail>(`/${id}${params}`);
  }

  // Get invoice by invoice number
  async getInvoiceByNumber(invoiceNumber: string): Promise<ApiResponse<Invoice>> {
    return this.apiCall<Invoice>(`/number/${encodeURIComponent(invoiceNumber)}`);
  }

  // Create new invoice
  async createInvoice(invoiceData: CreateInvoiceData): Promise<ApiResponse<Invoice>> {
    return this.apiCall<Invoice>('', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  // Update invoice
  async updateInvoice(
    id: string,
    updateData: UpdateInvoiceData
  ): Promise<ApiResponse<Invoice>> {
    return this.apiCall<Invoice>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Delete/void invoice
  async deleteInvoice(id: string): Promise<ApiResponse<{ deleted: boolean; reason?: string }>> {
    return this.apiCall(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Add line item to invoice
  async addLineItem(
    invoiceId: string,
    lineItemData: CreateLineItemData
  ): Promise<ApiResponse<LineItem>> {
    return this.apiCall<LineItem>(`/${invoiceId}/line-items`, {
      method: 'POST',
      body: JSON.stringify(lineItemData),
    });
  }

  // Get line items for invoice
  async getInvoiceLineItems(invoiceId: string): Promise<ApiResponse<LineItem[]>> {
    return this.apiCall<LineItem[]>(`/${invoiceId}/line-items`);
  }

  // Search invoices for autocomplete
  async searchInvoices(
    query: string,
    limit = 10
  ): Promise<ApiResponse<Array<{ id: string; invoiceNumber: string; totalAmount: number; customerName?: string }>>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());

    return this.apiCall(`/search/autocomplete?${params.toString()}`);
  }

  // Check invoice number availability
  async checkInvoiceNumberAvailability(
    invoiceNumber: string,
    excludeId?: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    const params = new URLSearchParams({ invoiceNumber });
    if (excludeId) params.append('excludeId', excludeId);

    return this.apiCall(`/check/number-availability?${params.toString()}`);
  }

  // Get invoice statistics
  async getInvoiceStatistics(customerId?: string): Promise<ApiResponse<any>> {
    const params = customerId ? `?customerId=${customerId}` : '';
    return this.apiCall(`/analytics/statistics${params}`);
  }

  // Bulk import invoices
  async bulkImportInvoices(invoicesData: any[]): Promise<ApiResponse<any>> {
    return this.apiCall('/bulk/import', {
      method: 'POST',
      body: JSON.stringify(invoicesData),
    });
  }

  // Get invoices by date range for reporting
  async getInvoicesByDateRange(
    startDate: string,
    endDate: string,
    customerId?: string,
    status?: string
  ): Promise<ApiResponse<InvoiceListResponse>> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    if (customerId) params.append('customerId', customerId);
    if (status) params.append('status', status);

    return this.apiCall(`/reports/date-range?${params.toString()}`);
  }

  // Get top customers by invoice volume
  async getTopCustomers(
    limit?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();

    if (limit) params.append('limit', limit.toString());
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    return this.apiCall(`/analytics/top-customers?${params.toString()}`);
  }

  // Advanced filtering methods

  // Get invoices by time period preset
  async getInvoicesByTimePeriod(
    period: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year',
    customerId?: string,
    additionalFilters?: Partial<InvoiceFilters>
  ): Promise<ApiResponse<InvoiceListResponse>> {
    const filters: InvoiceFilters = {
      ...additionalFilters,
      customerId,
    };

    // Calculate date range based on period
    const now = new Date();
    let dateFrom = '';
    let dateTo = '';

    switch (period) {
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
      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        dateFrom = quarterStart.toISOString().split('T')[0];
        dateTo = quarterEnd.toISOString().split('T')[0];
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        const lastQuarterStart = new Date(lastQuarterYear, adjustedQuarter * 3, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, adjustedQuarter * 3 + 3, 0);
        dateFrom = lastQuarterStart.toISOString().split('T')[0];
        dateTo = lastQuarterEnd.toISOString().split('T')[0];
        break;
      case 'this_year':
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
    }

    filters.dateFrom = dateFrom;
    filters.dateTo = dateTo;

    return this.getInvoices(filters);
  }

  // Get invoices by amount range
  async getInvoicesByAmountRange(
    minAmount: number,
    maxAmount: number,
    customerId?: string,
    additionalFilters?: Partial<InvoiceFilters>
  ): Promise<ApiResponse<InvoiceListResponse>> {
    const filters: InvoiceFilters = {
      minAmount,
      maxAmount,
      customerId,
      ...additionalFilters,
    };

    return this.getInvoices(filters);
  }

  // Get invoice trends
  async getInvoiceTrends(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    dateFrom: string,
    dateTo: string,
    customerId?: string
  ): Promise<ApiResponse<Array<{
    period: string;
    invoiceCount: number;
    totalAmount: number;
    averageAmount: number;
  }>>> {
    const params = new URLSearchParams({
      period,
      dateFrom,
      dateTo,
    });

    if (customerId) params.append('customerId', customerId);

    return this.apiCall(`/analytics/trends?${params.toString()}`);
  }
}

// Export singleton instance
export const invoiceApi = new InvoiceApiService();
export default invoiceApi;