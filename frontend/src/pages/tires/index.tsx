
import React from 'react';
import DashboardLayout from '../../components/dashboard/dashboard-layout';
import { TireAnalyticsDashboard } from '../../components/tires/tire-analytics-dashboard';

const TiresPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <TireAnalyticsDashboard />
      </div>
    </DashboardLayout>
  );
};

export default TiresPage;
