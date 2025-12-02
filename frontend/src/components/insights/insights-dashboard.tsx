import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Package, Users, DollarSign, ArrowRight, BarChart3, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/auth-context';

interface RestockAlert {
  type: string;
  productId: string;
  productName: string;
  sku: string;
  manufacturerCode?: string;
  brand: string;
  storeName: string;
  currentStock: number;
  dailyVelocity: number;
  daysOfSupply: number;
  daysOutOfStock?: number;
  message: string;
  status: string;
  suggestedOrder: number;
  lastSaleDate?: string;
  soldInLast90Days?: number;
  minStockLevel?: number;
}

interface DeadStock {
  type: string;
  productId: string;
  productName: string;
  sku: string;
  manufacturerCode?: string;
  brand: string;
  storeName: string;
  quantity: number;
  value: number;
  message: string;
}

interface UtilizationMetric {
  metric: string;
  value: number;
  unit: string;
  techCount: number;
  totalBilledHours: number;
  capacityHours: number;
  insight: string;
  message: string;
}

interface MarginLeakage {
  type: string;
  category: string;
  currentMargin: number;
  targetMargin: number;
  revenue: number;
  profit: number;
  message: string;
}

interface AttachmentRate {
  metric: string;
  value: number;
  unit: string;
  totalTireInvoices: number;
  invoicesWithAlignment: number;
  potentialRevenue: number;
  message: string;
}

interface StoreInventory {
  storeName: string;
  quantity: number;
  status: string;
}

interface TransferOpportunity {
  productId: string;
  productName: string;
  sku: string;
  manufacturerCode?: string;
  brand: string;
  pattern: string;
  size: string;
  sourceStoreId: string;
  sourceStoreName: string;
  targetStoreId: string;
  targetStoreName: string;
  quantity: number;
  reason: string;
  sourceVelocity: number;
  targetVelocity: number;
  sourceHistory: Array<{ date: string; quantity: number }>;
  targetHistory: Array<{ date: string; quantity: number }>;
  allStoresInventory: StoreInventory[];
  confidenceLevel?: string;
  confidenceScore?: number;
  velocityDiff?: number;
  sourceDaysOfSupply: number;
  targetDaysOfSupply: number;
  sourcePostTransferSupply: number;
  targetPostTransferSupply: number;
  avgInstallQty: number;
  history: Array<{ date: string; sourceSales: number; targetSales: number }>;
}

interface TopTire {
  productId: string;
  productName: string;
  totalSold: number;
  currentQuantity: number;
  daysOfSupply: number;
  rank: number;
  history: Array<{ date: string; quantity: number }>;
}

