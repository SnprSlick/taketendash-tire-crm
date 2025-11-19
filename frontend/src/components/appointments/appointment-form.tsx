'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Car,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Save
} from 'lucide-react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
}

interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AppointmentFormData {
  customerId: string;
  vehicleId: string;
  employeeId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  serviceType: string;
  description?: string;
  status?: string;
}

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormData>;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  customers?: Customer[];
  vehicles?: Vehicle[];
  employees?: Employee[];
}

export default function AppointmentForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  customers = [],
  vehicles = [],
  employees = []
}: AppointmentFormProps) {
  const [formData, setFormData] = useState<AppointmentFormData>({
    customerId: '',
    vehicleId: '',
    employeeId: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 90,
    serviceType: '',
    description: '',
    status: 'SCHEDULED',
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

  // Filter vehicles when customer changes
  useEffect(() => {
    if (formData.customerId) {
      const customerVehicles = vehicles.filter(v => v.customerId === formData.customerId);
      setAvailableVehicles(customerVehicles);

      // Reset vehicle selection if current vehicle doesn't belong to selected customer
      if (formData.vehicleId && !customerVehicles.some(v => v.id === formData.vehicleId)) {
        setFormData(prev => ({ ...prev, vehicleId: '' }));
      }
    } else {
      setAvailableVehicles([]);
    }
  }, [formData.customerId, vehicles]);

  const handleInputChange = (field: keyof AppointmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }

    if (!formData.vehicleId) {
      newErrors.vehicleId = 'Vehicle is required';
    }

    if (!formData.employeeId) {
      newErrors.employeeId = 'Service advisor is required';
    }

    if (!formData.appointmentDate) {
      newErrors.appointmentDate = 'Appointment date is required';
    } else {
      const appointmentDate = new Date(formData.appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        newErrors.appointmentDate = 'Appointment date cannot be in the past';
      }
    }

    if (!formData.appointmentTime) {
      newErrors.appointmentTime = 'Appointment time is required';
    }

    if (!formData.serviceType.trim()) {
      newErrors.serviceType = 'Service type is required';
    }

    if (formData.duration < 15 || formData.duration > 480) {
      newErrors.duration = 'Duration must be between 15 minutes and 8 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit appointment:', error);
    }
  };

  const serviceTypes = [
    'Oil Change',
    'Tire Installation',
    'Tire Rotation',
    'Brake Service',
    'Alignment',
    'Inspection',
    'General Maintenance',
    'Repair',
    'Other'
  ];

  const timeSlots = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const display12 = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      timeSlots.push({ value: time, label: display12 });
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {initialData?.customerId ? 'Edit Appointment' : 'New Appointment'}
        </h2>
        <p className="text-gray-600">
          Schedule a new service appointment for a customer
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <User className="h-4 w-4 mr-2" />
            Customer
          </label>
          <select
            value={formData.customerId}
            onChange={(e) => handleInputChange('customerId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.customerId ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.firstName} {customer.lastName} - {customer.phone}
              </option>
            ))}
          </select>
          {errors.customerId && (
            <p className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.customerId}
            </p>
          )}
        </div>

        {/* Vehicle Selection */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Car className="h-4 w-4 mr-2" />
            Vehicle
          </label>
          <select
            value={formData.vehicleId}
            onChange={(e) => handleInputChange('vehicleId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.vehicleId ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading || !formData.customerId}
          >
            <option value="">Select a vehicle</option>
            {availableVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.licensePlate && ` - ${vehicle.licensePlate}`}
              </option>
            ))}
          </select>
          {errors.vehicleId && (
            <p className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.vehicleId}
            </p>
          )}
          {formData.customerId && availableVehicles.length === 0 && (
            <p className="text-sm text-amber-600">
              No vehicles found for this customer
            </p>
          )}
        </div>

        {/* Service Advisor Selection */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Users className="h-4 w-4 mr-2" />
            Service Advisor
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => handleInputChange('employeeId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.employeeId ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading}
          >
            <option value="">Select a service advisor</option>
            {employees.filter(emp => emp.role === 'SERVICE_ADVISOR' || emp.role === 'MANAGER').map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName} ({employee.role.replace('_', ' ').toLowerCase()})
              </option>
            ))}
          </select>
          {errors.employeeId && (
            <p className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.employeeId}
            </p>
          )}
        </div>

        {/* Date and Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 mr-2" />
              Date
            </label>
            <input
              type="date"
              value={formData.appointmentDate}
              onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.appointmentDate ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.appointmentDate && (
              <p className="flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.appointmentDate}
              </p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4 mr-2" />
              Time
            </label>
            <select
              value={formData.appointmentTime}
              onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.appointmentTime ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">Select time</option>
              {timeSlots.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
            {errors.appointmentTime && (
              <p className="flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.appointmentTime}
              </p>
            )}
          </div>
        </div>

        {/* Service Type and Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Service Type */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 mr-2" />
              Service Type
            </label>
            <select
              value={formData.serviceType}
              onChange={(e) => handleInputChange('serviceType', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.serviceType ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">Select service type</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.serviceType && (
              <p className="flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.serviceType}
              </p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4 mr-2" />
              Duration (minutes)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.duration ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={150}>2.5 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
            </select>
            {errors.duration && (
              <p className="flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.duration}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <FileText className="h-4 w-4 mr-2" />
            Description (optional)
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Additional details about the service needed..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Appointment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}