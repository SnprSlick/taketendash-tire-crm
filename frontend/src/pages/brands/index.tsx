import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard/dashboard-layout';
import { BrandAnalyticsDashboard } from '../../components/brands/brand-analytics-dashboard';
import { BrandLeaderboard } from '../../components/brands/brand-leaderboard';
import { SizeComparison } from '../../components/brands/size-comparison';

const BrandsPage = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'leaderboard' | 'size'>('analytics');

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            Brand Analytics
          </button>
          <button
            className={`py-2 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
          <button
            className={`py-2 px-4 font-medium border-b-2 transition-colors ${
              activeTab === 'size'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('size')}
          >
            Size Comparison
          </button>
        </div>

        {activeTab === 'analytics' && <BrandAnalyticsDashboard />}
        {activeTab === 'leaderboard' && <BrandLeaderboard />}
        {activeTab === 'size' && <SizeComparison />}
      </div>
    </DashboardLayout>
  );
};

export default BrandsPage;
