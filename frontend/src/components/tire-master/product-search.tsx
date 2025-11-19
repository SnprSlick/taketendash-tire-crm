'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, Package, Eye } from 'lucide-react';

interface TireMasterProduct {
  id: string;
  tireMasterSku: string;
  brand: string;
  pattern: string;
  size: string;
  type: 'PASSENGER' | 'LIGHT_TRUCK' | 'COMMERCIAL' | 'SPECIALTY';
  season: 'ALL_SEASON' | 'SUMMER' | 'WINTER';
  description: string;
  weight: number;
  specifications: {
    loadIndex: string;
    speedRating: string;
    construction: string;
  };
  warrantyInfo: string;
  features: string[];
  isActive: boolean;
  lastSyncedAt: string;
}

interface ProductSearchResults {
  products: TireMasterProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TireMasterProductSearchProps {
  onBackToOverview: () => void;
}

export default function TireMasterProductSearch({ onBackToOverview }: TireMasterProductSearchProps) {
  const [searchParams, setSearchParams] = useState({
    brand: '',
    size: '',
    type: '',
    season: '',
    page: 1
  });
  const [searchResults, setSearchResults] = useState<ProductSearchResults | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TireMasterProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/v1/tire-master/products/search?${params}`);
      if (!response.ok) throw new Error('Failed to search products');

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search products');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const viewProductDetails = async (productId: string) => {
    try {
      const response = await fetch(`/api/v1/tire-master/products/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product details');

      const { data } = await response.json();
      setSelectedProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product details');
    }
  };

  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  const getTypeColor = (type: string) => {
    const colors = {
      PASSENGER: 'bg-blue-100 text-blue-800',
      LIGHT_TRUCK: 'bg-green-100 text-green-800',
      COMMERCIAL: 'bg-purple-100 text-purple-800',
      SPECIALTY: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSeasonColor = (season: string) => {
    const colors = {
      ALL_SEASON: 'bg-green-100 text-green-800',
      SUMMER: 'bg-yellow-100 text-yellow-800',
      WINTER: 'bg-blue-100 text-blue-800'
    };
    return colors[season as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (selectedProduct) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedProduct(null)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Search
          </button>
          <button
            onClick={onBackToOverview}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Overview
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-xl font-medium text-gray-900">{selectedProduct.brand} {selectedProduct.pattern}</h2>
                <p className="text-sm font-mono text-gray-600">{selectedProduct.tireMasterSku}</p>
              </div>
              <div className="flex space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedProduct.type)}`}>
                  {selectedProduct.type.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeasonColor(selectedProduct.season)}`}>
                  {selectedProduct.season.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Product Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size:</span>
                      <span className="font-mono">{selectedProduct.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Weight:</span>
                      <span>{selectedProduct.weight} lbs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Load Index:</span>
                      <span>{selectedProduct.specifications.loadIndex}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Speed Rating:</span>
                      <span>{selectedProduct.specifications.speedRating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Construction:</span>
                      <span>{selectedProduct.specifications.construction}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-500">{selectedProduct.description}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Warranty Information</h4>
                  <p className="text-sm text-gray-500">{selectedProduct.warrantyInfo}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Key Features</h4>
                  <div className="space-y-1">
                    {selectedProduct.features.map((feature, index) => (
                      <div key={index} className="text-sm text-gray-500">
                        • {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Inventory</h4>
                  {selectedProduct.inventory && selectedProduct.inventory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.inventory.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{inv.location.name}</span>
                          <div className="text-sm">
                            <span className="text-green-600">{inv.availableQty} available</span>
                            <span className="text-gray-500 ml-2">({inv.quantity} total)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No inventory information available</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Pricing</h4>
                  {selectedProduct.prices && selectedProduct.prices.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.prices.map((price: any) => (
                        <div key={price.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{price.priceList.name}</span>
                          <div className="text-sm space-x-2">
                            <span className="font-medium">${price.listPrice}</span>
                            {price.msrp && (
                              <span className="text-gray-500 line-through">${price.msrp}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No pricing information available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBackToOverview}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Overview
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="flex items-center text-lg font-medium text-gray-900">
            <Search className="h-5 w-5 mr-2" />
            Product Search
          </h2>
          <p className="text-sm text-gray-600">
            Search and browse the Tire Master product catalog
          </p>
        </div>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                id="brand"
                type="text"
                placeholder="Enter brand name"
                value={searchParams.brand}
                onChange={(e) => setSearchParams({ ...searchParams, brand: e.target.value, page: 1 })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <input
                id="size"
                type="text"
                placeholder="e.g. 31X10.50R15"
                value={searchParams.size}
                onChange={(e) => setSearchParams({ ...searchParams, size: e.target.value, page: 1 })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                id="type"
                value={searchParams.type}
                onChange={(e) => setSearchParams({ ...searchParams, type: e.target.value, page: 1 })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All types</option>
                <option value="PASSENGER">Passenger</option>
                <option value="LIGHT_TRUCK">Light Truck</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="SPECIALTY">Specialty</option>
              </select>
            </div>
            <div>
              <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-1">Season</label>
              <select
                id="season"
                value={searchParams.season}
                onChange={(e) => setSearchParams({ ...searchParams, season: e.target.value, page: 1 })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All seasons</option>
                <option value="ALL_SEASON">All Season</option>
                <option value="SUMMER">Summer</option>
                <option value="WINTER">Winter</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={searchProducts}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search Products'}
            </button>
            {searchResults && (
              <div className="text-sm text-gray-500">
                {searchResults.pagination.total} products found
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {searchResults && (
        <div className="space-y-4">
          {searchResults.products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{product.brand} {product.pattern}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(product.type)}`}>
                        {product.type.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeasonColor(product.season)}`}>
                        {product.season.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>
                        <span className="font-mono">{product.tireMasterSku}</span>
                        <span className="mx-2">•</span>
                        <span>{product.size}</span>
                        <span className="mx-2">•</span>
                        <span>{product.weight} lbs</span>
                      </div>
                      <p className="line-clamp-2">{product.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => viewProductDetails(product.id)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
            </div>
          ))}

          {/* Pagination */}
          {searchResults.pagination.totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                disabled={searchParams.page <= 1}
                onClick={() => setSearchParams({ ...searchParams, page: searchParams.page - 1 })}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="flex items-center text-sm text-gray-500 px-4">
                Page {searchResults.pagination.page} of {searchResults.pagination.totalPages}
              </span>
              <button
                disabled={searchParams.page >= searchResults.pagination.totalPages}
                onClick={() => setSearchParams({ ...searchParams, page: searchParams.page + 1 })}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}