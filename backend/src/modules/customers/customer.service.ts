import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomerRepository, CustomerEntity } from './customer.repository';
import { CreateCustomerInput, UpdateCustomerInput } from '../../graphql/inputs/customer.input';
import { PaginationOptions, PaginationResult } from '../../common/base.repository';
import { CustomerStatus, AccountType, CommunicationMethod } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async createCustomer(input: CreateCustomerInput): Promise<CustomerEntity> {
    // Check for duplicate email if provided
    if (input.email) {
      const existingCustomer = await this.customerRepository.findByEmail(input.email);
      if (existingCustomer) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    // Check for duplicate phone if provided
    if (input.phone) {
      const existingCustomer = await this.customerRepository.findByPhone(input.phone);
      if (existingCustomer) {
        throw new BadRequestException('Customer with this phone number already exists');
      }
    }

    const { communicationPreference, ...rest } = input;
    let preferredCommunication: CommunicationMethod = CommunicationMethod.EMAIL;
    
    if (communicationPreference && Object.values(CommunicationMethod).includes(communicationPreference as CommunicationMethod)) {
      preferredCommunication = communicationPreference as CommunicationMethod;
    }

    return this.customerRepository.create({
      ...rest,
      phone: input.phone || '',
      status: CustomerStatus.ACTIVE,
      accountType: AccountType.INDIVIDUAL,
      preferredCommunication,
    });
  }

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<CustomerEntity> {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    // Check for duplicate email if updating email
    if (input.email && input.email !== existingCustomer.email) {
      const duplicateCustomer = await this.customerRepository.findByEmail(input.email);
      if (duplicateCustomer && duplicateCustomer.id !== id) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    // Check for duplicate phone if updating phone
    if (input.phone && input.phone !== existingCustomer.phone) {
      const duplicateCustomer = await this.customerRepository.findByPhone(input.phone);
      if (duplicateCustomer && duplicateCustomer.id !== id) {
        throw new BadRequestException('Customer with this phone number already exists');
      }
    }

    const { isActive, communicationPreference, ...updateData } = input;
    const data: any = { ...updateData };
    
    if (isActive !== undefined) {
      data.status = isActive ? CustomerStatus.ACTIVE : CustomerStatus.INACTIVE;
    }

    if (communicationPreference && Object.values(CommunicationMethod).includes(communicationPreference as CommunicationMethod)) {
      data.preferredCommunication = communicationPreference as CommunicationMethod;
    }

    return this.customerRepository.update(id, data);
  }

  async getCustomer(id: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async getCustomers(paginationOptions?: PaginationOptions): Promise<PaginationResult<CustomerEntity>> {
    return this.customerRepository.findWithPagination(
      paginationOptions || {},
      {
        where: { status: CustomerStatus.ACTIVE },
        orderBy: { lastName: 'asc' },
      },
    );
  }

  async searchCustomers(searchTerm: string): Promise<CustomerEntity[]> {
    return this.customerRepository.searchCustomers(searchTerm);
  }

  async deactivateCustomer(id: string): Promise<CustomerEntity> {
    const customer = await this.getCustomer(id);
    return this.customerRepository.update(id, { status: CustomerStatus.INACTIVE });
  }

  async activateCustomer(id: string): Promise<CustomerEntity> {
    const customer = await this.getCustomer(id);
    return this.customerRepository.update(id, { status: CustomerStatus.ACTIVE });
  }

  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    return this.customerRepository.getCustomerStats();
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customer = await this.getCustomer(id);
    await this.customerRepository.delete(id);
    return true;
  }
}