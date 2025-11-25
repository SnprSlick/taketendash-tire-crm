import { Injectable } from '@nestjs/common';
import { BaseRepository, BaseEntity } from '../../common/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerStatus, CommunicationMethod, AccountType } from '@prisma/client';

export interface CustomerEntity extends BaseEntity {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  accountType: AccountType;
  status: CustomerStatus;
  preferredCommunication: CommunicationMethod;
}

@Injectable()
export class CustomerRepository extends BaseRepository<CustomerEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'customer');
  }

  async findByEmail(email: string): Promise<CustomerEntity | null> {
    return this.findOne({
      where: { email },
    });
  }

  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    return this.findOne({
      where: { phone },
    });
  }

  async searchCustomers(searchTerm: string): Promise<CustomerEntity[]> {
    return this.search(searchTerm, ['firstName', 'lastName', 'email', 'phone']);
  }

  async findActiveCustomers(): Promise<CustomerEntity[]> {
    return this.findMany({
      where: { status: CustomerStatus.ACTIVE },
      orderBy: { lastName: 'asc' },
    });
  }

  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [total, active] = await Promise.all([
      this.count(),
      this.count({ status: CustomerStatus.ACTIVE }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }
}