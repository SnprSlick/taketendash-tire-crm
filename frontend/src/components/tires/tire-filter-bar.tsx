
import React from 'react';
import { FilterOptions, TireAnalyticsFilter } from '../../services/tire-analytics-api';

interface TireFilterBarProps {
  options: FilterOptions;
  filter: TireAnalyticsFilter;
  onFilterChange: (newFilter: TireAnalyticsFilter) => void;
}

export const TireFilterBar: React.FC<TireFilterBarProps> = ({ options, filter, onFilterChange }) => {
  const handleMultiSelectChange = (key: keyof TireAnalyticsFilter, value: string) => {
    const current = (filter[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    onFilterChange({ ...filter, [key]: updated });
  };

  const handleDateRangeChange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onFilterChange({
      ...filter,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex flex-wrap gap-2">
        {[30, 60, 90, 180, 365].map(days => (
          <button
            key={days}
            onClick={() => handleDateRangeChange(days)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            Last {days} Days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Brands */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brands</label>
          <div className="h-32 overflow-y-auto border rounded p-2 text-sm">
            {options.brands.map(brand => (
              <div key={brand} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filter.brands?.includes(brand) || false}
                  onChange={() => handleMultiSelectChange('brands', brand)}
                  className="mr-2"
                />
                {brand}
              </div>
            ))}
          </div>
        </div>

        {/* Qualities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
          <div className="border rounded p-2 text-sm">
            {options.qualities.map(q => (
              <div key={q} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filter.qualities?.includes(q) || false}
                  onChange={() => handleMultiSelectChange('qualities', q)}
                  className="mr-2"
                />
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="h-32 overflow-y-auto border rounded p-2 text-sm">
            {options.types.map(t => (
              <div key={t} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filter.types?.includes(t) || false}
                  onChange={() => handleMultiSelectChange('types', t)}
                  className="mr-2"
                />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Stores */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={filter.storeId || ''}
            onChange={(e) => onFilterChange({ ...filter, storeId: e.target.value || undefined })}
          >
            <option value="">All Stores</option>
            {options.stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
