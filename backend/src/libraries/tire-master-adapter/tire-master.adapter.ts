import { Injectable, Logger } from '@nestjs/common';

export interface TireMasterCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  vehicles: TireMasterVehicle[];
}

export interface TireMasterVehicle {
  id: string;
  customerId: string;
  year: number;
  make: string;
  model: string;
  vin?: string;
  licensePlate?: string;
  mileage?: number;
  tireSize?: string;
  lastServiceDate?: Date;
}

export interface TireMasterTransaction {
  id: string;
  customerId: string;
  vehicleId?: string;
  date: Date;
  totalAmount: number;
  taxAmount: number;
  items: TireMasterItem[];
  paymentMethod: string;
  invoiceNumber: string;
}

export interface TireMasterItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'tire' | 'service' | 'parts' | 'labor';
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  timestamp: Date;
}

@Injectable()
export class TireMasterAdapter {
  private readonly logger = new Logger(TireMasterAdapter.name);
  private readonly baseUrl = process.env.TIRE_MASTER_API_URL || 'http://localhost:3001/api';
  private readonly apiKey = process.env.TIRE_MASTER_API_KEY || 'demo-key';

  /**
   * Sync customers from Tire Master system
   */
  async syncCustomers(): Promise<SyncResult> {
    this.logger.log('Starting customer sync from Tire Master');

    try {
      // Simulate API call to Tire Master system
      const customers = await this.fetchCustomersFromTireMaster();

      const processedCount = customers.length;
      this.logger.log(`Successfully synced ${processedCount} customers`);

      return {
        success: true,
        recordsProcessed: processedCount,
        errors: [],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Customer sync failed:', error.message);
      return {
        success: false,
        recordsProcessed: 0,
        errors: [error.message],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sync transactions from Tire Master system
   */
  async syncTransactions(fromDate?: Date): Promise<SyncResult> {
    this.logger.log(`Starting transaction sync from Tire Master${fromDate ? ` from ${fromDate.toISOString()}` : ''}`);

    try {
      const transactions = await this.fetchTransactionsFromTireMaster(fromDate);

      const processedCount = transactions.length;
      this.logger.log(`Successfully synced ${processedCount} transactions`);

      return {
        success: true,
        recordsProcessed: processedCount,
        errors: [],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Transaction sync failed:', error.message);
      return {
        success: false,
        recordsProcessed: 0,
        errors: [error.message],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get customer by Tire Master ID
   */
  async getCustomerById(tireMasterId: string): Promise<TireMasterCustomer | null> {
    try {
      // Simulate API call
      this.logger.log(`Fetching customer ${tireMasterId} from Tire Master`);

      // Mock customer data
      return {
        id: tireMasterId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Anytown, ST 12345',
        vehicles: [
          {
            id: `vehicle_${tireMasterId}`,
            customerId: tireMasterId,
            year: 2020,
            make: 'Honda',
            model: 'Civic',
            vin: '1HGBH41JXMN109186',
            licensePlate: 'ABC123',
            mileage: 45000,
            tireSize: '205/55R16',
            lastServiceDate: new Date('2024-10-15'),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to fetch customer ${tireMasterId}:`, error.message);
      return null;
    }
  }

  /**
   * Push updated customer data back to Tire Master
   */
  async pushCustomerUpdate(customer: TireMasterCustomer): Promise<boolean> {
    try {
      this.logger.log(`Pushing customer update for ${customer.id} to Tire Master`);

      // Simulate API call to update customer
      await this.simulateApiCall();

      this.logger.log(`Customer ${customer.id} successfully updated in Tire Master`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update customer ${customer.id}:`, error.message);
      return false;
    }
  }

  /**
   * Get transaction details from Tire Master
   */
  async getTransactionById(transactionId: string): Promise<TireMasterTransaction | null> {
    try {
      this.logger.log(`Fetching transaction ${transactionId} from Tire Master`);

      // Mock transaction data
      return {
        id: transactionId,
        customerId: 'cust_123',
        vehicleId: 'vehicle_123',
        date: new Date('2024-11-15'),
        totalAmount: 450.00,
        taxAmount: 36.00,
        items: [
          {
            id: 'item_1',
            description: 'Tire Installation',
            quantity: 4,
            unitPrice: 75.00,
            totalPrice: 300.00,
            category: 'service',
          },
          {
            id: 'item_2',
            description: 'Wheel Balancing',
            quantity: 4,
            unitPrice: 15.00,
            totalPrice: 60.00,
            category: 'service',
          },
          {
            id: 'item_3',
            description: 'Valve Stems',
            quantity: 4,
            unitPrice: 8.50,
            totalPrice: 34.00,
            category: 'parts',
          },
        ],
        paymentMethod: 'Credit Card',
        invoiceNumber: 'INV-2024-001234',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch transaction ${transactionId}:`, error.message);
      return null;
    }
  }

  /**
   * Transform Tire Master customer to our system format
   */
  transformCustomer(tmCustomer: TireMasterCustomer): {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    isActive: boolean;
    tirePreferenceBrand?: string;
    communicationPreference?: string;
  } {
    return {
      firstName: tmCustomer.firstName,
      lastName: tmCustomer.lastName,
      email: tmCustomer.email,
      phone: tmCustomer.phone,
      address: tmCustomer.address,
      isActive: true,
      communicationPreference: 'email',
    };
  }

  /**
   * Transform Tire Master transaction to our sales data format
   */
  transformTransaction(tmTransaction: TireMasterTransaction): {
    salesDate: Date;
    totalAmount: number;
    discountAmount: number;
    taxAmount: number;
    netAmount: number;
    paymentMethod: string;
    category: string;
    description?: string;
    itemsSold: number;
    laborHours?: number;
    partsCost?: number;
    laborCost?: number;
    invoiceNumber?: string;
  } {
    const laborItems = tmTransaction.items.filter(item => item.category === 'labor');
    const partsItems = tmTransaction.items.filter(item => item.category === 'parts' || item.category === 'tire');
    const serviceItems = tmTransaction.items.filter(item => item.category === 'service');

    const laborCost = laborItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const partsCost = partsItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Estimate labor hours (assuming $75/hour average)
    const laborHours = laborCost > 0 ? laborCost / 75 : 0;

    return {
      salesDate: tmTransaction.date,
      totalAmount: tmTransaction.totalAmount,
      discountAmount: 0, // Not provided by Tire Master
      taxAmount: tmTransaction.taxAmount,
      netAmount: tmTransaction.totalAmount - tmTransaction.taxAmount,
      paymentMethod: tmTransaction.paymentMethod,
      category: this.determinePrimaryCategory(tmTransaction.items),
      description: tmTransaction.items.map(item => item.description).join(', '),
      itemsSold: tmTransaction.items.reduce((sum, item) => sum + item.quantity, 0),
      laborHours,
      partsCost,
      laborCost,
      invoiceNumber: tmTransaction.invoiceNumber,
    };
  }

  private async fetchCustomersFromTireMaster(): Promise<TireMasterCustomer[]> {
    // Simulate API call with mock data
    await this.simulateApiCall();

    return [
      {
        id: 'tm_cust_001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Anytown, ST 12345',
        vehicles: [],
      },
      {
        id: 'tm_cust_002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        phone: '(555) 987-6543',
        address: '456 Oak Ave, Anytown, ST 12345',
        vehicles: [],
      },
    ];
  }

  private async fetchTransactionsFromTireMaster(fromDate?: Date): Promise<TireMasterTransaction[]> {
    // Simulate API call with mock data
    await this.simulateApiCall();

    const mockTransactions: TireMasterTransaction[] = [
      {
        id: 'tm_trans_001',
        customerId: 'tm_cust_001',
        date: new Date('2024-11-15'),
        totalAmount: 450.00,
        taxAmount: 36.00,
        items: [
          {
            id: 'item_1',
            description: 'Tire Installation',
            quantity: 4,
            unitPrice: 75.00,
            totalPrice: 300.00,
            category: 'service',
          },
        ],
        paymentMethod: 'Credit Card',
        invoiceNumber: 'INV-2024-001234',
      },
    ];

    // Filter by date if provided
    if (fromDate) {
      return mockTransactions.filter(t => t.date >= fromDate);
    }

    return mockTransactions;
  }

  private async simulateApiCall(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  }

  private determinePrimaryCategory(items: TireMasterItem[]): string {
    const categoryTotals = new Map<string, number>();

    items.forEach(item => {
      const current = categoryTotals.get(item.category) || 0;
      categoryTotals.set(item.category, current + item.totalPrice);
    });

    let primaryCategory = 'service';
    let maxAmount = 0;

    categoryTotals.forEach((amount, category) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        primaryCategory = category;
      }
    });

    return primaryCategory;
  }
}