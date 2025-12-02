import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, FileText, User, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '@/contexts/auth-context';

const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

const formatNumber = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

interface MechanicLabor {
  id: string;
  mechanicName: string;
  category: string;
  invoiceNumber: string;
  productCode: string;
  quantity: number;
  parts: number;
  labor: number;
  totalCost: number;
  grossProfit: number;
  gpPercent: number;
  createdAt: string;
}

interface GroupedInvoice {
  invoiceNumber: string;
  items: MechanicLabor[];
  totalLabor: number;
  totalParts: number;
  totalGrossProfit: number;
  totalHours: number;
  totalMiles: number;
}

interface GroupedMechanic {
  name: string;
  invoices: GroupedInvoice[];
  totalLabor: number;
  totalParts: number;
  totalGrossProfit: number;
  totalHours: number;
  totalMiles: number;
}

interface MechanicSummary {
  mechanicName: string;
  totalLabor: number;
  totalParts: number;
  totalGrossProfit: number;
  itemCount: number;
  totalHours: number;
  totalMiles: number;
  status: string;
  role: string;
  isMechanic?: boolean;
  storeCodes?: string;
}

type SortKey = 'mechanicName' | 'totalParts' | 'totalLabor' | 'totalGrossProfit' | 'totalHours' | 'totalMiles' | 'storeCodes';
type SortDirection = 'asc' | 'desc';

