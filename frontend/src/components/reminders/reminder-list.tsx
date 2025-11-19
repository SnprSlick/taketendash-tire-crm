'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Calendar,
  User,
  Car,
  Send,
  Eye,
  MoreVertical
} from 'lucide-react';

interface ServiceReminder {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceType: string;
  reminderDate: string;
  lastServiceDate: string;
  mileage?: number;
  status: 'PENDING' | 'SENT' | 'DISMISSED' | 'CONVERTED';
  communicationMethod: 'EMAIL' | 'SMS' | 'PHONE' | 'ALL';
  createdAt: string;
  updatedAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
  };
}

interface ReminderListProps {
  reminders?: ServiceReminder[];
  loading?: boolean;
  onSendReminder?: (id: string, method: string) => void;
  onViewDetails?: (reminder: ServiceReminder) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  selectedReminders?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

const mockReminders: ServiceReminder[] = [
  {
    id: '1',
    customerId: '101',
    vehicleId: '201',
    serviceType: 'Oil Change',
    reminderDate: '2024-11-20T00:00:00Z',
    lastServiceDate: '2024-08-15T00:00:00Z',
    mileage: 75000,
    status: 'PENDING',
    communicationMethod: 'EMAIL',
    createdAt: '2024-11-18T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
    customer: { firstName: 'John', lastName: 'Doe', email: 'john@email.com', phone: '(555) 123-4567' },
    vehicle: { make: 'Toyota', model: 'Camry', year: 2019, licensePlate: 'ABC123' }
  },
  {
    id: '2',
    customerId: '102',
    vehicleId: '202',
    serviceType: 'Tire Rotation',
    reminderDate: '2024-11-22T00:00:00Z',
    lastServiceDate: '2024-05-10T00:00:00Z',
    mileage: 82000,
    status: 'SENT',
    communicationMethod: 'SMS',
    createdAt: '2024-11-17T00:00:00Z',
    updatedAt: '2024-11-18T10:00:00Z',
    customer: { firstName: 'Jane', lastName: 'Smith', phone: '(555) 987-6543' },
    vehicle: { make: 'Honda', model: 'Civic', year: 2020, licensePlate: 'XYZ789' }
  },
  {
    id: '3',
    customerId: '103',
    vehicleId: '203',
    serviceType: 'Brake Service',
    reminderDate: '2024-11-25T00:00:00Z',
    lastServiceDate: '2024-02-28T00:00:00Z',
    mileage: 95000,
    status: 'PENDING',
    communicationMethod: 'PHONE',
    createdAt: '2024-11-16T00:00:00Z',
    updatedAt: '2024-11-16T00:00:00Z',
    customer: { firstName: 'Mike', lastName: 'Johnson', phone: '(555) 456-7890' },
    vehicle: { make: 'Ford', model: 'F-150', year: 2018, licensePlate: 'TRK456' }
  }
];

export default function ReminderList({
  reminders = mockReminders,
  loading = false,
  onSendReminder,
  onViewDetails,
  onUpdateStatus,
  selectedReminders = [],
  onSelectionChange
}: ReminderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'customer' | 'service'>('date');

  const handleSelectReminder = (reminderId: string, checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedReminders, reminderId]);
    } else {
      onSelectionChange(selectedReminders.filter(id => id !== reminderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange(filteredReminders.map(reminder => reminder.id));
    } else {
      onSelectionChange([]);
    }
  };

  const filteredReminders = useMemo(() => {
    return reminders
      .filter(reminder => {
        const matchesSearch = searchTerm === '' ||
          `${reminder.customer?.firstName} ${reminder.customer?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${reminder.vehicle?.make} ${reminder.vehicle?.model}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reminder.serviceType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || reminder.status === statusFilter;
        const matchesType = typeFilter === 'ALL' || reminder.serviceType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'customer':
            const nameA = `${a.customer?.firstName} ${a.customer?.lastName}`;
            const nameB = `${b.customer?.firstName} ${b.customer?.lastName}`;
            return nameA.localeCompare(nameB);
          case 'service':
            return a.serviceType.localeCompare(b.serviceType);
          default:
            return new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime();
        }
      });
  }, [reminders, searchTerm, statusFilter, typeFilter, sortBy]);

  const statusCounts = useMemo(() => {
    return reminders.reduce((acc, reminder) => {
      acc[reminder.status] = (acc[reminder.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [reminders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'SENT':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'DISMISSED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'CONVERTED':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCommunicationIcon = (method: string) => {
    switch (method) {
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'PHONE':
        return <Phone className="w-4 h-4 text-purple-500" />;
      case 'ALL':
        return <Bell className="w-4 h-4 text-orange-500" />;
      default:
        return <Mail className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (reminderDate: string) => {
    return new Date(reminderDate) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/80 rounded-xl p-6 border border-slate-200/50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="Pending"
          count={statusCounts.PENDING || 0}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          delay="0s"
        />
        <StatusCard
          title="Sent"
          count={statusCounts.SENT || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          delay="0.1s"
        />
        <StatusCard
          title="Dismissed"
          count={statusCounts.DISMISSED || 0}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
          delay="0.2s"
        />
        <StatusCard
          title="Converted"
          count={statusCounts.CONVERTED || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="blue"
          delay="0.3s"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers, vehicles, or services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="CONVERTED">Converted</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Services</option>
              <option value="Oil Change">Oil Change</option>
              <option value="Tire Rotation">Tire Rotation</option>
              <option value="Brake Service">Brake Service</option>
              <option value="Alignment">Alignment</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'customer' | 'service')}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="customer">Sort by Customer</option>
              <option value="service">Sort by Service</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-4">
        {filteredReminders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No reminders found</h3>
            <p className="text-slate-500">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          filteredReminders.map((reminder, index) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onSendReminder={onSendReminder}
              onViewDetails={onViewDetails}
              onUpdateStatus={onUpdateStatus}
              delay={`${index * 0.05}s`}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: 'amber' | 'green' | 'red' | 'blue';
  delay: string;
}

function StatusCard({ title, count, icon, color, delay }: StatusCardProps) {
  const colorClasses = {
    amber: 'from-amber-500 to-amber-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600'
  };

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-stagger"
      style={{ '--stagger-delay': delay } as any}
    >
      <div className="flex items-center">
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{count}</p>
        </div>
      </div>
    </div>
  );
}

interface ReminderCardProps {
  reminder: ServiceReminder;
  onSendReminder?: (id: string, method: string) => void;
  onViewDetails?: (reminder: ServiceReminder) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  delay: string;
}

function ReminderCard({ reminder, onSendReminder, onViewDetails, onUpdateStatus, delay }: ReminderCardProps) {
  const [showActions, setShowActions] = useState(false);
  const overdue = isOverdue(reminder.reminderDate);

  return (
    <div
      className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 card-hover animate-stagger ${overdue ? 'ring-2 ring-red-200' : ''}`}
      style={{ '--stagger-delay': delay } as any}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Status Indicator */}
          <div className="flex-shrink-0">
            {getStatusIcon(reminder.status)}
          </div>

          {/* Customer and Vehicle Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800">
                {reminder.customer?.firstName} {reminder.customer?.lastName}
              </span>
              {overdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Overdue
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Car className="w-4 h-4" />
                <span>{reminder.vehicle?.year} {reminder.vehicle?.make} {reminder.vehicle?.model}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Due: {formatDate(reminder.reminderDate)}</span>
              </div>
            </div>
          </div>

          {/* Service Type and Communication Method */}
          <div className="text-center">
            <div className="font-medium text-slate-800 mb-1">{reminder.serviceType}</div>
            <div className="flex items-center space-x-1 text-sm text-slate-600">
              {getCommunicationIcon(reminder.communicationMethod)}
              <span>{reminder.communicationMethod}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-10 min-w-[200px]">
                {reminder.status === 'PENDING' && onSendReminder && (
                  <button
                    onClick={() => onSendReminder(reminder.id, reminder.communicationMethod)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center space-x-2 text-sm"
                  >
                    <Send className="w-4 h-4 text-blue-500" />
                    <span>Send Reminder</span>
                  </button>
                )}

                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(reminder)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center space-x-2 text-sm"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>View Details</span>
                  </button>
                )}

                {onUpdateStatus && (
                  <div className="border-t border-slate-100 my-1">
                    <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Update Status
                    </div>
                    {['PENDING', 'SENT', 'DISMISSED', 'CONVERTED'].filter(s => s !== reminder.status).map(status => (
                      <button
                        key={status}
                        onClick={() => onUpdateStatus(reminder.id, status)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function getStatusIcon(status: string) {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'SENT':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'DISMISSED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'CONVERTED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  }

  function getCommunicationIcon(method: string) {
    switch (method) {
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'PHONE':
        return <Phone className="w-4 h-4 text-purple-500" />;
      case 'ALL':
        return <Bell className="w-4 h-4 text-orange-500" />;
      default:
        return <Mail className="w-4 h-4 text-gray-500" />;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function isOverdue(reminderDate: string) {
    return new Date(reminderDate) < new Date();
  }
}