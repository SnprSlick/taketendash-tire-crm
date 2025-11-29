import Link from 'next/link';
import { Store, Users, ArrowRight, TrendingUp, DollarSign } from 'lucide-react';

interface StoreCardProps {
  store: {
    id: string;
    code: string;
    name: string;
    _count?: {
      employees: number;
    };
    stats?: {
      revenueYTD: number;
      grossProfitYTD: number;
    };
  };
}

export default function StoreCard({ store }: StoreCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <Link href={`/stores/${store.id}`} className="block h-full group">
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 p-6 border border-gray-200 h-full flex flex-col group-hover:bg-red-600 group-hover:border-red-600">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-red-600 group-hover:text-white" />
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white">{store.name}</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1 group-hover:text-red-100">Store #{store.code}</p>
          </div>
          <div className="bg-red-50 p-2 rounded-full group-hover:bg-white/20">
            <ArrowRight className="w-4 h-4 text-red-600 group-hover:text-white" />
          </div>
        </div>
        
        <div className="mt-auto space-y-3">
          <div className="pt-4 border-t border-gray-100 group-hover:border-red-500 flex items-center text-sm text-gray-600 group-hover:text-red-50">
            <Users className="w-4 h-4 mr-2" />
            <span>{store._count?.employees || 0} Staff Members</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center group-hover:text-red-100">
                <DollarSign className="w-3 h-3 mr-1" /> Revenue YTD
              </p>
              <p className="text-sm font-bold text-gray-900 group-hover:text-white">
                {store.stats ? formatCurrency(store.stats.revenueYTD) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center group-hover:text-red-100">
                <TrendingUp className="w-3 h-3 mr-1" /> GP YTD
              </p>
              <p className="text-sm font-bold text-green-600 group-hover:text-white">
                {store.stats ? formatCurrency(store.stats.grossProfitYTD) : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
