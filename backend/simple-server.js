const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Mock data
const mockAccounts = [
  {
    id: 'acc-001',
    customerId: 'cust-001',
    accountType: 'ENTERPRISE',
    tier: 'PLATINUM',
    annualRevenue: 250000,
    contractStartDate: '2024-01-01',
    contractEndDate: '2024-12-31',
    status: 'ACTIVE',
    accountManager: 'John Smith',
    specialTerms: 'Volume discount applied, priority support included',
    discountTier: 15,
    serviceLevel: 'PREMIUM',
    priorityRanking: 1,
    contractNumber: 'LA-2024-001',
    creditLimit: 50000,
    paymentTerms: 'Net 30',
    billingContact: 'Jane Doe',
    billingEmail: 'billing@acefleet.com',
    notes: 'High-value account, excellent payment history',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-11-19T18:00:00Z'
  },
  {
    id: 'acc-002',
    customerId: 'cust-002',
    accountType: 'COMMERCIAL',
    tier: 'GOLD',
    annualRevenue: 125000,
    contractStartDate: '2024-03-01',
    contractEndDate: '2025-02-28',
    status: 'ACTIVE',
    accountManager: 'Sarah Johnson',
    specialTerms: 'Seasonal pricing adjustment',
    discountTier: 10,
    serviceLevel: 'ENHANCED',
    priorityRanking: 3,
    contractNumber: 'LA-2024-007',
    creditLimit: 25000,
    paymentTerms: 'Net 15',
    billingContact: 'Mike Wilson',
    billingEmail: 'accounting@rapidlogistics.com',
    notes: 'Growing account, potential for tier upgrade',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-11-19T17:30:00Z'
  }
];

const mockAccountDetail = (account) => ({
  ...account,
  customer: {
    id: account.customerId,
    companyName: account.id === 'acc-001' ? 'Ace Fleet Services' : 'Rapid Logistics Inc',
    contactInfo: {
      firstName: account.id === 'acc-001' ? 'Robert' : 'Michael',
      lastName: account.id === 'acc-001' ? 'Johnson' : 'Williams',
      email: account.id === 'acc-001' ? 'robert@acefleet.com' : 'mike@rapidlogistics.com',
      phone: account.id === 'acc-001' ? '(555) 123-4567' : '(555) 987-6543',
      address: account.id === 'acc-001' ? '123 Fleet St, Transport City, TC 12345' : '456 Cargo Ave, Logistics Town, LT 67890'
    }
  },
  healthScore: {
    overallScore: account.id === 'acc-001' ? 92 : 78,
    revenueHealth: account.id === 'acc-001' ? 95 : 85,
    serviceHealth: account.id === 'acc-001' ? 88 : 72,
    paymentHealth: account.id === 'acc-001' ? 94 : 76,
    relationshipHealth: account.id === 'acc-001' ? 90 : 79,
    riskFactors: account.id === 'acc-001' ? [] : ['Payment delays', 'Service escalations'],
    recommendations: account.id === 'acc-001' ?
      ['Maintain current service level', 'Consider upselling premium services'] :
      ['Improve payment terms', 'Schedule account review meeting']
  }
});

