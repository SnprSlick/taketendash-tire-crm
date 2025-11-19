'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/dashboard-layout';
import AppointmentForm from '../../components/appointments/appointment-form';
import AppointmentCalendar from '../../components/appointments/appointment-calendar';

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
  customer: Customer;
  vehicle: Vehicle;
  employee: Employee;
}

interface AppointmentStats {
  total: number;
  scheduled: number;
  confirmed: number;
  inProgress: number;
  completed: number;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    scheduled: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0
  });

  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadAppointments();
    loadCustomers();
    loadVehicles();
    loadEmployees();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      // Mock data for now - in real app, this would be an API call
      const mockAppointments: Appointment[] = [
        {
          id: '1',
          customerId: '1',
          vehicleId: '1',
          employeeId: '1',
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: '09:00:00',
          duration: 60,
          serviceType: 'Oil Change',
          description: 'Regular maintenance',
          status: 'SCHEDULED',
          customer: { id: '1', firstName: 'John', lastName: 'Doe', phone: '555-0123', email: 'john@example.com' },
          vehicle: { id: '1', customerId: '1', make: 'Toyota', model: 'Camry', year: 2020, licensePlate: 'ABC123' },
          employee: { id: '1', firstName: 'Jane', lastName: 'Smith', role: 'SERVICE_ADVISOR' }
        }
      ];

      setAppointments(mockAppointments);

      // Calculate stats
      const newStats = mockAppointments.reduce((acc, apt) => {
        acc.total++;
        switch (apt.status) {
          case 'SCHEDULED':
            acc.scheduled++;
            break;
          case 'CONFIRMED':
            acc.confirmed++;
            break;
          case 'IN_PROGRESS':
            acc.inProgress++;
            break;
          case 'COMPLETED':
            acc.completed++;
            break;
        }
        return acc;
      }, { total: 0, scheduled: 0, confirmed: 0, inProgress: 0, completed: 0 });

      setStats(newStats);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      // Mock data - in real app, this would be an API call
      const mockCustomers: Customer[] = [
        { id: '1', firstName: 'John', lastName: 'Doe', phone: '555-0123', email: 'john@example.com' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', phone: '555-0124', email: 'jane@example.com' }
      ];
      setCustomers(mockCustomers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      // Mock data - in real app, this would be an API call
      const mockVehicles: Vehicle[] = [
        { id: '1', customerId: '1', make: 'Toyota', model: 'Camry', year: 2020, licensePlate: 'ABC123' },
        { id: '2', customerId: '2', make: 'Honda', model: 'Civic', year: 2019, licensePlate: 'XYZ789' }
      ];
      setVehicles(mockVehicles);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      // Mock data - in real app, this would be an API call
      const mockEmployees: Employee[] = [
        { id: '1', firstName: 'Jane', lastName: 'Smith', role: 'SERVICE_ADVISOR' },
        { id: '2', firstName: 'Bob', lastName: 'Johnson', role: 'MANAGER' }
      ];
      setEmployees(mockEmployees);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleCreateAppointment = async (data: any) => {
    try {
      setLoading(true);

      // Mock API call - in real app, this would POST to /api/appointments
      const newAppointment = {
        id: Date.now().toString(),
        ...data,
        status: 'SCHEDULED',
        customer: customers.find(c => c.id === data.customerId)!,
        vehicle: vehicles.find(v => v.id === data.vehicleId)!,
        employee: employees.find(e => e.id === data.employeeId)!
      };

      setAppointments(prev => [...prev, newAppointment]);
      setShowForm(false);
      setSelectedDate('');
      setSelectedTime('');

      // Recalculate stats
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        scheduled: prev.scheduled + 1
      }));

      console.log('Appointment created:', newAppointment);
    } catch (error) {
      console.error('Failed to create appointment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointment = async (data: any) => {
    try {
      setLoading(true);

      // Mock API call - in real app, this would PUT to /api/appointments/{id}
      const updatedAppointment = {
        ...editingAppointment!,
        ...data,
        customer: customers.find(c => c.id === data.customerId)!,
        vehicle: vehicles.find(v => v.id === data.vehicleId)!,
        employee: employees.find(e => e.id === data.employeeId)!
      };

      setAppointments(prev =>
        prev.map(apt => apt.id === editingAppointment!.id ? updatedAppointment : apt)
      );
      setEditingAppointment(null);
      setShowForm(false);

      console.log('Appointment updated:', updatedAppointment);
    } catch (error) {
      console.error('Failed to update appointment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      setLoading(true);

      // Mock API call - in real app, this would DELETE to /api/appointments/{id}
      setAppointments(prev => prev.filter(apt => apt.id !== appointment.id));

      // Recalculate stats
      setStats(prev => {
        const newStats = { ...prev, total: prev.total - 1 };
        switch (appointment.status) {
          case 'SCHEDULED':
            newStats.scheduled--;
            break;
          case 'CONFIRMED':
            newStats.confirmed--;
            break;
          case 'IN_PROGRESS':
            newStats.inProgress--;
            break;
          case 'COMPLETED':
            newStats.completed--;
            break;
        }
        return newStats;
      });

      console.log('Appointment deleted:', appointment.id);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAppointment = (date?: string, time?: string) => {
    setSelectedDate(date || '');
    setSelectedTime(time || '');
    setEditingAppointment(null);
    setShowForm(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedDate('');
    setSelectedTime('');
    setShowForm(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    // This is handled by the calendar component's detail modal
    console.log('Appointment clicked:', appointment);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAppointment(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  const getFormInitialData = () => {
    if (editingAppointment) {
      return {
        customerId: editingAppointment.customerId,
        vehicleId: editingAppointment.vehicleId,
        employeeId: editingAppointment.employeeId,
        appointmentDate: editingAppointment.appointmentDate,
        appointmentTime: editingAppointment.appointmentTime.substring(0, 5), // Remove seconds
        duration: editingAppointment.duration,
        serviceType: editingAppointment.serviceType,
        description: editingAppointment.description || '',
        status: editingAppointment.status
      };
    }

    return {
      appointmentDate: selectedDate,
      appointmentTime: selectedTime
    };
  };

  return (
    <DashboardLayout title="Appointments">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Appointment Management</h1>
        <p className="text-gray-600">Schedule and manage customer appointments</p>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleNewAppointment()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </button>

              <button
                onClick={loadAppointments}
                disabled={loading}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>

              <button className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {showForm && (
            <div className="mb-6">
              <AppointmentForm
                initialData={getFormInitialData()}
                onSubmit={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
                onCancel={handleCancelForm}
                loading={loading}
                customers={customers}
                vehicles={vehicles}
                employees={employees}
              />
            </div>
          )}

          {/* Calendar */}
          <div className="h-[800px]">
            <AppointmentCalendar
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
              onNewAppointment={handleNewAppointment}
              onEditAppointment={handleEditAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              loading={loading}
            />
          </div>
        </div>
    </DashboardLayout>
  );
}