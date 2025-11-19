'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Settings, Bell, FileText, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/dashboard-layout';
import ReminderList from '../../components/reminders/reminder-list';
import ReminderConfig from '../../components/reminders/reminder-config';
import { reminderLogger } from '../../lib/logger';

interface PageTab {
  id: 'overview' | 'reminders' | 'config';
  label: string;
  icon: React.ReactNode;
}

interface ReminderStats {
  totalReminders: number;
  pendingReminders: number;
  sentToday: number;
  conversionRate: number;
}

export default function ServiceRemindersPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'config'>('overview');
  const [stats, setStats] = useState<ReminderStats>({
    totalReminders: 0,
    pendingReminders: 0,
    sentToday: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  const tabs: PageTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: <Bell className="h-4 w-4" />,
    },
    {
      id: 'config',
      label: 'Configuration',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  useEffect(() => {
    // Simulate loading stats
    const loadStats = async () => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStats({
        totalReminders: 156,
        pendingReminders: 23,
        sentToday: 12,
        conversionRate: 68.5,
      });
      setLoading(false);
    };

    loadStats();
  }, []);

  const handleSendReminder = async (reminderId: string, communicationMethod: string) => {
    const startTime = Date.now();
    reminderLogger.info(`Sending reminder ${reminderId} via ${communicationMethod}`, { reminderId, communicationMethod });

    try {
      // TODO: Replace with actual API call
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;
      reminderLogger.info(`Reminder sent successfully`, {
        reminderId,
        communicationMethod,
        duration: `${duration}ms`
      });

      // Refresh stats after successful send
      setStats(prev => ({
        ...prev,
        pendingReminders: prev.pendingReminders - 1,
        sentToday: prev.sentToday + 1,
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      reminderLogger.error(`Failed to send reminder`, {
        reminderId,
        communicationMethod,
        duration: `${duration}ms`,
        error: error.message
      });
    }
  };

  const handleUpdateStatus = async (reminderId: string, status: string) => {
    const startTime = Date.now();
    reminderLogger.info(`Updating reminder status`, { reminderId, status });

    try {
      // TODO: Replace with actual API call
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const duration = Date.now() - startTime;
      reminderLogger.info(`Reminder status updated successfully`, {
        reminderId,
        status,
        duration: `${duration}ms`
      });

      // Update stats based on status change
      if (status === 'SENT') {
        setStats(prev => ({
          ...prev,
          pendingReminders: Math.max(0, prev.pendingReminders - 1),
          sentToday: prev.sentToday + 1,
        }));
      } else if (status === 'CONVERTED') {
        setStats(prev => ({
          ...prev,
          conversionRate: ((prev.conversionRate * prev.totalReminders) + 1) / prev.totalReminders,
        }));
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      reminderLogger.error(`Failed to update reminder status`, {
        reminderId,
        status,
        duration: `${duration}ms`,
        error: error.message
      });
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedReminders.length === 0) return;

    const startTime = Date.now();
    reminderLogger.info(`Starting bulk action`, {
      action: bulkAction,
      reminderCount: selectedReminders.length,
      reminderIds: selectedReminders
    });

    try {
      // TODO: Replace with actual API call
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const duration = Date.now() - startTime;
      reminderLogger.info(`Bulk action completed successfully`, {
        action: bulkAction,
        reminderCount: selectedReminders.length,
        duration: `${duration}ms`
      });

      // Clear selection and action
      setSelectedReminders([]);
      setBulkAction('');

      // Refresh stats
      const updatedStats = { ...stats };
      if (bulkAction === 'SENT') {
        updatedStats.pendingReminders = Math.max(0, updatedStats.pendingReminders - selectedReminders.length);
        updatedStats.sentToday += selectedReminders.length;
      }
      setStats(updatedStats);
    } catch (error) {
      const duration = Date.now() - startTime;
      reminderLogger.error(`Failed to perform bulk action`, {
        action: bulkAction,
        reminderCount: selectedReminders.length,
        duration: `${duration}ms`,
        error: error.message
      });
    }
  };

  const handleViewDetails = (reminder: any) => {
    reminderLogger.info(`Viewing reminder details`, {
      reminderId: reminder.id,
      customerName: `${reminder.customer?.firstName} ${reminder.customer?.lastName}`,
      serviceType: reminder.serviceType,
      status: reminder.status
    });
    // TODO: Implement reminder details modal
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reminders</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stats.totalReminders}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Reminders</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? '...' : stats.pendingReminders}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sent Today</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : stats.sentToday}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Bell className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? '...' : `${stats.conversionRate}%`}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { time: '2 minutes ago', message: 'Email reminder sent to John Smith for tire rotation', type: 'sent' },
            { time: '15 minutes ago', message: 'SMS reminder scheduled for Sarah Johnson', type: 'scheduled' },
            { time: '1 hour ago', message: 'Reminder converted to appointment for Mike Davis', type: 'converted' },
            { time: '2 hours ago', message: 'Oil change reminder generated for 15 customers', type: 'generated' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
              <div className={`h-2 w-2 rounded-full ${
                activity.type === 'sent' ? 'bg-green-500' :
                activity.type === 'scheduled' ? 'bg-blue-500' :
                activity.type === 'converted' ? 'bg-purple-500' :
                'bg-orange-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Generate Reminders</p>
              <p className="text-sm text-gray-500">Create new service reminders</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Bell className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Send Batch</p>
              <p className="text-sm text-gray-500">Send pending reminders</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <FileText className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Reports</p>
              <p className="text-sm text-gray-500">Reminder performance</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Service Reminders">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Reminders</h1>
        <p className="text-gray-600">Manage automated service reminders and customer communications</p>
      </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && renderOverviewTab()}

          {activeTab === 'reminders' && (
            <div className="space-y-4">
              {/* Bulk Actions */}
              {selectedReminders.length > 0 && (
                <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedReminders.length} reminders selected
                    </span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        className="px-3 py-1 border border-blue-300 rounded-md bg-white text-sm"
                      >
                        <option value="">Select action...</option>
                        <option value="SENT">Mark as Sent</option>
                        <option value="DISMISSED">Mark as Dismissed</option>
                        <option value="CONVERTED">Mark as Converted</option>
                      </select>
                      <button
                        onClick={handleBulkAction}
                        disabled={!bulkAction}
                        className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => setSelectedReminders([])}
                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
                <ReminderList
                  onSendReminder={handleSendReminder}
                  onUpdateStatus={handleUpdateStatus}
                  onViewDetails={handleViewDetails}
                  selectedReminders={selectedReminders}
                  onSelectionChange={setSelectedReminders}
                />
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
              <ReminderConfig />
            </div>
          )}
        </div>
    </DashboardLayout>
  );
}