export default function MechanicTable() {
  const router = useRouter();
  const { token } = useAuth();
  const { selectedStoreId } = useStore();
  const [summaryData, setSummaryData] = useState<MechanicSummary[]>([]);
  const [detailsData, setDetailsData] = useState<Record<string, GroupedMechanic>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showNonMechanics, setShowNonMechanics] = useState(false);
  
  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('mechanicName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Expansion states
  const [expandedMechanics, setExpandedMechanics] = useState<Set<string>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [loadingMechanic, setLoadingMechanic] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchSummary();
    }
  }, [token, selectedStoreId]);

  const fetchSummary = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = selectedStoreId 
        ? `http://localhost:3001/api/v1/mechanic/summary?storeId=${selectedStoreId}&t=${new Date().getTime()}`
        : `http://localhost:3001/api/v1/mechanic/summary?t=${new Date().getTime()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }
      const data = await response.json();
      console.log('Mechanic Summary Data:', data);
      setSummaryData(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanicDetails = async (mechanicName: string) => {
    if (detailsData[mechanicName]) return; // Already loaded

    setLoadingMechanic(mechanicName);
    try {
      // Fetch all items for this mechanic (limit 5000 to be safe)
      const params = new URLSearchParams({
        limit: '5000',
        mechanicName: mechanicName
      });

      if (selectedStoreId) {
        params.append('storeId', selectedStoreId);
      }
      
      const response = await fetch(`http://localhost:3001/api/v1/mechanic?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      // Group by invoice
      const invoices: Record<string, GroupedInvoice> = {};
      
      result.data.forEach((item: MechanicLabor) => {
        if (!invoices[item.invoiceNumber]) {
          invoices[item.invoiceNumber] = {
            invoiceNumber: item.invoiceNumber,
            items: [],
            totalLabor: 0,
            totalParts: 0,
            totalGrossProfit: 0,
            totalHours: 0,
            totalMiles: 0
          };
        }
        
        const inv = invoices[item.invoiceNumber];
        inv.items.push(item);
        inv.totalLabor += Number(item.labor) || 0;
        inv.totalParts += Number(item.parts) || 0;
        inv.totalGrossProfit += Number(item.grossProfit) || 0;

        const isMileage = item.category.toLowerCase().includes('service truck mileage') || 
                         item.category.toLowerCase().includes('srvt service truck');

        if (isMileage) {
          inv.totalMiles += Number(item.quantity) || 0;
        } else if (Number(item.labor) > 0) {
          inv.totalHours += Number(item.quantity) || 0;
        }
      });

      const groupedMechanic: GroupedMechanic = {
        name: mechanicName,
        invoices: Object.values(invoices).sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber)),
        totalLabor: 0, // These will be updated from summary
        totalParts: 0,
        totalGrossProfit: 0,
        totalHours: 0,
        totalMiles: 0
      };

      setDetailsData(prev => ({
        ...prev,
        [mechanicName]: groupedMechanic
      }));

    } catch (err) {
      console.error(`Error fetching details for ${mechanicName}:`, err);
    } finally {
      setLoadingMechanic(null);
    }
  };

  const toggleMechanic = async (name: string) => {
    const newSet = new Set(expandedMechanics);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
      await fetchMechanicDetails(name);
    }
    setExpandedMechanics(newSet);
  };

  const toggleInvoice = (id: string) => {
    const newSet = new Set(expandedInvoices);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedInvoices(newSet);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc'); // Default to desc for numbers usually, but let's stick to desc for new columns
    }
  };

  const sortedData = useMemo(() => {
    const filtered = summaryData.filter(m => {
      const matchesSearch = m.mechanicName.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (!showInactive && m.status === 'INACTIVE') return false;
      
      // Filter non-mechanics
      // Show if:
      // 1. showNonMechanics is true OR
      // 2. isMechanic is true OR
      // 3. role is UNKNOWN (might be a mechanic not yet in system)
      if (!showNonMechanics) {
        if (m.isMechanic === true) return true;
        if (m.role === 'UNKNOWN') return true;
        // Fallback for backward compatibility if isMechanic missing
        if (m.isMechanic === undefined && m.role === 'TECHNICIAN') return true;
        
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Explicitly handle numeric columns
      if (['totalParts', 'totalLabor', 'totalGrossProfit', 'totalHours', 'totalMiles'].includes(sortKey)) {
        const numA = Number(aValue) || 0;
        const numB = Number(bValue) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Default string sort
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });
  }, [summaryData, search, sortKey, sortDirection, showInactive, showNonMechanics]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-indigo-600" />
      : <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4 py-2 bg-white rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search mechanics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Inactive</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNonMechanics}
              onChange={(e) => setShowNonMechanics(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Non-Mechanics</span>
          </label>
        </div>
        <div className="text-sm text-gray-500">
          Showing {sortedData.length} Mechanics
        </div>
      </div>

      <div className="overflow-hidden bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('mechanicName')}
              >
                <div className="flex items-center">
                  Name / Invoice / Item
                  <SortIcon column="mechanicName" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('storeCodes')}
              >
                <div className="flex items-center">
                  Store(s)
                  <SortIcon column="storeCodes" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalHours')}
              >
                <div className="flex items-center justify-end">
                  Hours
                  <SortIcon column="totalHours" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalMiles')}
              >
                <div className="flex items-center justify-end">
                  Miles
                  <SortIcon column="totalMiles" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalParts')}
              >
                <div className="flex items-center justify-end">
                  Parts
                  <SortIcon column="totalParts" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalLabor')}
              >
                <div className="flex items-center justify-end">
                  Labor
                  <SortIcon column="totalLabor" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalGrossProfit')}
              >
                <div className="flex items-center justify-end">
                  Gross Profit
                  <SortIcon column="totalGrossProfit" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              sortedData.map((mechanic) => (
                <>
                  {/* Mechanic Row */}
                  <tr 
                    key={mechanic.mechanicName} 
                    className="hover:bg-gray-50 cursor-pointer bg-gray-50"
                    onClick={() => toggleMechanic(mechanic.mechanicName)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {loadingMechanic === mechanic.mechanicName ? (
                        <span className="animate-spin">⌛</span>
                      ) : expandedMechanics.has(mechanic.mechanicName) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 flex items-center group">
                      <User size={16} className="mr-2 text-indigo-600" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/mechanic/${encodeURIComponent(mechanic.mechanicName)}`);
                        }}
                        className="hover:text-indigo-600 hover:underline flex items-center"
                      >
                        {mechanic.mechanicName}
                        <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <span className="ml-2 text-xs font-normal text-gray-500">({mechanic.itemCount} items)</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {mechanic.storeCodes ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {mechanic.storeCodes}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">{formatNumber(mechanic.totalHours)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">{formatNumber(mechanic.totalMiles)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">{formatCurrency(mechanic.totalParts)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">{formatCurrency(mechanic.totalLabor)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold" title={String(mechanic.totalGrossProfit)}>{formatCurrency(mechanic.totalGrossProfit)}</td>
                  </tr>

                  {/* Invoices List */}
                  {expandedMechanics.has(mechanic.mechanicName) && detailsData[mechanic.mechanicName]?.invoices.map((invoice) => (
                    <>
                      <tr 
                        key={`${mechanic.mechanicName}-${invoice.invoiceNumber}`}
                        className="hover:bg-gray-50 cursor-pointer bg-white border-l-4 border-indigo-100"
                        onClick={() => toggleInvoice(`${mechanic.mechanicName}-${invoice.invoiceNumber}`)}
                      >
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 pl-10">
                          {expandedInvoices.has(`${mechanic.mechanicName}-${invoice.invoiceNumber}`) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-700 flex items-center">
                          <FileText size={14} className="mr-2 text-gray-400" />
                          Invoice #{invoice.invoiceNumber}
                          <span className="ml-2 text-xs font-normal text-gray-400">({invoice.items.length} items)</span>
                          {invoice.totalHours > 0 && (
                            <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {formatNumber(invoice.totalHours)} hrs
                            </span>
                          )}
                          {invoice.totalMiles > 0 && (
                            <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              {formatNumber(invoice.totalMiles)} mi
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600"></td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{formatNumber(invoice.totalHours)}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{formatNumber(invoice.totalMiles)}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(invoice.totalParts)}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(invoice.totalLabor)}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right" title={String(invoice.totalGrossProfit)}>{formatCurrency(invoice.totalGrossProfit)}</td>
                      </tr>

                      {/* Line Items */}
                      {expandedInvoices.has(`${mechanic.mechanicName}-${invoice.invoiceNumber}`) && invoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 bg-white">
                          <td className="px-6 py-2"></td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 pl-16">
                            <div className="flex flex-col">
                              <span className="font-medium">{item.productCode}</span>
                              <span className="text-xs text-gray-400">
                                {item.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-2"></td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {(item.category.toLowerCase().includes('service truck mileage') || item.category.toLowerCase().includes('srvt service truck')) ? '-' : (Number(item.labor) > 0 && Number(item.quantity) > 0 ? formatNumber(item.quantity) : '-')}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                            {(item.category.toLowerCase().includes('service truck mileage') || item.category.toLowerCase().includes('srvt service truck')) ? formatNumber(item.quantity) : '-'}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.parts)}</td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.labor)}</td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right" title={String(item.grossProfit)}>{formatCurrency(item.grossProfit)}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
