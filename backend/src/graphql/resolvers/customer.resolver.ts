import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, ValidationPipe } from '@nestjs/common';
import { Customer } from '../types/customer.type';
import { CreateCustomerInput, UpdateCustomerInput } from '../inputs/customer.input';
import { PaginationInput } from '../inputs/pagination.input';
import { CustomerService } from '../../modules/customers/customer.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Resolver(() => Customer)
@UseGuards(JwtAuthGuard)
export class CustomerResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Mutation(() => Customer)
  async createCustomer(
    @Args('input', new ValidationPipe()) input: CreateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.createCustomer(input);
  }

  @Mutation(() => Customer)
  async updateCustomer(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', new ValidationPipe()) input: UpdateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.updateCustomer(id, input);
  }

  @Query(() => Customer)
  async customer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.getCustomer(id);
  }

  @Query(() => [Customer])
  async customers(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<Customer[]> {
    const result = await this.customerService.getCustomers(pagination);
    return result.data;
  }

  @Query(() => [Customer])
  async searchCustomers(
    @Args('searchTerm') searchTerm: string,
  ): Promise<Customer[]> {
    return this.customerService.searchCustomers(searchTerm);
  }

  @Mutation(() => Customer)
  async deactivateCustomer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.deactivateCustomer(id);
  }

  @Mutation(() => Customer)
  async activateCustomer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.activateCustomer(id);
  }

  @Mutation(() => Boolean)
  async deleteCustomer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.customerService.deleteCustomer(id);
  }
}