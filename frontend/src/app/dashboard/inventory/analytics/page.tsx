'use client';

import React from 'react';
import DashboardLayout from '../../../../components/dashboard/dashboard-layout';
import InventoryAnalytics from '@/components/inventory/inventory-analytics';

export default function AnalyticsPage() {
  return (
    <DashboardLayout title="Inventory Analytics" fullWidth>
      <InventoryAnalytics />
    </DashboardLayout>
  );
}
