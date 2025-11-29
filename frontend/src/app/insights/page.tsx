'use client';

import { InsightsDashboard } from '@/components/insights/insights-dashboard';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

export default function InsightsPage() {
  return (
    <DashboardLayout title="Business Insights">
      <InsightsDashboard />
    </DashboardLayout>
  );
}
