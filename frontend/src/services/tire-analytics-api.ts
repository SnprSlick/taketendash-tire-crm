export interface TireAnalyticsFilter {
  startDate?: string;
  endDate?: string;
  brands?: string[];
  qualities?: string[];
  types?: string[];
  sizes?: string[];
  storeId?: string;
  groupBy?: 'brand' | 'quality' | 'type' | 'size' | 'product';
}

export interface TireAnalyticsResult {
  brand?: string;
  quality?: string;
  type?: string;
  size?: string;
  productCode?: string;
  transactionCount: number;
  unitsSold: number;
  totalRevenue: number;
  totalProfit: number;
  margin: number;
  velocity: number;
}

export interface TireTrendResult {
  date: string;
  brand?: string;
  quality?: string;
  type?: string;
  size?: string;
  productCode?: string;
  unitsSold: number;
}

export interface FilterOptions {
  brands: string[];
  types: string[];
  sizes: string[];
  qualities: string[];
  stores: { id: string; name: string; code: string }[];
}

class TireAnalyticsApiService {
  private baseUrl = '/api/v1/analytics/tires';

  private async fetch<T>(endpoint: string, params?: any, token?: string): Promise<T> {
    const url = new URL(endpoint, 'http://localhost'); // Dummy base for relative URLs
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          if (Array.isArray(params[key])) {
            params[key].forEach((val: string) => url.searchParams.append(`${key}[]`, val));
          } else {
            url.searchParams.append(key, params[key]);
          }
        }
      });
    }
    
    // Construct the final relative URL
    const finalUrl = `${this.baseUrl}${endpoint}${url.search}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, { headers });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async getAnalytics(filter: TireAnalyticsFilter, token?: string): Promise<TireAnalyticsResult[]> {
    return this.fetch<TireAnalyticsResult[]>('', filter, token);
  }

  async getOptions(token?: string): Promise<FilterOptions> {
    return this.fetch<FilterOptions>('/options', undefined, token);
  }

  async getTrends(filter: TireAnalyticsFilter, token?: string): Promise<TireTrendResult[]> {
    return this.fetch<TireTrendResult[]>('/trends', filter, token);
  }
}

export const tireAnalyticsApi = new TireAnalyticsApiService();
export default tireAnalyticsApi;
