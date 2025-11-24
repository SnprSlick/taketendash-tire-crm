import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

// Dynamically import the client component to avoid SSR hydration issues
const CsvImportClientPage = dynamic(() => import('./csv-import-client'), {
  ssr: false,
  loading: () => (
    <div className="max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  ),
});

export default function CsvImportPage() {
  return (
    <DashboardLayout title="CSV Import">
      <CsvImportClientPage />
    </DashboardLayout>
  );
}