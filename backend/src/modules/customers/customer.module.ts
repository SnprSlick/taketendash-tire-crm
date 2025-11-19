import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { CustomerResolver } from '../../graphql/resolvers/customer.resolver';

@Module({
  providers: [CustomerService, CustomerRepository, CustomerResolver],
  exports: [CustomerService, CustomerRepository],
})
export class CustomerModule {}