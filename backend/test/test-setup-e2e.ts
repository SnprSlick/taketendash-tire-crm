import 'reflect-metadata';

beforeAll(async () => {
  // E2E test setup
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/tire_crm_test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-e2e';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
});

afterAll(async () => {
  // Clean up after all tests
});