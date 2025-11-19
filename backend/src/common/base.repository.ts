import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FindOptions {
  where?: any;
  include?: any;
  select?: any;
  orderBy?: any;
  skip?: number;
  take?: number;
}

@Injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  async findById(id: string, options?: Omit<FindOptions, 'where'>): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...options,
    });
  }

  async findOne(options: FindOptions): Promise<T | null> {
    return this.model.findFirst(options);
  }

  async findMany(options?: FindOptions): Promise<T[]> {
    return this.model.findMany(options);
  }

  async findWithPagination(
    paginationOptions: PaginationOptions,
    findOptions?: Omit<FindOptions, 'skip' | 'take'>,
  ): Promise<PaginationResult<T>> {
    const page = paginationOptions.page || 1;
    const limit = Math.min(paginationOptions.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    const orderBy = paginationOptions.orderBy
      ? {
          [paginationOptions.orderBy]: paginationOptions.orderDirection || 'asc',
        }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.model.findMany({
        ...findOptions,
        skip,
        take: limit,
        orderBy,
      }),
      this.model.count({
        where: findOptions?.where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return this.model.create({
      data,
    });
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({
      where: { id },
    });
  }

  async deleteMany(where: any): Promise<{ count: number }> {
    return this.model.deleteMany({ where });
  }

  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }

  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  async upsert(
    where: any,
    create: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    update: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<T> {
    return this.model.upsert({
      where,
      create,
      update,
    });
  }

  async findByIds(ids: string[], options?: Omit<FindOptions, 'where'>): Promise<T[]> {
    return this.model.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      ...options,
    });
  }

  async search(
    searchTerm: string,
    searchFields: string[],
    options?: FindOptions,
  ): Promise<T[]> {
    const where = {
      OR: searchFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
      ...options?.where,
    };

    return this.model.findMany({
      ...options,
      where,
    });
  }

  // Transaction support
  async transaction<R>(
    operation: (prisma: PrismaService) => Promise<R>,
  ): Promise<R> {
    return this.prisma.transaction(operation);
  }
}

// Utility decorators and types for common repository patterns
export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Date | null;
}

export abstract class SoftDeleteRepository<T extends SoftDeleteEntity> extends BaseRepository<T> {
  async findMany(options?: FindOptions): Promise<T[]> {
    return super.findMany({
      ...options,
      where: {
        deletedAt: null,
        ...options?.where,
      },
    });
  }

  async softDelete(id: string): Promise<T> {
    return this.update(id, { deletedAt: new Date() } as any);
  }

  async restore(id: string): Promise<T> {
    return this.update(id, { deletedAt: null } as any);
  }

  async findDeleted(options?: FindOptions): Promise<T[]> {
    return super.findMany({
      ...options,
      where: {
        deletedAt: { not: null },
        ...options?.where,
      },
    });
  }
}