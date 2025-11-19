'use client';

import { useState, useEffect, useCallback } from 'react';
import { accountAudit } from '../../lib/logging/account-audit';
import {
  FileText,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  X,
  Download,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  Bell,
  User,
  Mail,
  Phone
} from 'lucide-react';

interface Contract {
  id: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  value: number;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'TERMINATED';
  renewalDate?: string;
  terms: string;
  paymentTerms: string;
  discountRate?: number;
  autoRenewal: boolean;
  documents: ContractDocument[];
  signatories: Signatory[];
  milestones: Milestone[];
}

interface ContractDocument {
  id: string;
  name: string;
  type: 'MAIN_CONTRACT' | 'AMENDMENT' | 'RENEWAL' | 'TERMINATION' | 'OTHER';
  uploadDate: string;
  size: number;
  url: string;
}

interface Signatory {
  id: string;
  name: string;
  role: string;
  email: string;
  signedDate?: string;
  status: 'PENDING' | 'SIGNED' | 'DECLINED';
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completedDate?: string;
  status: 'UPCOMING' | 'DUE' | 'COMPLETED' | 'OVERDUE';
}

interface ContractManagerProps {
  accountId: string;
  onContractUpdate?: (contracts: Contract[]) => void;
}

export default function ContractManager({ accountId, onContractUpdate }: ContractManagerProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contract>>({});

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now - replace with actual API call
      const mockContracts: Contract[] = [
        {
          id: '1',
          contractNumber: 'LA-2024-001',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          value: 150000,
          status: 'ACTIVE',
          renewalDate: '2024-10-01',
          terms: 'Standard large account terms with premium service level',
          paymentTerms: 'Net 30',
          discountRate: 15,
          autoRenewal: true,
          documents: [
            {
              id: '1',
              name: 'Master Service Agreement 2024.pdf',
              type: 'MAIN_CONTRACT',
              uploadDate: '2024-01-01T00:00:00Z',
              size: 245760,
              url: '/contracts/msa-2024.pdf'
            }
          ],
          signatories: [
            {
              id: '1',
              name: 'John Smith',
              role: 'Account Manager',
              email: 'john.smith@company.com',
              signedDate: '2024-01-01T00:00:00Z',
              status: 'SIGNED'
            }
          ],
          milestones: [
            {
              id: '1',
              title: 'Contract Renewal Review',
              description: 'Schedule renewal discussion with customer',
              dueDate: '2024-10-01',
              status: 'UPCOMING'
            }
          ]
        }
      ];

      setContracts(mockContracts);
      if (mockContracts.length > 0) {
        setSelectedContract(mockContracts[0]);
      }

      // Log contract view
      await accountAudit.logAction({
        action: 'VIEW',
        resourceType: 'CONTRACT',
        resourceId: accountId,
        details: {
          contractCount: mockContracts.length,
          contractNumbers: mockContracts.map(c => c.contractNumber),
        },
      });

      onContractUpdate?.(mockContracts);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [accountId, onContractUpdate]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleSaveContract = async () => {
    if (!selectedContract || !editForm) return;

    try {
      setSaving(true);
      // Replace with actual API call
      const updatedContract = { ...selectedContract, ...editForm };

      setContracts(prev =>
        prev.map(contract =>
          contract.id === selectedContract.id ? updatedContract : contract
        )
      );

      setSelectedContract(updatedContract);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      console.error('Error saving contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'EXPIRED': return 'text-red-600 bg-red-100';
      case 'TERMINATED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return CheckCircle;
      case 'PENDING': return Clock;
      case 'EXPIRED': return AlertTriangle;
      case 'TERMINATED': return X;
      default: return Clock;
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Contracts</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchContracts}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Contract Management
            </h2>
            <button
              onClick={() => setShowNewContract(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Contract
            </button>
          </div>
        </div>

        <div className="p-6">
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts Found</h3>
              <p className="text-gray-600 mb-6">This account doesn't have any contracts yet.</p>
              <button
                onClick={() => setShowNewContract(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Contract
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contract List */}
              <div className="lg:col-span-1">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contracts</h3>
                <div className="space-y-2">
                  {contracts.map((contract) => {
                    const StatusIcon = getStatusIcon(contract.status);
                    const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);

                    return (
                      <div
                        key={contract.id}
                        onClick={() => setSelectedContract(contract)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedContract?.id === contract.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{contract.contractNumber}</span>
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{contract.status}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>Value: ${contract.value.toLocaleString()}</div>
                          <div>Expires: {new Date(contract.endDate).toLocaleDateString()}</div>
                          {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                            <div className="text-orange-600 font-medium">
                              Expires in {daysUntilExpiry} days
                            </div>
                          )}
                          {daysUntilExpiry <= 0 && (
                            <div className="text-red-600 font-medium">
                              Expired {Math.abs(daysUntilExpiry)} days ago
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contract Details */}
              <div className="lg:col-span-2">
                {selectedContract ? (
                  <div className="space-y-6">
                    {/* Contract Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedContract.contractNumber}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        {isEditing && (
                          <button
                            onClick={handleSaveContract}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contract Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.startDate || selectedContract.startDate}
                            onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">
                            {new Date(selectedContract.startDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.endDate || selectedContract.endDate}
                            onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">
                            {new Date(selectedContract.endDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Contract Value</label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.value || selectedContract.value}
                            onChange={(e) => setEditForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {selectedContract.value.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Payment Terms</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.paymentTerms || selectedContract.paymentTerms}
                            onChange={(e) => setEditForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{selectedContract.paymentTerms}</p>
                        )}
                      </div>
                    </div>

                    {/* Terms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Contract Terms</label>
                      {isEditing ? (
                        <textarea
                          value={editForm.terms || selectedContract.terms}
                          onChange={(e) => setEditForm(prev => ({ ...prev, terms: e.target.value }))}
                          rows={4}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                          {selectedContract.terms}
                        </p>
                      )}
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Contract Documents</h4>
                      <div className="space-y-2">
                        {selectedContract.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.type} • {(doc.size / 1024).toFixed(1)} KB •
                                  Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(doc.url, '_blank')}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700">
                          <Upload className="w-4 h-4 mx-auto mb-1" />
                          Upload Document
                        </button>
                      </div>
                    </div>

                    {/* Milestones */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Contract Milestones</h4>
                      <div className="space-y-3">
                        {selectedContract.milestones.map((milestone) => (
                          <div key={milestone.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                              <p className="text-xs text-gray-500">{milestone.description}</p>
                              <p className="text-xs text-gray-500">
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                              milestone.status === 'COMPLETED' ? 'text-green-600 bg-green-100' :
                              milestone.status === 'OVERDUE' ? 'text-red-600 bg-red-100' :
                              milestone.status === 'DUE' ? 'text-orange-600 bg-orange-100' :
                              'text-gray-600 bg-gray-100'
                            }`}>
                              {milestone.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">Select a contract to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}