// Large Accounts API Routes
app.get('/api/v1/large-accounts', (req, res) => {
  try {
    console.log('GET /api/v1/large-accounts - Query params:', req.query);

    // Apply filters
    let filteredAccounts = [...mockAccounts];

    if (req.query.tier) {
      filteredAccounts = filteredAccounts.filter(acc => acc.tier === req.query.tier);
    }

    if (req.query.status) {
      filteredAccounts = filteredAccounts.filter(acc => acc.status === req.query.status);
    }

    if (req.query.accountType) {
      filteredAccounts = filteredAccounts.filter(acc => acc.accountType === req.query.accountType);
    }

    if (req.query.accountManager) {
      filteredAccounts = filteredAccounts.filter(acc =>
        acc.accountManager.toLowerCase().includes(req.query.accountManager.toLowerCase())
      );
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const paginatedAccounts = filteredAccounts.slice(skip, skip + limit);

    res.json({
      data: paginatedAccounts,
      pagination: {
        page,
        limit,
        total: filteredAccounts.length,
        totalPages: Math.ceil(filteredAccounts.length / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/v1/large-accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/large-accounts/:id', (req, res) => {
  try {
    console.log(`GET /api/v1/large-accounts/${req.params.id}`);

    const account = mockAccounts.find(acc => acc.id === req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const accountDetail = mockAccountDetail(account);
    res.json({ data: accountDetail });
  } catch (error) {
    console.error(`Error in GET /api/v1/large-accounts/${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notifications API
app.get('/api/notifications/accounts', (req, res) => {
  try {
    console.log('GET /api/notifications/accounts - Query params:', req.query);

    const notifications = [
      {
        id: 'notif-001',
        type: 'contract_expiring',
        severity: 'high',
        accountId: req.query.accountId || 'acc-001',
        accountName: 'Ace Fleet Services',
        title: 'Contract Expiring Soon',
        message: 'Contract LA-2024-001 expires in 15 days. Please initiate renewal process.',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        actionRequired: true,
        createdAt: new Date().toISOString(),
        dismissed: false
      },
      {
        id: 'notif-002',
        type: 'payment_overdue',
        severity: 'critical',
        accountId: req.query.accountId || 'acc-001',
        accountName: 'Ace Fleet Services',
        title: 'Payment Overdue',
        message: 'Invoice #INV-2024-1102 is 7 days overdue.',
        amount: 15750.00,
        actionRequired: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dismissed: false
      }
    ];

    res.json({ notifications });
  } catch (error) {
    console.error('Error in GET /api/notifications/accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/notifications/accounts/:id/dismiss', (req, res) => {
  try {
    console.log(`POST /api/notifications/accounts/${req.params.id}/dismiss`);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error in POST /api/notifications/accounts/${req.params.id}/dismiss:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth API
app.get('/api/auth/user', (req, res) => {
  try {
    console.log('GET /api/auth/user');
    res.json({
      id: 'user-001',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@tirecrm.com',
      role: 'admin'
    });
  } catch (error) {
    console.error('Error in GET /api/auth/user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit API
app.post('/api/audit/log', (req, res) => {
  try {
    console.log('POST /api/audit/log - Body:', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/audit/log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tire Master API Routes
app.get('/api/v1/tire-master/products/search', (req, res) => {
  try {
    console.log('GET /api/v1/tire-master/products/search - Query params:', req.query);

    const mockProducts = [
      {
        id: 'tm-001',
        tireMasterSku: 'BF-KO2-31X10.50R15',
        brand: 'BFGoodrich',
        pattern: 'All-Terrain T/A KO2',
        size: '31X10.50R15',
        type: 'LIGHT_TRUCK',
        season: 'ALL_SEASON',
        description: 'Premium all-terrain tire for light trucks and SUVs',
        weight: 52.5,
        specifications: {
          loadIndex: '109',
          speedRating: 'S',
          construction: 'Radial'
        },
        warrantyInfo: '60,000 mile treadwear warranty',
        features: ['Aggressive tread', 'Sidewall protection', 'All-terrain capability'],
        isActive: true,
        lastSyncedAt: '2024-11-19T20:00:00Z'
      },
      {
        id: 'tm-002',
        tireMasterSku: 'MIC-DEF-P225/60R16',
        brand: 'Michelin',
        pattern: 'Defender T+H',
        size: 'P225/60R16',
        type: 'PASSENGER',
        season: 'ALL_SEASON',
        description: 'Long-lasting passenger car tire',
        weight: 28.3,
        specifications: {
          loadIndex: '98',
          speedRating: 'T',
          construction: 'Radial'
        },
        warrantyInfo: '80,000 mile treadwear warranty',
        features: ['MaxTouch Construction', 'IntelliSipe Technology', 'Fuel efficient'],
        isActive: true,
        lastSyncedAt: '2024-11-19T19:30:00Z'
      }
    ];

    res.json({
      products: mockProducts,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error in GET /api/v1/tire-master/products/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/tire-master/products/:productId', (req, res) => {
  try {
    console.log(`GET /api/v1/tire-master/products/${req.params.productId}`);

    const mockProduct = {
      id: req.params.productId,
      tireMasterSku: 'BF-KO2-31X10.50R15',
      brand: 'BFGoodrich',
      pattern: 'All-Terrain T/A KO2',
      size: '31X10.50R15',
      type: 'LIGHT_TRUCK',
      season: 'ALL_SEASON',
      description: 'Premium all-terrain tire for light trucks and SUVs',
      weight: 52.5,
      specifications: {
        loadIndex: '109',
        speedRating: 'S',
        construction: 'Radial'
      },
      warrantyInfo: '60,000 mile treadwear warranty',
      features: ['Aggressive tread', 'Sidewall protection', 'All-terrain capability'],
      isActive: true,
      lastSyncedAt: '2024-11-19T20:00:00Z',
      inventory: [
        {
          id: 'inv-001',
          locationId: 'loc-001',
          quantity: 12,
          reservedQty: 2,
          availableQty: 10,
          location: {
            id: 'loc-001',
            name: 'Main Warehouse',
            tireMasterCode: 'MW001'
          }
        }
      ],
      prices: [
        {
          id: 'price-001',
          priceListId: 'pl-001',
          listPrice: 285.99,
          cost: 215.50,
          msrp: 299.99,
          priceList: {
            id: 'pl-001',
            name: 'Standard Retail',
            tireMasterCode: 'STD'
          }
        }
      ]
    };

    res.json({ data: mockProduct });
  } catch (error) {
    console.error(`Error in GET /api/v1/tire-master/products/${req.params.productId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/tire-master/sync', (req, res) => {
  try {
    console.log('POST /api/v1/tire-master/sync - Body:', JSON.stringify(req.body, null, 2));

    const syncResult = {
      syncId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recordsProcessed: 150,
      recordsUpdated: 120,
      recordsCreated: 30,
      errors: [],
      duration: 45000
    };

    res.json({
      success: true,
      message: 'Tire Master sync completed successfully',
      data: syncResult
    });
  } catch (error) {
    console.error('Error in POST /api/v1/tire-master/sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/tire-master/sync/status', (req, res) => {
  try {
    console.log('GET /api/v1/tire-master/sync/status');

    res.json({
      activeSyncs: [],
      lastSync: {
        id: 'sync-last-001',
        syncType: 'PRODUCTS',
        status: 'COMPLETED',
        startTime: '2024-11-19T19:00:00Z',
        endTime: '2024-11-19T19:02:15Z',
        recordsProcessed: 150
      },
      integrationHealth: {
        healthScore: 95,
        status: 'HEALTHY',
        lastSuccessfulSync: '2024-11-19T19:02:15Z',
        recentFailures: 0,
        activeMappings: 50,
        totalProducts: 1250,
        checks: {
          connectivity: true,
          dataSync: true,
          mappings: true
        }
      }
    });
  } catch (error) {
    console.error('Error in GET /api/v1/tire-master/sync/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/tire-master/inventory/:locationId', (req, res) => {
  try {
    console.log(`GET /api/v1/tire-master/inventory/${req.params.locationId}`);

    const mockInventory = [
      {
        id: 'inv-001',
        productId: 'tm-001',
        locationId: req.params.locationId,
        quantity: 12,
        reservedQty: 2,
        availableQty: 10,
        lastUpdated: '2024-11-19T18:30:00Z',
        product: {
          id: 'tm-001',
          tireMasterSku: 'BF-KO2-31X10.50R15',
          brand: 'BFGoodrich',
          pattern: 'All-Terrain T/A KO2',
          size: '31X10.50R15'
        },
        location: {
          id: req.params.locationId,
          name: 'Main Warehouse',
          tireMasterCode: 'MW001'
        }
      }
    ];

    res.json(mockInventory);
  } catch (error) {
    console.error(`Error in GET /api/v1/tire-master/inventory/${req.params.locationId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Tire CRM Backend'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Large Accounts API: http://localhost:${PORT}/api/v1/large-accounts`);
});