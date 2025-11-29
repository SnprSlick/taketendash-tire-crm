import { useState } from 'react';
import { User, Wrench, Phone, ChevronDown, ChevronUp } from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isMechanic: boolean;
  status: string;
}

interface StoreEmployeeListProps {
  employees: Employee[];
}

export default function StoreEmployeeList({ employees }: StoreEmployeeListProps) {
  const mechanics = employees.filter(e => e.isMechanic || e.role === 'TECHNICIAN');
  const others = employees.filter(e => !e.isMechanic && e.role !== 'TECHNICIAN');

  const [showMechanics, setShowMechanics] = useState(false);
  const [showStaff, setShowStaff] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mechanics Column */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button 
          onClick={() => setShowMechanics(!showMechanics)}
          className="w-full px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Technicians</h3>
          </div>
          <div className="flex items-center">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
              {mechanics.length}
            </span>
            {showMechanics ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </button>
        
        {showMechanics && (
          <ul className="divide-y divide-gray-200 animate-in slide-in-from-top-2 duration-200">
            {mechanics.length === 0 ? (
              <li className="px-6 py-4 text-sm text-gray-500 italic">No technicians assigned.</li>
            ) : (
              mechanics.map((emp) => (
                <li key={emp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-500">{emp.role}</p>
                    </div>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {emp.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Other Staff Column */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button 
          onClick={() => setShowStaff(!showStaff)}
          className="w-full px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center">
            <Phone className="w-5 h-5 mr-2 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Service Advisors & Staff</h3>
          </div>
          <div className="flex items-center">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
              {others.length}
            </span>
            {showStaff ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </button>

        {showStaff && (
          <ul className="divide-y divide-gray-200 animate-in slide-in-from-top-2 duration-200">
            {others.length === 0 ? (
              <li className="px-6 py-4 text-sm text-gray-500 italic">No other staff assigned.</li>
            ) : (
              others.map((emp) => (
                <li key={emp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-500">{emp.role}</p>
                    </div>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {emp.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
