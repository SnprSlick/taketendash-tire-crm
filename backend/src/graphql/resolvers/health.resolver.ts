import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  @Query(() => String, { description: 'Health check endpoint' })
  health(): string {
    return 'TakeTenDash Tire CRM API is running!';
  }

  @Query(() => String, { description: 'API version' })
  version(): string {
    return '1.0.0';
  }
}