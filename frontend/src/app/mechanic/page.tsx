'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import MechanicTable from '@/components/mechanic/mechanic-table';
import MechanicImport from '@/components/mechanic/mechanic-import';
import MechanicAnalytics from '@/components/mechanic/mechanic-analytics';
import { Wrench, Upload, Table as TableIcon, Trash2, BarChart2 } from 'lucide-react';

export default function MechanicPage() {
  const [activeTab, setActiveTab] = useState<'view' | 'import' | 'analytics'>('view');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab('view');
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all mechanic performance data? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/v1/mechanic/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clear data: ${response.status} ${response.statusText} - ${errorText}`);
      }

      setRefreshKey((prev) => prev + 1);
      alert('Data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert(error instanceof Error ? error.message : 'Failed to clear data');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Wrench className="w-8 h-8 mr-3 text-indigo-600" />
            Mechanic Performance
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={handleClearData}
              className="px-4 py-2 rounded-md flex items-center bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Data
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`px-4 py-2 rounded-md flex items-center ${
                activeTab === 'view' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              View Data
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-md flex items-center ${
                activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 rounded-md flex items-center ${
                activeTab === 'import' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </button>
          </div>
        </div>

        {activeTab === 'import' && (
          <MechanicImport onImportSuccess={handleImportSuccess} />
        )}

        {activeTab === 'view' && (
          <div className="bg-white rounded-lg shadow">
            <MechanicTable key={refreshKey} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <MechanicAnalytics />
        )}
      </div>
    </DashboardLayout>
  );
}
