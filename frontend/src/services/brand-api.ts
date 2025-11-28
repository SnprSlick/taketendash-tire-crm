export interface Brand {
  name: string;
  productCount: number;
}

export interface BrandAnalytics {
  overview: {
    totalSales: number;
    totalProfit: number;
    totalUnits: number;
    transactionCount: number;
    inventoryCount: number;
  };
  trends: {
    month: string;
    sales: number;
    profit: number;
    units: number;
  }[];
  topSkus: {
    productCode: string;
    totalSales: number;
    totalUnits: number;
    totalProfit: number;
    product?: {
      size: string;
      pattern: string;
      description: string;
    };
  }[];
  sizeDistribution: {
    size: string;
    units: number;
    sales: number;
  }[];
}

export interface BrandLeaderboardItem {
  brand: string;
  totalSales: number;
  totalProfit: number;
  totalUnits: number;
  transactionCount: number;
}

export interface BrandSizeComparisonItem {
  brand: string;
  totalSales: number;
  totalProfit: number;
  totalUnits: number;
  averagePrice: number;
}

class BrandApiService {
  private baseUrl = '/api/v1/brands';

  private async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  }

  async getBrands(): Promise<Brand[]> {
    return this.apiCall<Brand[]>('');
  }

  async getBrandAnalytics(brand: string, startDate?: string, endDate?: string): Promise<BrandAnalytics> {
    const params = new URLSearchParams({ brand });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.apiCall<BrandAnalytics>(`/analytics?${params.toString()}`);
  }

  async getBrandLeaderboard(startDate?: string, endDate?: string): Promise<BrandLeaderboardItem[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.apiCall<BrandLeaderboardItem[]>(`/leaderboard?${params.toString()}`);
  }

  async getBrandsBySize(size: string, startDate?: string, endDate?: string): Promise<BrandSizeComparisonItem[]> {
    const params = new URLSearchParams({ size });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.apiCall<BrandSizeComparisonItem[]>(`/by-size?${params.toString()}`);
  }
}

export const brandApi = new BrandApiService();
export default brandApi;
