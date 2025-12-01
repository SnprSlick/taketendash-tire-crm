'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Package, MapPin, Search, Truck, AlertTriangle } from 'lucide-react';

interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastUpdated: string;
  product: {
    id: string;
    tireMasterSku: string;
    brand: string;
    pattern: string;
    size: string;
    type: string;
    season: string;
  };
  location: {
    id: string;
    name: string;
    tireMasterCode: string;
    address?: string;
    city?: string;
    state?: string;
  };
}

interface Location {
  id: string;
  name: string;
  tireMasterCode: string;
  address?: string;
  city?: string;
  state?: string;
  isActive: boolean;
}

interface TireMasterInventoryProps {
  onBackToOverview: () => void;
}

export default function TireMasterInventory({ onBackToOverview }: TireMasterInventoryProps) {
  const { token } = useAuth();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock locations data
  useEffect(() => {
    setLocations([
      {
        id: 'loc-001',
        name: 'Main Warehouse',
        tireMasterCode: 'MW001',
        address: '123 Industrial Dr',
        city: 'Dallas',
        state: 'TX',
        isActive: true
      },
      {
        id: 'loc-002',
        name: 'Downtown Store',
        tireMasterCode: 'DS002',
        address: '456 Main St',
        city: 'Dallas',
        state: 'TX',
        isActive: true
      },
      {
        id: 'loc-003',
        name: 'North Branch',
        tireMasterCode: 'NB003',
        address: '789 North Ave',
        city: 'Plano',
        state: 'TX',
        isActive: true
      }
    ]);
    setSelectedLocationId('loc-001');
  }, []);

  const fetchInventory = useCallback(async (locationId: string) => {
    if (!locationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/tire-master/inventory/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');

      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchInventory(selectedLocationId);
    }
  }, [selectedLocationId, fetchInventory]);

  const filteredInventory = inventory.filter((item) =>
    item.product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.tireMasterSku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockLevel = (item: InventoryItem) => {
    if (item.availableQty === 0) return 'out-of-stock';
    if (item.availableQty <= 5) return 'low-stock';
    if (item.availableQty <= 10) return 'medium-stock';
    return 'in-stock';
  };

  const getStockColor = (level: string) => {
    switch (level) {
      case 'out-of-stock':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low-stock':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium-stock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStockText = (level: string) => {
    switch (level) {
      case 'out-of-stock':
        return 'Out of Stock';
      case 'low-stock':
        return 'Low Stock';
      case 'medium-stock':
        return 'Medium Stock';
      default:
        return 'In Stock';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalItems = filteredInventory.length;
  const totalQuantity = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalAvailable = filteredInventory.reduce((sum, item) => sum + item.availableQty, 0);
  const lowStockItems = filteredInventory.filter(item => getStockLevel(item) === 'low-stock').length;
  const outOfStockItems = filteredInventory.filter(item => getStockLevel(item) === 'out-of-stock').length;

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

      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="flex items-center text-lg font-medium text-gray-900">
            <Package className="h-5 w-5 mr-2" />
            Inventory Management
          </h2>
          <p className="text-sm text-gray-600">
            View and manage tire inventory across all locations
          </p>
        </div>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                id="location"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.tireMasterCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="search"
                  type="text"
                  placeholder="Search by brand, pattern, size, or SKU"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Summary */}
      {!loading && selectedLocationId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-sm text-gray-500">Total Products</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
            <p className="text-sm text-gray-500">Total Units</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{totalAvailable.toLocaleString()}</div>
            <p className="text-sm text-gray-500">Available Units</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{lowStockItems + outOfStockItems}</div>
            <p className="text-sm text-gray-500">Needs Attention</p>
          </div>
        </div>
      )}

      {/* Inventory List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInventory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Inventory Found</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? 'No products match your search criteria.'
                  : 'No inventory data available for the selected location.'}
              </p>
            </div>
          ) : (
            filteredInventory.map((item) => {
              const stockLevel = getStockLevel(item);
              return (
                <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {item.product.brand} {item.product.pattern}
                          </h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            <div>
                              <span className="font-mono">{item.product.tireMasterSku}</span>
                              <span className="mx-2">•</span>
                              <span>{item.product.size}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item.product.type.replace('_', ' ')}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {item.product.season.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockColor(stockLevel)}`}>
                          {getStockText(stockLevel)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total Quantity</span>
                          <div className="font-medium">{item.quantity}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Reserved</span>
                          <div className="font-medium text-yellow-600">{item.reservedQty}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Available</span>
                          <div className={`font-medium ${stockLevel === 'out-of-stock' ? 'text-red-600' :
                            stockLevel === 'low-stock' ? 'text-orange-600' : 'text-green-600'}`}>
                            {item.availableQty}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Updated</span>
                          <div className="font-medium">{formatDate(item.lastUpdated)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {(stockLevel === 'low-stock' || stockLevel === 'out-of-stock') && (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                      <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <Truck className="h-4 w-4 mr-1" />
                        Update Stock
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Location Details */}
      {selectedLocationId && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="flex items-center text-lg font-medium text-gray-900">
              <MapPin className="h-5 w-5 mr-2" />
              Location Details
            </h3>
          </div>
          <div>
            {(() => {
              const location = locations.find(loc => loc.id === selectedLocationId);
              if (!location) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{location.name}</h4>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>Code: {location.tireMasterCode}</div>
                      {location.address && <div>Address: {location.address}</div>}
                      {location.city && location.state && (
                        <div>{location.city}, {location.state}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Inventory Summary</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Products with stock:</span>
                        <span>{filteredInventory.filter(item => item.quantity > 0).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Low stock alerts:</span>
                        <span className="text-orange-600">{lowStockItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Out of stock:</span>
                        <span className="text-red-600">{outOfStockItems}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}