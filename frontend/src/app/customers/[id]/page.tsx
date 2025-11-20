'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Edit3, Mail, Phone, MapPin } from 'lucide-react';
import CustomerDetail from '../../../components/customers/customer-detail';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const handleBack = () => {
    router.push('/customers');
  };

  const handleEdit = () => {
    // TODO: Navigate to edit page or open edit modal
    console.log('Edit customer:', customerId);
  };

  const handleSendEmail = () => {
    // TODO: Implement email functionality
    console.log('Send email to customer:', customerId);
  };

  const handleCall = () => {
    // TODO: Implement call functionality
    console.log('Call customer:', customerId);
  };

  const handleViewLocation = () => {
    // TODO: Implement map view
    console.log('View customer location:', customerId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <Users className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      #{customerId}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    View customer profile and purchase history
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSendEmail}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </button>

                <button
                  onClick={handleCall}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </button>

                <button
                  onClick={handleViewLocation}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </button>

                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors duration-200"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Customer
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Spent</p>
                    <p className="text-2xl font-bold">Loading...</p>
                  </div>
                  <div className="h-8 w-8 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-green-800 font-bold">$</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                    <p className="text-2xl font-bold">Loading...</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 font-bold">#</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Loyalty Score</p>
                    <p className="text-2xl font-bold">Loading...</p>
                  </div>
                  <div className="h-8 w-8 bg-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-purple-800 font-bold">★</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Risk Score</p>
                    <p className="text-2xl font-bold">Loading...</p>
                  </div>
                  <div className="h-8 w-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-yellow-800 font-bold">!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <CustomerDetail
            customerId={customerId}
            onBack={handleBack}
            className=""
          />
        </div>
      </div>

      {/* Communication Modals */}
      {/* TODO: Add email and call modals when functionality is implemented */}
    </div>
  );
}