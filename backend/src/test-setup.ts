import 'reflect-metadata';

// Global test setup
beforeAll(async () => {
  // Setup test environment variables
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/tire_crm_test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
});