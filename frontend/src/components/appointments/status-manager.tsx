'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  Car,
  FileText,
  ArrowRight,
  Save,
  RotateCcw
} from 'lucide-react';

interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  employeeId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  serviceType: string;
  description?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
  };
  employee: {
    firstName: string;
    lastName: string;
  };
}

interface StatusManagerProps {
  appointment: Appointment;
  onStatusUpdate: (appointmentId: string, newStatus: string, notes?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const statusConfigs = {
  SCHEDULED: {
    color: 'blue',
    icon: Calendar,
    label: 'Scheduled',
    description: 'Appointment is scheduled and awaiting confirmation',
    nextStates: ['CONFIRMED', 'CANCELLED']
  },
  CONFIRMED: {
    color: 'green',
    icon: CheckCircle,
    label: 'Confirmed',
    description: 'Customer has confirmed the appointment',
    nextStates: ['IN_PROGRESS', 'NO_SHOW', 'CANCELLED']
  },
  IN_PROGRESS: {
    color: 'purple',
    icon: Clock,
    label: 'In Progress',
    description: 'Service is currently being performed',
    nextStates: ['COMPLETED', 'CANCELLED']
  },
  COMPLETED: {
    color: 'gray',
    icon: CheckCircle,
    label: 'Completed',
    description: 'Service has been completed successfully',
    nextStates: []
  },
  CANCELLED: {
    color: 'red',
    icon: XCircle,
    label: 'Cancelled',
    description: 'Appointment was cancelled',
    nextStates: ['SCHEDULED']
  },
  NO_SHOW: {
    color: 'orange',
    icon: AlertCircle,
    label: 'No Show',
    description: 'Customer did not show up for the appointment',
    nextStates: ['SCHEDULED']
  }
};

export default function StatusManager({
  appointment,
  onStatusUpdate,
  onCancel,
  loading = false
}: StatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(appointment.status);
  const [notes, setNotes] = useState(appointment.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatusConfig = statusConfigs[appointment.status];
  const selectedStatusConfig = statusConfigs[selectedStatus];

  const getStatusColor = (status: string, type: 'bg' | 'text' | 'border' = 'bg') => {
    const config = statusConfigs[status as keyof typeof statusConfigs];
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
      red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' }
    };
    return (colorMap as any)[config.color]?.[type] || colorMap.gray[type];
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus as typeof appointment.status);
  };

  const handleSave = async () => {
    if (selectedStatus === appointment.status && notes === (appointment.notes || '')) {
      onCancel();
      return;
    }

    try {
      setIsUpdating(true);
      await onStatusUpdate(appointment.id, selectedStatus, notes);
      onCancel();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = () => {
    setSelectedStatus(appointment.status);
    setNotes(appointment.notes || '');
  };

  const hasChanges = selectedStatus !== appointment.status || notes !== (appointment.notes || '');

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Manage Appointment Status</h2>
        <p className="text-gray-600">Update the status and add notes for this appointment</p>
      </div>

      {/* Appointment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="font-medium">
                {appointment.customer.firstName} {appointment.customer.lastName}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">{appointment.customer.phone}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-gray-600" />
              <span>
                {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                {appointment.vehicle.licensePlate && ` (${appointment.vehicle.licensePlate})`}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-medium">{appointment.serviceType}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span>{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
              <span>at</span>
              <span>
                {new Date(`2000-01-01T${appointment.appointmentTime}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span>{appointment.duration} minutes</span>
            </div>

            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span>
                {appointment.employee.firstName} {appointment.employee.lastName}
              </span>
            </div>
          </div>
        </div>

        {appointment.description && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">{appointment.description}</p>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Status</h3>
        <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${getStatusColor(appointment.status, 'bg')} ${getStatusColor(appointment.status, 'text')} ${getStatusColor(appointment.status, 'border')}`}>
          {React.createElement(currentStatusConfig.icon, { className: 'h-4 w-4 mr-2' })}
          <span className="font-medium">{currentStatusConfig.label}</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{currentStatusConfig.description}</p>
      </div>

      {/* Status Transition */}
      {currentStatusConfig.nextStates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Update To</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentStatusConfig.nextStates.map((status) => {
              const config = statusConfigs[status as keyof typeof statusConfigs];
              const isSelected = selectedStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={loading || isUpdating}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${getStatusColor(status, 'bg')} ${getStatusColor(status, 'border')} ${getStatusColor(status, 'text')}`
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center space-x-3">
                    {React.createElement(config.icon, { className: 'h-5 w-5' })}
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className={`text-xs mt-1 ${isSelected ? 'opacity-80' : 'text-gray-500'}`}>
                        {config.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Change Preview */}
      {selectedStatus !== appointment.status && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-lg ${getStatusColor(appointment.status, 'bg')} ${getStatusColor(appointment.status, 'text')}`}>
                {React.createElement(currentStatusConfig.icon, { className: 'h-3 w-3 mr-1' })}
                <span className="text-sm font-medium">{currentStatusConfig.label}</span>
              </div>

              <ArrowRight className="h-4 w-4 text-gray-500" />

              <div className={`inline-flex items-center px-3 py-1 rounded-lg ${getStatusColor(selectedStatus, 'bg')} ${getStatusColor(selectedStatus, 'text')}`}>
                {React.createElement(selectedStatusConfig.icon, { className: 'h-3 w-3 mr-1' })}
                <span className="text-sm font-medium">{selectedStatusConfig.label}</span>
              </div>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Status will change from {currentStatusConfig.label} to {selectedStatusConfig.label}
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this status change..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          disabled={loading || isUpdating}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <div>
          {hasChanges && (
            <button
              onClick={handleReset}
              disabled={loading || isUpdating}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={loading || isUpdating}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading || isUpdating || !hasChanges}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {hasChanges ? 'Save Changes' : 'No Changes'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}