export function InsightsDashboard() {
  const { token } = useAuth();
  const COLORS = ['#06b6d4', '#eab308', '#84cc16'];
  const [restockAlerts, setRestockAlerts] = useState<RestockAlert[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStock[]>([]);
  const [utilization, setUtilization] = useState<UtilizationMetric | null>(null);
  const [marginLeakage, setMarginLeakage] = useState<MarginLeakage[]>([]);
  const [attachmentRate, setAttachmentRate] = useState<AttachmentRate | null>(null);
  const [transfers, setTransfers] = useState<TransferOpportunity[]>([]);
  const [topTires, setTopTires] = useState<Record<string, TopTire[]>>({});
  const [loading, setLoading] = useState(true);
  const [daysOutOfStockThreshold, setDaysOutOfStockThreshold] = useState<number | null>(90);
  const [outlookDays, setOutlookDays] = useState(30);
  const [expandedTransferIndex, setExpandedTransferIndex] = useState<number | null>(null);
  const [showAllRestockModal, setShowAllRestockModal] = useState(false);
  const [showOOSOnly, setShowOOSOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSize, setSelectedSize] = useState<string>('ALL');

  useEffect(() => {
    const fetchInsights = async () => {
      if (!token) return;
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [deadStockRes, utilRes, marginRes, attachRes, transfersRes, topTiresRes] = await Promise.all([
          fetch('http://localhost:3001/api/v1/insights/inventory/dead-stock', { headers }),
          fetch('http://localhost:3001/api/v1/insights/workforce/utilization', { headers }),
          fetch('http://localhost:3001/api/v1/insights/margin/leakage', { headers }),
          fetch('http://localhost:3001/api/v1/insights/margin/attachment', { headers }),
          fetch('http://localhost:3001/api/v1/insights/inventory/transfers', { headers }),
          fetch('http://localhost:3001/api/v1/insights/inventory/top-tires', { headers })
        ]);

        if (deadStockRes.ok) setDeadStock(await deadStockRes.json());
        if (utilRes.ok) setUtilization(await utilRes.json());
        if (marginRes.ok) setMarginLeakage(await marginRes.json());
        if (attachRes.ok) setAttachmentRate(await attachRes.json());
        if (transfersRes.ok) setTransfers(await transfersRes.json());
        if (topTiresRes.ok) setTopTires(await topTiresRes.json());
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [token]);

  useEffect(() => {
    const fetchRestockAlerts = async () => {
      if (!token) return;
      try {
        const url = new URL('http://localhost:3001/api/v1/insights/inventory/restock');
        if (daysOutOfStockThreshold) {
          url.searchParams.append('daysOutOfStockThreshold', daysOutOfStockThreshold.toString());
        }
        url.searchParams.append('outlookDays', outlookDays.toString());
        const res = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) setRestockAlerts(await res.json());
      } catch (error) {
        console.error('Failed to fetch restock alerts:', error);
      }
    };
    fetchRestockAlerts();
  }, [daysOutOfStockThreshold, outlookDays, token]);

  const getAlertStyle = (status: string) => {
    if (status === 'Out of Stock') {
      return {
        container: 'border-red-200 bg-red-50',
        icon: 'text-red-600',
        title: 'text-red-800',
        text: 'text-red-700',
        badge: 'border-red-300 bg-white text-red-700'
      };
    }
    // Low Stock -> Yellow
    return {
      container: 'border-yellow-200 bg-yellow-50',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      text: 'text-yellow-700',
      badge: 'border-yellow-300 bg-white text-yellow-700'
    };
  };

  const sortedAlerts = [...restockAlerts]
    .filter(alert => {
      // Filter Rule: If OOS, only show if suggested order is at least 6
      if (alert.currentStock <= 0 && alert.suggestedOrder < 6) return false;
      
      // Filter Rule: If supply exceeds outlook days, do not include
      if (alert.daysOfSupply > outlookDays) return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by Suggested Order Descending
      return b.suggestedOrder - a.suggestedOrder;
    });

  if (loading) {
    return <div className="p-8 text-center">Loading insights...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-slate-800 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-700 bg-clip-text text-transparent">
                Business Insights
              </h1>
              <p className="text-slate-600">AI-driven suggestions to improve profitability</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Level KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <h3 className="text-sm font-medium text-gray-900">Technician Utilization</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-900">{utilization?.value}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {utilization?.insight}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <h3 className="text-sm font-medium text-gray-900">Alignment Attachment</h3>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-900">{attachmentRate?.value}%</div>
            <p className="text-xs text-gray-500 mt-1">
              Missed Revenue: {formatCurrency(attachmentRate?.potentialRevenue || 0)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <h3 className="text-sm font-medium text-gray-900">Dead Stock Value</h3>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(deadStock.reduce((sum, item) => sum + item.value, 0))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {deadStock.length} items stagnant &gt; 90 days
            </p>
          </div>
        </div>
      </div>

      {/* Top Performing Tires Row */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Top Tires (6 Mo)
        </h2>
        <div className="flex flex-row gap-4 overflow-x-auto pb-4">
          {Object.entries(topTires)
            .filter(([category]) => !['OTHER', 'LAWN AND GARDEN', 'ATV UTV', 'AGRICULTURAL', 'INDUSTRIAL', 'OTR'].includes(category.toUpperCase()))
            .map(([category, tires]) => (
            <div key={category} className="min-w-[280px] flex-1 bg-white rounded-lg shadow border border-gray-200 p-3">
              <h3 className="font-semibold text-xs text-gray-800 mb-2 border-b pb-1 uppercase tracking-wide">{category}</h3>
              
              {/* Combined Chart */}
              <div className="h-16 w-full mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(() => {
                      // Merge histories
                      const dataMap = new Map<string, any>();
                      tires.slice(0, 3).forEach(tire => {
                        tire.history.forEach(h => {
                          if (!dataMap.has(h.date)) {
                            dataMap.set(h.date, { date: h.date });
                          }
                          dataMap.get(h.date)[tire.productName] = h.quantity;
                        });
                      });
                      return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      hide={true}
                    />
                    <YAxis 
                      hide={true}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: '10px', borderRadius: '0.375rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '4px 8px' }}
                      labelFormatter={(label) => new Date(label + '-15').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    />
                    {tires.slice(0, 3).map((tire, index) => (
                      <Line 
                        key={tire.productId}
                        type="monotone" 
                        dataKey={tire.productName} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={1.5} 
                        dot={false}
                        activeDot={{ r: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tire Details List */}
              <div className="space-y-1.5">
                {tires.slice(0, 3).map((tire, index) => (
                  <div key={tire.productId} className="flex flex-col p-1 bg-gray-50 rounded border border-gray-100 text-[10px]">
                    <div className="flex items-center gap-1.5 overflow-hidden mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <div className="truncate font-medium text-gray-700" title={tire.productName}>
                        {tire.rank}. {tire.productName}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 pl-3">
                      <div><span className="font-semibold text-gray-900">{tire.totalSold}</span> Sold</div>
                      <div><span className={`font-semibold ${tire.daysOfSupply < 30 ? 'text-red-600' : 'text-gray-900'}`}>{tire.daysOfSupply > 365 ? '>1yr' : Math.round(tire.daysOfSupply)}</span>d</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(topTires).length === 0 && (
            <div className="w-full text-center text-xs text-gray-500 py-4">
              No data available.
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Actions Column */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Urgent Actions
          </h2>

          {/* Restock Alerts */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 pb-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Inventory at Risk</h3>
              <div className="flex items-center gap-2">
                <select 
                  className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1"
                  value={outlookDays}
                  onChange={(e) => setOutlookDays(Number(e.target.value))}
                >
                  <option value="30">30 Day Outlook</option>
                  <option value="60">60 Day Outlook</option>
                  <option value="90">90 Day Outlook</option>
                  <option value="180">180 Day Outlook</option>
                </select>
                <select 
                  className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1"
                  value={daysOutOfStockThreshold || ''}
                  onChange={(e) => setDaysOutOfStockThreshold(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Show All Stock</option>
                  <option value="30">OOS &lt; 30 Days</option>
                  <option value="60">OOS &lt; 60 Days</option>
                  <option value="90">OOS &lt; 90 Days</option>
                  <option value="365">OOS &lt; 365 Days</option>
                </select>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Velocity</th>
                      <th className="px-4 py-3">Last Sold</th>
                      <th className="px-4 py-3 text-center">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAlerts.slice(0, 5).map((alert) => {
                      const styles = getAlertStyle(alert.status);
                      return (
                        <tr key={alert.productId} className={`border-b ${styles.container}`}>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${styles.title}`}>{alert.productName}</div>
                            <div className={`text-xs ${styles.text}`}>
                              {alert.sku} {alert.manufacturerCode ? `• ${alert.manufacturerCode}` : ''}
                            </div>
                          </td>
                          <td className={`px-4 py-3 ${styles.text}`}>{alert.storeName}</td>
                          <td className="px-4 py-3">
                            {alert.currentStock <= 0 ? (
                              <span className={`font-semibold ${styles.text}`}>Out of Stock ({alert.daysOutOfStock}d)</span>
                            ) : (
                              <span className={styles.text}>{Math.round(alert.daysOfSupply)}d supply</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${styles.text}`}>{alert.dailyVelocity.toFixed(2)}/day</td>
                          <td className={`px-4 py-3 ${styles.text}`}>
                            {alert.lastSaleDate ? (
                              <div>
                                <div>{new Date(alert.lastSaleDate).toLocaleDateString()}</div>
                                {alert.soldInLast90Days !== undefined && (
                                  <div className="text-xs opacity-75">{alert.soldInLast90Days} in 90d</div>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
                              {alert.suggestedOrder}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedAlerts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-4">No urgent restock alerts for this outlook.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {restockAlerts.length > 5 && (
                <button 
                  onClick={() => setShowAllRestockModal(true)}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 h-10 px-4 py-2 text-gray-600"
                >
                  View All {sortedAlerts.length} Alerts <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Margin Leakage */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Margin Leakage Alerts</h3>
            </div>
            <div className="p-6 space-y-4">
              {marginLeakage.map((leak) => (
                <div key={leak.category} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 border-orange-200">
                  <div>
                    <div className="font-semibold text-orange-900">{leak.category}</div>
                    <div className="text-sm text-orange-700">Target: {leak.targetMargin}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-800">{leak.currentMargin}%</div>
                    <div className="text-xs text-orange-600">Actual Margin</div>
                  </div>
                </div>
              ))}
              {marginLeakage.length === 0 && (
                <div className="text-center text-gray-500 py-4">Margins are healthy across all categories.</div>
              )}
            </div>
          </div>
        </div>

        {/* Strategic Opportunities Column */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <TrendingUp className="h-5 w-5 text-red-500" />
            Strategic Opportunities
          </h2>

          {/* Cross-Store Transfers */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Cross-Store Transfer Opportunities</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.slice(0, 10).map((transfer, idx) => (
                    <React.Fragment key={idx}>
                      <tr 
                        className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${expandedTransferIndex === idx ? 'bg-red-50' : ''}`}
                        onClick={() => setExpandedTransferIndex(expandedTransferIndex === idx ? null : idx)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div>{transfer.productName}</div>
                          <div className="text-xs text-gray-500 font-normal">
                            {transfer.brand} • {transfer.sku}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {transfer.confidenceScore !== undefined && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              transfer.confidenceScore >= 80 ? 'bg-green-100 text-green-800' :
                              transfer.confidenceScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {transfer.confidenceScore}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{transfer.sourceStoreName}</td>
                        <td className="px-4 py-3 text-gray-600">{transfer.targetStoreName}</td>
                        <td className="px-4 py-3 text-center font-bold text-red-600">{transfer.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          <ArrowRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedTransferIndex === idx ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                      {expandedTransferIndex === idx && (
                        <tr className="bg-red-50/50">
                          <td colSpan={6} className="p-4 space-y-4 border-b">
                            {/* Confidence & Summary */}
                            <div className="bg-white p-3 rounded border border-red-100">
                              <div className="flex items-center gap-2 mb-2">
                                {transfer.confidenceLevel && (
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    transfer.confidenceLevel === 'High' ? 'bg-green-100 text-green-800' :
                                    transfer.confidenceLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transfer.confidenceLevel} Confidence {transfer.confidenceScore !== undefined && `(${transfer.confidenceScore}%)`}
                                  </span>
                                )}
                                {transfer.velocityDiff !== undefined && (
                                  <span className="text-xs text-gray-500">
                                    (Velocity Diff: {transfer.velocityDiff} units/day)
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-semibold text-red-800">Why this move?</span> {transfer.reason}
                                {transfer.avgInstallQty !== undefined && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    • Typical install quantity: <strong>{transfer.avgInstallQty}</strong> tires/invoice
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Velocity & Outlook Comparison */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded border border-gray-200 space-y-3">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Source Velocity ({transfer.sourceStoreName})</div>
                                  <div className="font-semibold text-gray-900">{(transfer.sourceVelocity * 30).toFixed(1)} units/mo</div>
                                </div>
                                {transfer.sourceDaysOfSupply !== undefined && (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Est. Days of Supply</div>
                                    <div className="flex items-baseline gap-2">
                                      <div className={`font-semibold ${transfer.sourceDaysOfSupply < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {transfer.sourceDaysOfSupply.toFixed(0)} days
                                      </div>
                                      {transfer.sourcePostTransferSupply !== undefined && (
                                        <div className="text-xs text-gray-500">
                                          → {transfer.sourcePostTransferSupply.toFixed(0)} after
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-white p-3 rounded border border-gray-200 space-y-3">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Target Velocity ({transfer.targetStoreName})</div>
                                  <div className="font-semibold text-gray-900">{(transfer.targetVelocity * 30).toFixed(1)} units/mo</div>
                                </div>
                                {transfer.targetDaysOfSupply !== undefined && (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Est. Days of Supply</div>
                                    <div className="flex items-baseline gap-2">
                                      <div className={`font-semibold ${transfer.targetDaysOfSupply < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {transfer.targetDaysOfSupply.toFixed(0)} days
                                      </div>
                                      {transfer.targetPostTransferSupply !== undefined && (
                                        <div className="text-xs text-gray-500">
                                          → {transfer.targetPostTransferSupply.toFixed(0)} after
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 180-Day History Chart */}
                            <div className="h-64 w-full bg-white p-4 rounded border border-gray-200">
                              <h4 className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">6-Month Sales Trend (30-Day Moving Average)</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={(() => {
                                    const rawData = transfer.sourceHistory.map((h, i) => ({
                                      date: h.date,
                                      [transfer.sourceStoreName]: h.quantity,
                                      [transfer.targetStoreName]: transfer.targetHistory[i]?.quantity || 0
                                    }));
                                    
                                    // Calculate Moving Averages
                                    const windowSize = 30;
                                    return rawData.map((item, index, array) => {
                                      const start = Math.max(0, index - windowSize + 1);
                                      const subset = array.slice(start, index + 1);
                                      
                                      const sourceSum = subset.reduce((acc, curr) => acc + (curr[transfer.sourceStoreName] || 0), 0);
                                      const targetSum = subset.reduce((acc, curr) => acc + (curr[transfer.targetStoreName] || 0), 0);
                                      
                                      return {
                                        ...item,
                                        [`${transfer.sourceStoreName}_ma`]: sourceSum / subset.length,
                                        [`${transfer.targetStoreName}_ma`]: targetSum / subset.length
                                      };
                                    });
                                  })()}
                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                  <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    allowDecimals={false} 
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <Tooltip 
                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                    contentStyle={{ borderRadius: '0.375rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                  />
                                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                  <Line 
                                    type="monotone" 
                                    dataKey={`${transfer.sourceStoreName}_ma`} 
                                    stroke="#ef4444" 
                                    name={`${transfer.sourceStoreName} (Source)`}
                                    dot={false}
                                    strokeWidth={2}
                                    activeDot={{ r: 4 }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey={`${transfer.targetStoreName}_ma`} 
                                    stroke="#22c55e" 
                                    name={`${transfer.targetStoreName} (Target)`}
                                    dot={false}
                                    strokeWidth={2}
                                    activeDot={{ r: 4 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Visual Transfer Flow */}
                            <div className="flex items-center justify-between bg-white p-3 rounded border border-red-100">
                              <div className="text-center flex-1">
                                <div className="text-xs text-gray-500">From</div>
                                <div className="font-semibold text-gray-900 truncate px-1">{transfer.sourceStoreName}</div>
                                <div className="text-xs text-red-600 font-medium">
                                  {transfer.allStoresInventory.find(s => s.storeName === transfer.sourceStoreName)?.quantity} Units
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-center px-4 w-32">
                                <div className="text-xs text-red-600 font-bold mb-1">Transfer {transfer.quantity}</div>
                                <div className="relative w-full flex items-center justify-center h-8">
                                  <div className="absolute h-0.5 w-full bg-red-200 top-1/2 -translate-y-1/2"></div>
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 z-10">
                                    <ArrowRight className="h-4 w-4 text-red-500" />
                                  </div>
                                </div>
                              </div>

                              <div className="text-center flex-1">
                                <div className="text-xs text-gray-500">To</div>
                                <div className="font-semibold text-gray-900 truncate px-1">{transfer.targetStoreName}</div>
                                <div className="text-xs text-green-600 font-medium">
                                  {transfer.allStoresInventory.find(s => s.storeName === transfer.targetStoreName)?.quantity} Units
                                </div>
                              </div>
                            </div>

                            {/* All Stores Status */}
                            <div>
                              <div className="text-xs text-red-800 mb-1 font-medium">Current Stock Levels Across All Stores:</div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                {transfer.allStoresInventory.map((store) => (
                                  <div key={store.storeName} className={`p-1.5 rounded text-center border ${
                                    store.storeName === transfer.sourceStoreName ? 'bg-red-50 border-red-200' :
                                    store.storeName === transfer.targetStoreName ? 'bg-green-50 border-green-200' :
                                    'bg-white border-gray-200'
                                  }`}>
                                    <div className="font-medium text-gray-700 truncate" title={store.storeName}>{store.storeName}</div>
                                    <div className={`font-bold ${
                                       store.quantity === 0 ? 'text-red-500' : 'text-gray-900'
                                    }`}>
                                      {store.quantity}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-500 py-8">No transfer opportunities found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dead Stock */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Dead Stock Candidates (No Sales 90 Days)</h3>
            </div>
            <div className="p-6 space-y-4">
              {deadStock.slice(0, 5).map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{item.productName}</div>
                    <div className="text-xs text-gray-500">
                      {item.brand} • SKU: {item.sku} • {item.storeName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{item.quantity} units</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(item.value)} value
                    </div>
                  </div>
                </div>
              ))}
              {deadStock.length === 0 && (
                <div className="text-center text-gray-500 py-4">No dead stock detected.</div>
              )}
            </div>
          </div>

          {/* Attachment Rate Detail */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Service Attachment Detail</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-red-900">Alignment Opportunity</span>
                    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                      High Impact
                    </span>
                  </div>
                  <p className="text-sm text-red-800 mb-3">
                    {attachmentRate?.message}
                  </p>
                  <div className="w-full bg-red-200 rounded-full h-2.5">
                    <div 
                      className="bg-red-600 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${attachmentRate?.value}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-red-700 mt-1">
                    <span>Current: {attachmentRate?.value}%</span>
                    <span>Target: 50%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Restock Alerts Modal */}
      {showAllRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-4 p-6 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">All Restock Alerts</h3>
                  <p className="text-sm text-gray-500">
                    {sortedAlerts.length} items require attention based on current outlook settings.
                  </p>
                </div>
                <button 
                  onClick={() => setShowAllRestockModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Group Filter */}
                <div className="flex items-center gap-2">
                  <label htmlFor="modal-category" className="text-sm text-gray-600">Group:</label>
                  <select 
                    id="modal-category"
                    className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="ALL">All Groups</option>
                    {Array.from(new Set(restockAlerts.map(a => a.type))).sort().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Size Filter */}
                <div className="flex items-center gap-2">
                  <label htmlFor="modal-size" className="text-sm text-gray-600">Size:</label>
                  <select 
                    id="modal-size"
                    className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    <option value="ALL">All Sizes</option>
                    {Array.from(new Set(restockAlerts.map(a => a.size).filter(Boolean))).sort().map(size => (
                      <option key={size as string} value={size as string}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Outlook Filter */}
                <div className="flex items-center gap-2">
                  <label htmlFor="modal-outlook" className="text-sm text-gray-600">Outlook:</label>
                  <select 
                    id="modal-outlook"
                    className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1"
                    value={outlookDays}
                    onChange={(e) => setOutlookDays(Number(e.target.value))}
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                  </select>
                </div>

                {/* OOS Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="oos-toggle"
                    checked={showOOSOnly}
                    onChange={(e) => setShowOOSOnly(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <label htmlFor="oos-toggle" className="text-sm text-gray-700">Out of Stock Only</label>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Product Details</th>
                      <th className="px-4 py-3">Store Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredAlerts = sortedAlerts.filter(alert => {
                        const categoryMatch = selectedCategory === 'ALL' || alert.type === selectedCategory;
                        const sizeMatch = selectedSize === 'ALL' || alert.size === selectedSize;
                        const oosMatch = !showOOSOnly || alert.currentStock <= 0;
                        return categoryMatch && sizeMatch && oosMatch;
                      });

                      const groupedAlerts = filteredAlerts.reduce((acc, alert) => {
                        if (!acc[alert.sku]) {
                          acc[alert.sku] = [];
                        }
                        acc[alert.sku].push(alert);
                        return acc;
                      }, {} as Record<string, RestockAlert[]>);

                      // Sort groups by max suggested order
                      const sortedGroups = Object.entries(groupedAlerts).sort(([, alertsA], [, alertsB]) => {
                        const maxOrderA = Math.max(...alertsA.map(a => a.suggestedOrder));
                        const maxOrderB = Math.max(...alertsB.map(a => a.suggestedOrder));
                        return maxOrderB - maxOrderA;
                      });

                      return sortedGroups.map(([sku, alerts]) => {
                        const firstAlert = alerts[0];
                        return (
                          <tr key={sku} className="border-b hover:bg-gray-50">
                            {/* Product Info Column */}
                            <td className="px-4 py-4 align-top w-1/3">
                              <div className="font-medium text-gray-900 text-base">{firstAlert.productName}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                <span className="font-semibold">SKU:</span> {sku}
                              </div>
                              <div className="text-sm text-gray-500">
                                <span className="font-semibold">Brand:</span> {firstAlert.brand}
                              </div>
                              {firstAlert.size && (
                                <div className="text-sm text-gray-500">
                                  <span className="font-semibold">Size:</span> {firstAlert.size}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-2">
                                {firstAlert.manufacturerCode}
                              </div>
                            </td>

                            {/* Store Status Column */}
                            <td className="px-4 py-4 align-top">
                              <div className="grid gap-3">
                                {alerts.map(alert => {
                                  const styles = getAlertStyle(alert.status);
                                  return (
                                    <div key={alert.storeName} className={`flex items-center justify-between p-3 rounded-lg border ${styles.container}`}>
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900">{alert.storeName}</div>
                                        <div className="text-xs text-gray-600 mt-0.5">
                                          Velocity: {alert.dailyVelocity.toFixed(2)}/day
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          Last Sold: {alert.lastSaleDate ? new Date(alert.lastSaleDate).toLocaleDateString() : 'Never'}
                                          {alert.soldInLast90Days !== undefined && ` (${alert.soldInLast90Days} in 90d)`}
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm font-medium ${
                                            alert.currentStock <= 0 ? 'text-red-600' : 'text-gray-900'
                                          }`}>
                                            {alert.currentStock <= 0 ? 'Out of Stock' : `${alert.currentStock} In Stock`}
                                          </span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                                            {alert.currentStock <= 0 ? `${alert.daysOutOfStock}d OOS` : `${Math.round(alert.daysOfSupply)}d Supply`}
                                          </span>
                                        </div>
                                        
                                        {alert.suggestedOrder > 0 && (
                                          <div className="flex items-center gap-1 text-sm font-bold text-indigo-600">
                                            <span>Order: {alert.suggestedOrder}</span>
                                            {alert.minStockLevel && <span className="text-xs font-normal text-gray-500">(Min: {alert.minStockLevel})</span>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    {sortedAlerts.filter(alert => (!showOOSOnly || alert.currentStock <= 0) && (selectedCategory === 'ALL' || alert.type === selectedCategory) && (selectedSize === 'ALL' || alert.size === selectedSize)).length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center text-gray-500 py-8">No urgent restock alerts found matching criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowAllRestockModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 bg-white border border-gray-300 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
