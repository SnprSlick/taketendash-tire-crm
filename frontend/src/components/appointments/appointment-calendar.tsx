'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Car,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  Plus
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

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onNewAppointment: (date: string, time?: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointment: Appointment) => void;
  loading?: boolean;
}

export default function AppointmentCalendar({
  appointments,
  onAppointmentClick,
  onNewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  loading = false
}: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Generate time slots for the calendar
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const display = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        slots.push({ time, display });
      }
    }
    return slots;
  }, []);

  // Generate dates for the current view
  const viewDates = useMemo(() => {
    if (viewMode === 'day') {
      return [new Date(currentDate)];
    }

    // Week view - get Monday to Friday
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
    startOfWeek.setDate(diff);

    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate, viewMode]);

  // Get appointments for a specific date and time
  const getAppointmentsForSlot = (date: Date, time: string) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt =>
      apt.appointmentDate.startsWith(dateString) &&
      apt.appointmentTime === time + ':00'
    );
  };

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'NO_SHOW':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Calendar className="h-3 w-3" />;
      case 'CONFIRMED':
        return <CheckCircle className="h-3 w-3" />;
      case 'IN_PROGRESS':
        return <Clock className="h-3 w-3" />;
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3" />;
      case 'CANCELLED':
      case 'NO_SHOW':
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCurrentDateRange = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    const startDate = viewDates[0];
    const endDate = viewDates[viewDates.length - 1];

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'long' })} ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`;
    } else {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${startDate.getFullYear()}`;
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 h-full flex flex-col">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Appointments Calendar</h2>
            <p className="text-gray-600">{getCurrentDateRange()}</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={navigatePrevious}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={navigateToday}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                Today
              </button>

              <button
                onClick={navigateNext}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="grid grid-cols-1 min-h-full" style={{ gridTemplateColumns: viewMode === 'week' ? '80px repeat(5, 1fr)' : '80px 1fr' }}>

            {/* Time Column Header */}
            <div className="bg-gray-50/80 border-r border-gray-200"></div>

            {/* Date Headers */}
            {viewDates.map((date, index) => (
              <div key={index} className="bg-gray-50/80 border-r border-gray-200 p-4 text-center">
                <div className="font-semibold text-gray-900">{formatDateHeader(date)}</div>
                <div className="text-2xl font-bold text-gray-700 mt-1">{date.getDate()}</div>
              </div>
            ))}

            {/* Time Slots and Appointments */}
            {timeSlots.map(({ time, display }, timeIndex) => (
              <div key={timeIndex} className="contents">
                {/* Time Label */}
                <div className="bg-gray-50/80 border-r border-b border-gray-200 p-2 text-right text-sm text-gray-600 sticky left-0">
                  {display}
                </div>

                {/* Appointment Slots */}
                {viewDates.map((date, dateIndex) => {
                  const slotAppointments = getAppointmentsForSlot(date, time);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date < new Date() && date.toDateString() !== new Date().toDateString();

                  return (
                    <div
                      key={dateIndex}
                      className={`border-r border-b border-gray-200 p-1 min-h-[60px] relative group ${
                        isToday ? 'bg-blue-50/50' : ''
                      } ${isPast ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        if (!isPast) {
                          onNewAppointment(date.toISOString().split('T')[0], time);
                        }
                      }}
                    >
                      {/* Add Appointment Button */}
                      {!isPast && slotAppointments.length === 0 && (
                        <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-gray-400" />
                        </button>
                      )}

                      {/* Appointments */}
                      {slotAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(appointment.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appointment);
                            setSelectedAppointment(appointment);
                          }}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            {getStatusIcon(appointment.status)}
                            <span className="font-semibold truncate">
                              {appointment.customer.firstName} {appointment.customer.lastName}
                            </span>
                          </div>

                          <div className="text-xs opacity-80 mb-1 truncate">
                            {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                          </div>

                          <div className="text-xs font-medium truncate">
                            {appointment.serviceType}
                          </div>

                          <div className="text-xs opacity-70 mt-1">
                            {appointment.duration} min
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal/Sidebar (if selected) */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {getStatusIcon(selectedAppointment.status)}
                  <span className="ml-1">{selectedAppointment.status.replace('_', ' ')}</span>
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    {selectedAppointment.customer.firstName} {selectedAppointment.customer.lastName}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3 w-3" />
                    <span>{selectedAppointment.customer.phone}</span>
                  </div>
                  {selectedAppointment.customer.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3" />
                      <span>{selectedAppointment.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Car className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    {selectedAppointment.vehicle.year} {selectedAppointment.vehicle.make} {selectedAppointment.vehicle.model}
                  </span>
                </div>
                {selectedAppointment.vehicle.licensePlate && (
                  <div className="text-sm text-gray-600">
                    License: {selectedAppointment.vehicle.licensePlate}
                  </div>
                )}
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span>{new Date(selectedAppointment.appointmentDate).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span>
                    {new Date(`2000-01-01T${selectedAppointment.appointmentTime}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })} ({selectedAppointment.duration} minutes)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">{selectedAppointment.serviceType}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span>
                    {selectedAppointment.employee.firstName} {selectedAppointment.employee.lastName}
                  </span>
                </div>

                {selectedAppointment.description && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedAppointment.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  onEditAppointment(selectedAppointment);
                  setSelectedAppointment(null);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>

              <button
                onClick={() => {
                  onDeleteAppointment(selectedAppointment);
                  setSelectedAppointment(null);
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading appointments...</span>
          </div>
        </div>
      )}
    </div>
  );
}