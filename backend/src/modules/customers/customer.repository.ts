import { Injectable } from '@nestjs/common';
import { BaseRepository, BaseEntity } from '../../common/base.repository';
import { PrismaService } from '../../prisma/prisma.service';

export interface CustomerEntity extends BaseEntity {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  isActive: boolean;
  tirePreferenceBrand?: string;
  communicationPreference?: string;
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
      where: { isActive: true },
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
      this.count({ isActive: true }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }
}