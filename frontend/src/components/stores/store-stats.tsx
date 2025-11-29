import { DollarSign, TrendingUp, ShoppingCart, Hash } from 'lucide-react';

interface StoreStatsProps {
  stats: {
    period: string;
    totalRevenue: number;
    totalGrossProfit: number;
    invoiceCount: number;
    averageTicket: number;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export default function StoreStats({ stats }: StoreStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
          <DollarSign className="w-4 h-4 text-green-600" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
        <p className="text-xs text-gray-400 mt-1">{stats.period}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Gross Profit</h3>
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalGrossProfit)}</p>
        <p className="text-xs text-gray-400 mt-1">{stats.period}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Car Count</h3>
          <ShoppingCart className="w-4 h-4 text-purple-600" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats.invoiceCount}</p>
        <p className="text-xs text-gray-400 mt-1">Invoices</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Average Ticket</h3>
          <Hash className="w-4 h-4 text-orange-600" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageTicket)}</p>
        <p className="text-xs text-gray-400 mt-1">Per Invoice</p>
      </div>
    </div>
  );
}
